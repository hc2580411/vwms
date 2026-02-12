
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { DashboardStats, Language, CurrencyConfig } from '../types';
import { translations, formatCurrency } from '../i18n';
import { Card, Button, Input } from '../components/ui';
import { ICONS } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  lang: Language;
  currency: CurrencyConfig;
}

type TimeRange = '7d' | '30d' | '6m' | '1y' | 'all' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ lang, currency }) => {
  const t = translations[lang];
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Analytics State
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [analyticsData, setAnalyticsData] = useState<{ totalSales: number, totalReceived: number, totalPending: number, totalOrders: number, salesTrend: any[] }>({
    totalSales: 0,
    totalReceived: 0,
    totalPending: 0,
    totalOrders: 0,
    salesTrend: []
  });

  // Custom Date State
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadGeneralStats = () => {
    // Loads low stock and recent activity
    const s = dbService.getDashboardStats();
    setStats(s);
  };

  const calculateDateRange = (range: TimeRange): { start: string | null, end: string | null } => {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '6m':
        start.setMonth(end.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        return { start: null, end: null };
      case 'custom':
        return {
          start: customStart ? customStart : null,
          end: customEnd ? customEnd : null
        };
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const loadAnalytics = () => {
    const { start, end } = calculateDateRange(timeRange);
    // If custom is selected but dates aren't filled, don't fetch yet or fetch all? 
    // Let's fetch valid range only.
    if (timeRange === 'custom' && (!start || !end)) return;

    const data = dbService.getAnalyticsData(start, end);
    setAnalyticsData(data);
  };

  useEffect(() => {
    loadGeneralStats();
    // Poll for general stats updates (orders coming in)
    const interval = setInterval(loadGeneralStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, customStart, customEnd]);

  if (!stats) return <div className="p-8 text-center text-gray-500 font-mono">{t.loading}</div>;

  // Convert for Display
  const displayReceived = analyticsData.totalReceived * currency.rate;
  const displayPending = analyticsData.totalPending * currency.rate;
  const displaySalesData = analyticsData.salesTrend.map(d => ({
    ...d,
    amount: d.amount * currency.rate
  }));

  const ranges: { label: string, value: TimeRange }[] = [
    { label: t.last_7_days, value: '7d' },
    { label: t.last_30_days, value: '30d' },
    { label: t.last_6_months, value: '6m' },
    { label: t.last_year, value: '1y' },
    { label: t.all_time, value: 'all' },
    { label: t.custom_range, value: 'custom' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.overview}</h2>

        {/* Time Range Selectors */}
        <div className="flex flex-wrap gap-2">
          {ranges.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-3 py-1.5 text-xs font-bold uppercase border transition-colors ${timeRange === r.value
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs */}
      {timeRange === 'custom' && (
        <div className="bg-gray-50 p-4 border border-gray-200 flex flex-col md:flex-row gap-4 items-end animate-in slide-in-from-top-2 duration-200">
          <div className="flex-1 w-full md:w-auto">
            <Input
              type="date"
              label={t.start_date}
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full md:w-auto">
            <Input
              type="date"
              label={t.end_date}
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-gray-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {ICONS.Orders}
          </div>
          <div className="flex flex-col relative z-10">
            <span className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-2">{t.total_sales} ({t.received_amount})</span>
            <p className="text-3xl font-bold text-black">{formatCurrency(displayReceived, lang, currency.code)}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-red-400">{t.outstanding_amount}:</span>
              <span className="text-xs font-mono font-medium text-red-500">{formatCurrency(displayPending, lang, currency.code)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {ICONS.Inventory}
          </div>
          <div className="flex flex-col relative z-10">
            <span className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-2">{t.total_orders}</span>
            <p className="text-3xl font-bold text-black">{analyticsData.totalOrders}</p>
            <span className="text-[10px] text-gray-400 mt-1 uppercase">{ranges.find(r => r.value === timeRange)?.label}</span>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            {ICONS.Inventory}
          </div>
          <div className="flex flex-col relative z-10">
            <span className="uppercase text-xs font-bold tracking-wider text-gray-500 mb-2">{t.low_stock}</span>
            <p className="text-3xl font-bold text-red-600">{stats.lowStockCount}</p>
            <span className="text-[10px] text-gray-400 mt-1 uppercase">{t.inventory}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 h-full border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t.sales_trend}</h3>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displaySalesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, lang, currency.code)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0px' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t.recent_activity}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
              {stats.recentOrders.length === 0 && <p className="text-gray-400 text-xs text-center py-4">{t.no_data}</p>}
              {stats.recentOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors p-2 rounded">
                  <div>
                    <p className="font-bold text-sm text-black flex items-center gap-2">
                      #{order.id}
                      {order.contact_id === null && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{t.walk_in}</span>}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">{formatCurrency(order.total_amount * currency.rate, lang, currency.code)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {t[order.payment_method as keyof typeof t] || order.payment_method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
