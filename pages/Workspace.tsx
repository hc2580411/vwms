
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, PurchaseOrder, Language, CurrencyConfig } from '../types';
import { translations, formatCurrency, formatDate } from '../i18n';
import { Card, Button, Modal, Input } from '../components/ui';
import { ICONS } from '../constants';

interface WorkspaceProps {
  lang: Language;
  currency: CurrencyConfig;
}

const Workspace: React.FC<WorkspaceProps> = ({ lang, currency }) => {
  const t = translations[lang];
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [incomingPOs, setIncomingPOs] = useState<(PurchaseOrder & {distributor_name?: string})[]>([]);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPendingOrders(dbService.getPendingOrders());
    setIncomingPOs(dbService.getPendingPurchaseOrders());
  };

  const handleOpenPayModal = (order: Order) => {
    setSelectedOrder(order);
    const due = order.total_amount - (order.deposit || 0);
    // Suggest full payment converted to display currency
    setPaymentAmount((due * currency.rate).toFixed(2));
    setIsPayModalOpen(true);
  };

  const handleSettlePayment = () => {
    if (!selectedOrder || !paymentAmount) return;
    const amountDisplay = parseFloat(paymentAmount);
    if (isNaN(amountDisplay) || amountDisplay <= 0) return;

    // Convert back to AED
    const amountAED = amountDisplay / currency.rate;

    dbService.updateOrderDeposit(selectedOrder.id, amountAED);
    setIsPayModalOpen(false);
    loadData();
    alert(t.payment_added);
  };

  const handleReceiveGoods = (po: PurchaseOrder) => {
      if(confirm(t.po_received_msg)) { // Reuse message: "Goods received. Stock updated."
          dbService.receivePurchaseOrder(po.id);
          loadData();
      }
  };

  // Filter Logic
  const filteredPendingOrders = pendingOrders.filter(order => {
      const term = searchTerm.toLowerCase();
      return (
          (order.order_number || '').toLowerCase().includes(term) ||
          order.id.toString().includes(term) ||
          (order.sales_rep_name || '').toLowerCase().includes(term)
      );
  });

  const filteredIncomingPOs = incomingPOs.filter(po => {
      const term = searchTerm.toLowerCase();
      return (
          (po.shipping_ref || '').toLowerCase().includes(term) ||
          po.id.toString().includes(term) ||
          (po.distributor_name || '').toLowerCase().includes(term)
      );
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.workspace}</h2>
        
        {/* Search Bar */}
        <div className="w-full md:w-72 relative">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                {ICONS.Search}
             </div>
             <input 
                type="text" 
                placeholder={t.search} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-none text-sm focus:border-black outline-none bg-gray-50 focus:bg-white transition-colors"
             />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pending Sales Payments */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {t.pending_payments}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-black">{filteredPendingOrders.length}</span>
            </h3>
            
            <div className="grid gap-3">
                {filteredPendingOrders.map(order => {
                    const due = order.total_amount - (order.deposit || 0);
                    return (
                        <Card key={order.id} className="p-4 border border-gray-200 hover:border-red-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-black">{order.order_number || `Order #${order.id}`}</h4>
                                    <p className="text-xs text-gray-500">{order.contact_id ? `${t.contact_prefix}${order.contact_id}` : t.walk_in}</p>
                                    <p className="text-xs text-gray-400 font-mono">{formatDate(order.created_at, lang)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-500 text-lg">{formatCurrency(due * currency.rate, lang, currency.code)}</p>
                                    <p className="text-xs text-gray-400">{t.balance_due}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
                                <div className="text-xs text-gray-500">
                                    {t.total}: <span className="font-medium">{formatCurrency(order.total_amount * currency.rate, lang, currency.code)}</span>
                                </div>
                                <Button onClick={() => handleOpenPayModal(order)} className="text-xs py-1 h-8">
                                    {t.settle_payment}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
                {filteredPendingOrders.length === 0 && (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 border border-gray-100 rounded">
                        <p>{searchTerm ? t.no_data : t.fully_paid}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Incoming Shipments */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {t.incoming_shipments}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-black">{filteredIncomingPOs.length}</span>
            </h3>
             <div className="grid gap-3">
                {filteredIncomingPOs.map(po => (
                    <Card key={po.id} className="p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                         <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-black font-mono">{po.shipping_ref || `PO #${po.id}`}</h4>
                                <p className="text-xs text-gray-500">{po.distributor_name || '-'}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                                    po.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {t[`status_${po.status}` as keyof typeof t]}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-2">
                            <div className="text-xs">
                                <span className="text-gray-400 block">{t.expected_arrival}</span>
                                <span className="font-bold font-mono">{formatDate(po.expected_arrival_date, lang)}</span>
                            </div>
                             <Button variant="secondary" onClick={() => handleReceiveGoods(po)} className="text-xs py-1 h-8 border-green-200 text-green-700 hover:bg-green-50">
                                {ICONS.Check} {t.receive_goods}
                            </Button>
                        </div>
                    </Card>
                ))}
                 {filteredIncomingPOs.length === 0 && (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 border border-gray-100 rounded">
                        <p>{t.no_data}</p>
                    </div>
                )}
             </div>
        </div>
      </div>

      <Modal 
        isOpen={isPayModalOpen} 
        onClose={() => setIsPayModalOpen(false)} 
        title={`${t.add_payment}: ${selectedOrder?.order_number || ''}`}
      >
        <div className="space-y-4">
            <div className="bg-gray-50 p-4 border border-gray-100 rounded text-center">
                 <p className="text-xs text-gray-500 uppercase mb-1">{t.balance_due}</p>
                 <p className="text-2xl font-bold text-red-500">
                    {selectedOrder && formatCurrency((selectedOrder.total_amount - (selectedOrder.deposit || 0)) * currency.rate, lang, currency.code)}
                 </p>
            </div>
            
            <Input 
                label={`${t.amount_to_pay} (${currency.code})`}
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                autoFocus
            />

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setIsPayModalOpen(false)}>{t.cancel}</Button>
                <Button onClick={handleSettlePayment}>{t.confirm_payment}</Button>
            </div>
        </div>
      </Modal>

    </div>
  );
};

export default Workspace;
