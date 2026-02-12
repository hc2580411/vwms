
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Order, OrderItem, Language, Contact, Product, User, CurrencyConfig } from '../types';
import { translations, formatCurrency, formatDate } from '../i18n';
import { Card, Modal, Button, Select, Input } from '../components/ui';
import { ICONS } from '../constants';

interface OrdersProps {
  lang: Language;
  currentUser?: User;
  currency: CurrencyConfig;
}

interface NewOrderItem {
    product: Product;
    quantity: number;
    unitPrice: number; // Stored as AED
}

const Orders: React.FC<OrdersProps> = ({ lang, currentUser, currency }) => {
  const t = translations[lang];
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [salesReps, setSalesReps] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadOrders();
    const allContacts = dbService.getContacts();
    setContacts(allContacts.filter(c => c.type === 'customer'));
    setSalesReps(allContacts.filter(c => c.type === 'sales_rep'));
    setProducts(dbService.getProducts());
  }, []);

  useEffect(() => {
    if (!searchTerm) {
        setFilteredOrders(orders);
        return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredOrders(orders.filter(o => 
        (o.order_number && o.order_number.toLowerCase().includes(lower)) || 
        o.id.toString().includes(lower) || 
        (o.sales_rep_name && o.sales_rep_name.toLowerCase().includes(lower)) ||
        (o.contact_id && o.contact_id.toString().includes(lower))
    ));
  }, [searchTerm, orders]);

  const loadOrders = () => {
    const all = dbService.getOrders();
    setOrders(all);
    setFilteredOrders(all);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderItems(dbService.getOrderItems(order.id));
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.orders}</h2>
        <Button onClick={() => setIsCreateModalOpen(true)}>{ICONS.Add} {t.create_order}</Button>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
            {ICONS.Search}
            <input 
                type="text" 
                placeholder={t.search_orders} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-sm outline-none bg-transparent font-mono"
            />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-800">
            <thead className="bg-gray-50 text-black uppercase font-bold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">{t.order_number}</th>
                <th className="px-6 py-4">{t.date}</th>
                <th className="px-6 py-4">{t.contact}</th>
                <th className="px-6 py-4">{t.sales_rep}</th>
                <th className="px-6 py-4 text-right">{t.total}</th>
                <th className="px-6 py-4 text-right">{t.deposit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map(order => (
                <tr 
                  key={order.id} 
                  onClick={() => handleViewOrder(order)} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-bold text-blue-800 font-mono">{order.order_number || '-'}</td>
                  <td className="px-6 py-4 font-mono text-xs">{formatDate(order.created_at, lang)}</td>
                  <td className="px-6 py-4">{order.contact_id ? `${t.contact_prefix}${order.contact_id}` : t.walk_in}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-600">{order.sales_rep_name || '-'}</td>
                  <td className="px-6 py-4 text-right font-bold">{formatCurrency(order.total_amount * currency.rate, lang, currency.code)}</td>
                  <td className="px-6 py-4 text-right text-gray-500 font-mono">{order.deposit ? formatCurrency(order.deposit * currency.rate, lang, currency.code) : '-'}</td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">{t.no_data}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <OrdersModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          t={t}
          lang={lang}
          contacts={contacts}
          salesReps={salesReps}
          products={products}
          currency={currency}
          onSave={(orderData: any, items: any) => {
             dbService.createOrder(orderData, items);
             setIsCreateModalOpen(false);
             loadOrders();
          }}
      />
       
      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`${t.order_number}: ${selectedOrder?.order_number}`}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-gray-500 border-b border-gray-100 pb-4">
              <div className="flex flex-col">
                  <span>{formatDate(selectedOrder.created_at, lang)}</span>
                  <span className="text-xs text-gray-400">System ID: #{selectedOrder.id}</span>
              </div>
              <div className="text-right">
                  <span className="font-bold text-black uppercase block">{t[selectedOrder.payment_method as keyof typeof t] || selectedOrder.payment_method}</span>
                  <span className="text-xs text-gray-400">{t.sales_rep}: {selectedOrder.sales_rep_name}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {orderItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-black">{item.product_name || `${t.product_id_fallback}${item.product_id}`}</p>
                    <p className="text-xs text-gray-500">{t.qty}: {item.quantity} {item.unit} x {formatCurrency(item.price_at_sale * currency.rate, lang, currency.code)}</p>
                  </div>
                  <span className="font-mono">{formatCurrency((item.price_at_sale * item.quantity) * currency.rate, lang, currency.code)}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between items-center font-bold text-lg text-black">
                    <span>{t.total}</span>
                    <span>{formatCurrency(selectedOrder.total_amount * currency.rate, lang, currency.code)}</span>
                </div>
                {selectedOrder.deposit && selectedOrder.deposit > 0 && (
                    <>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{t.deposit}</span>
                        <span>- {formatCurrency(selectedOrder.deposit * currency.rate, lang, currency.code)}</span>
                    </div>
                     <div className="flex justify-between items-center font-bold text-red-500 border-t border-dashed border-gray-200 pt-2">
                        <span>{t.balance_due}</span>
                        <span>{formatCurrency((selectedOrder.total_amount - selectedOrder.deposit) * currency.rate, lang, currency.code)}</span>
                    </div>
                    </>
                )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

// Extracted Modal to handle logic cleaner
const OrdersModal = ({ isOpen, onClose, t, lang, contacts, salesReps, products, onSave, currency }: any) => {
    const [newOrderNumber, setNewOrderNumber] = useState('');
    const [newOrderContact, setNewOrderContact] = useState<string>('');
    const [selectedSalesRep, setSelectedSalesRep] = useState<string>('');
    const [newOrderItems, setNewOrderItems] = useState<NewOrderItem[]>([]);
    
    // Item Inputs
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
    const [quantityToAdd, setQuantityToAdd] = useState<string>('1');
    const [priceToAdd, setPriceToAdd] = useState<number>(0); // Display Price (Converted)
    const [selectedProductUnit, setSelectedProductUnit] = useState<string>('');

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [deposit, setDeposit] = useState<string>(''); // Display Deposit (Converted)

    // Update default price when product changes
    useEffect(() => {
        if (!selectedProductToAdd) {
            setPriceToAdd(0);
            setSelectedProductUnit('');
            return;
        }
        const prod = products.find((p: Product) => p.id.toString() === selectedProductToAdd);
        if (prod) {
            // Initial load of price is converted to display currency
            setPriceToAdd(parseFloat((prod.price * currency.rate).toFixed(2)));
            setSelectedProductUnit(prod.unit);
        }
    }, [selectedProductToAdd, products, currency.rate]);

    const handleAddItem = () => {
        if (!selectedProductToAdd) return;
        const prod = products.find((p: Product) => p.id.toString() === selectedProductToAdd);
        if (!prod) return;
        
        const qty = parseFloat(quantityToAdd);
        if (isNaN(qty) || qty <= 0) return;
    
        // Convert display price back to AED for storage
        const unitPriceAED = priceToAdd / currency.rate;

        setNewOrderItems((prev) => {
          // We use unitPriceAED for storage/logic
          const existsIndex = prev.findIndex((i) => i.product.id === prod.id && Math.abs(i.unitPrice - unitPriceAED) < 0.01);
          if (existsIndex >= 0) {
              const updated = [...prev];
              updated[existsIndex].quantity += qty;
              return updated;
          }
          return [...prev, { product: prod, quantity: qty, unitPrice: unitPriceAED }];
        });
        
        setQuantityToAdd('1');
        setSelectedProductToAdd('');
        setPriceToAdd(0);
    };

    const handleRemoveItem = (index: number) => {
        setNewOrderItems((prev) => prev.filter((_, i) => i !== index));
    };

    // Total in AED
    const calculateTotalAED = () => {
        return newOrderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    };

    const totalAED = calculateTotalAED();
    
    // Convert Deposit input (Display) to AED (Storage)
    const depositAmountDisplay = parseFloat(deposit) || 0;
    const depositAmountAED = depositAmountDisplay / currency.rate;

    const balanceAED = Math.max(0, totalAED - depositAmountAED);

    const handleCreate = () => {
        if(!newOrderNumber) {
            alert(t.enter_order_no);
            return;
        }

        const orderData = {
            id: 0,
            order_number: newOrderNumber,
            contact_id: newOrderContact ? parseInt(newOrderContact) : null,
            sales_rep_id: selectedSalesRep ? parseInt(selectedSalesRep) : null,
            total_amount: totalAED, // Store in AED
            deposit: depositAmountAED, // Store in AED
            payment_method: paymentMethod,
            created_at: new Date().toISOString()
        };
        
        onSave(orderData, newOrderItems.map((i) => ({
            id: 0,
            order_id: 0,
            product_id: i.product.id,
            quantity: i.quantity,
            price_at_sale: i.unitPrice // Store in AED
        })));
        
        setNewOrderItems([]);
        setNewOrderContact('');
        setNewOrderNumber('');
        setSelectedSalesRep('');
        setDeposit('');
    }

    return (
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={t.new_order}
      >
        <div className="space-y-4">
          <Input 
             label={t.enter_order_no}
             value={newOrderNumber}
             onChange={e => setNewOrderNumber(e.target.value)}
             placeholder="INV-2023-001"
             className="border-b-4 border-blue-100" // Highlight this input
          />

          <div className="grid grid-cols-2 gap-4">
              <Select 
                label={t.contact}
                value={newOrderContact}
                onChange={(e) => setNewOrderContact(e.target.value)}
                options={[
                  { label: t.walk_in, value: '' },
                  ...contacts.map((c: Contact) => ({ label: `${c.name}`, value: c.id.toString() }))
                ]}
              />
              <Select 
                label={t.select_sales_rep || 'Sales Rep'}
                value={selectedSalesRep}
                onChange={(e) => setSelectedSalesRep(e.target.value)}
                options={[
                  { label: '-', value: '' },
                  ...salesReps.map((c: Contact) => ({ label: c.name, value: c.id.toString() }))
                ]}
              />
          </div>
          
          <div className="p-4 border border-gray-100 bg-gray-50">
            <h4 className="text-xs font-bold uppercase mb-3">{t.add_item}</h4>
            <div className="flex gap-2 mb-2 items-end">
              <div className="flex-[2]">
                <Select 
                  label={t.select_product}
                  value={selectedProductToAdd}
                  onChange={e => setSelectedProductToAdd(e.target.value)}
                  options={[
                    { label: t.select_product, value: '' },
                    ...products.filter((p: Product) => p.stock > 0).map((p: Product) => ({ label: `${p.name} (${formatCurrency(p.price * currency.rate, lang, currency.code)})`, value: p.id.toString() }))
                  ]}
                />
              </div>
              <div className="flex-1">
                 <Input 
                   type="number"
                   label={`${t.unit_price} (${currency.code})`}
                   value={priceToAdd}
                   onChange={e => setPriceToAdd(parseFloat(e.target.value))}
                 />
              </div>
              <div className="w-20">
                <Input 
                  type="number" 
                  step="0.1"
                  label={`${t.qty} ${selectedProductUnit ? `(${selectedProductUnit})` : ''}`}
                  value={quantityToAdd} 
                  onChange={e => setQuantityToAdd(e.target.value)} 
                />
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProductToAdd || priceToAdd < 0}>{ICONS.Add}</Button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 border-t border-b border-gray-100 py-2">
             {newOrderItems.map((item, idx) => (
               <div key={idx} className="flex justify-between items-center text-sm">
                 <div>
                    <span className="font-medium">{item.product.name}</span>
                    {/* Display Unit Price in Selected Currency */}
                    <span className="text-xs text-gray-500 ml-2">@ {formatCurrency(item.unitPrice * currency.rate, lang, currency.code)}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="font-mono">{item.quantity} {item.product.unit} x {formatCurrency((item.unitPrice * item.quantity) * currency.rate, lang, currency.code)}</span>
                   <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-black">
                     {ICONS.Delete}
                   </button>
                 </div>
               </div>
             ))}
             {newOrderItems.length === 0 && <p className="text-center text-gray-400 text-xs italic">{t.cart_empty}</p>}
          </div>

          <div className="flex justify-between items-center font-bold text-lg">
             <span>{t.total}</span>
             <span>{formatCurrency(totalAED * currency.rate, lang, currency.code)}</span>
          </div>

           <div className="grid grid-cols-2 gap-4 items-center bg-gray-50 p-3 border border-gray-100">
               <Input 
                  label={`${t.deposit} (${t.optional}) [${currency.code}]`}
                  type="number"
                  value={deposit}
                  onChange={e => setDeposit(e.target.value)}
                  placeholder="0.00"
               />
               <div className="text-right">
                   <span className="text-xs text-gray-500 uppercase font-bold">{t.balance_due}</span>
                   <p className="text-xl font-bold text-red-500">{formatCurrency(balanceAED * currency.rate, lang, currency.code)}</p>
               </div>
           </div>

          <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.payment_method}</label>
              <div className="flex gap-2">
                {(['cash', 'card', 'transfer'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 text-xs uppercase font-bold border transition-colors ${
                      paymentMethod === method
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-black'
                    }`}
                  >
                    {t[method]}
                  </button>
                ))}
              </div>
            </div>

          <div className="flex justify-end gap-3 mt-4">
             <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
             <Button onClick={handleCreate} disabled={newOrderItems.length === 0}>{t.create_order}</Button>
          </div>
        </div>
      </Modal>
    );
}

export default Orders;
