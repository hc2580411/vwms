
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { DashboardStats, Language, CurrencyConfig } from '../types';
import { translations, formatCurrency } from '../i18n';
import { Card } from '../components/ui';
import { ICONS } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  lang: Language;
  currency: CurrencyConfig;
}

const Dashboard: React.FC<DashboardProps> = ({ lang, currency }) => {
  const t = translations[lang];
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);

  const loadData = () => {
    const s = dbService.getDashboardStats();
    setStats(s);
    setSalesData(dbService.getSalesLast7Days());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="p-8 text-center text-gray-500 font-mono">{t.loading}</div>;

  // Convert for Display
  const displayTotalSales = stats.totalSales * currency.rate;
  const displaySalesData = salesData.map(d => ({
      ...d,
      amount: d.amount * currency.rate
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.dashboard}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-gray-200">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2 text-gray-500">
              <span className="uppercase text-xs font-bold tracking-wider">{t.total_sales}</span>
              {ICONS.Orders}
            </div>
            <p className="text-3xl font-bold text-black">{formatCurrency(displayTotalSales, lang, currency.code)}</p>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2 text-gray-500">
              <span className="uppercase text-xs font-bold tracking-wider">{t.total_orders}</span>
              {ICONS.Inventory}
            </div>
            <p className="text-3xl font-bold text-black">{stats.orderCount}</p>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2 text-gray-500">
              <span className="uppercase text-xs font-bold tracking-wider">{t.low_stock}</span>
              {ICONS.Inventory}
            </div>
            <p className="text-3xl font-bold text-black">{stats.lowStockCount}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 h-full border border-gray-200">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-6 tracking-wider">{t.sales_trend}</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displaySalesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 10, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, lang, currency.code)} 
                    contentStyle={{backgroundColor: '#fff', border: '1px solid #000', borderRadius: '0px'}}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#000000" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t.recent_activity}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {stats.recentOrders.length === 0 && <p className="text-gray-400 text-xs text-center py-4">{t.no_data}</p>}
              {stats.recentOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-bold text-sm text-black">#{order.id}</p>
                    <p className="text-xs text-gray-400 font-mono">{new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">{formatCurrency(order.total_amount * currency.rate, lang, currency.code)}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{order.payment_method}</p>
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
