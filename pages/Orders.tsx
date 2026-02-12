
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
        maxWidth="max-w-2xl"
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
              {/* Subtotal + Discount display if applicable */}
              {selectedOrder.discount && selectedOrder.discount > 0 ? (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{t.subtotal || 'Subtotal'}</span>
                    {/* Reconstruct subtotal: total + discount */}
                    <span>{formatCurrency((selectedOrder.total_amount + selectedOrder.discount) * currency.rate, lang, currency.code)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-red-500">
                    <span>{t.discount || 'Discount'}</span>
                    <span>- {formatCurrency(selectedOrder.discount * currency.rate, lang, currency.code)}</span>
                  </div>
                </>
              ) : null}

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
  const [discount, setDiscount] = useState<string>(''); // Display Discount (Converted)

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

  // Total in AED (Subtotal)
  const calculateSubtotalAED = () => {
    return newOrderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const subtotalAED = calculateSubtotalAED();

  // Calculations
  const discountAmountDisplay = parseFloat(discount) || 0;
  const discountAmountAED = discountAmountDisplay / currency.rate;

  // Net Total after discount
  const finalTotalAED = Math.max(0, subtotalAED - discountAmountAED);

  const depositAmountDisplay = parseFloat(deposit) || 0;
  const depositAmountAED = depositAmountDisplay / currency.rate;

  const balanceAED = Math.max(0, finalTotalAED - depositAmountAED);

  const handleCreate = () => {
    if (!newOrderNumber) {
      alert(t.enter_order_no);
      return;
    }

    const orderData = {
      id: 0,
      order_number: newOrderNumber,
      contact_id: newOrderContact ? parseInt(newOrderContact) : null,
      sales_rep_id: selectedSalesRep ? parseInt(selectedSalesRep) : null,
      total_amount: finalTotalAED, // Store final amount after discount
      discount: discountAmountAED, // Store discount amount
      deposit: depositAmountAED,
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
    setDiscount('');
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.new_order}
      maxWidth="max-w-4xl" // Wider modal
    >
      <div className="space-y-6">

        {/* Top Section: Meta Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label={t.enter_order_no}
            value={newOrderNumber}
            onChange={e => setNewOrderNumber(e.target.value)}
            placeholder="INV-2023-001"
            className="border-b-4 border-blue-100" // Highlight this input
          />

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

        {/* Middle Section: Add Item - Improved Layout */}
        <div className="p-4 border border-gray-200 bg-gray-50 rounded">
          <h4 className="text-xs font-bold uppercase mb-3 text-gray-500">{t.add_item}</h4>
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 md:col-span-6">
              <Select
                label={t.select_product}
                value={selectedProductToAdd}
                onChange={e => setSelectedProductToAdd(e.target.value)}
                options={[
                  { label: t.select_product, value: '' },
                  ...products.filter((p: Product) => p.stock > 0).map((p: Product) => ({ label: `${p.name} (${formatCurrency(p.price * currency.rate, lang, currency.code)})`, value: p.id.toString() }))
                ]}
                className="w-full"
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <Input
                type="number"
                label={`${t.unit_price} (${currency.code})`}
                value={priceToAdd}
                onChange={e => setPriceToAdd(parseFloat(e.target.value))}
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <Input
                type="number"
                step="0.1"
                label={`${t.qty} ${selectedProductUnit ? `(${selectedProductUnit})` : ''}`}
                value={quantityToAdd}
                onChange={e => setQuantityToAdd(e.target.value)}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <Button onClick={handleAddItem} disabled={!selectedProductToAdd || priceToAdd < 0} className="w-full">{ICONS.Add}</Button>
            </div>
          </div>
        </div>

        {/* Item List */}
        <div className="min-h-[150px] max-h-[300px] overflow-y-auto border border-gray-100 rounded">
          <table className="w-full text-left text-sm">
            <thead className="bg-white sticky top-0 border-b border-gray-100 text-xs text-gray-400 font-medium">
              <tr>
                <th className="px-3 py-2 pl-4">{t.name}</th>
                <th className="px-3 py-2 text-right">{t.price}</th>
                <th className="px-3 py-2 text-right">{t.qty}</th>
                <th className="px-3 py-2 text-right">{t.subtotal}</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {newOrderItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 pl-4 font-medium">{item.product.name}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{formatCurrency(item.unitPrice * currency.rate, lang, currency.code)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{item.quantity} {item.product.unit}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency((item.unitPrice * item.quantity) * currency.rate, lang, currency.code)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => handleRemoveItem(idx)} className="text-gray-400 hover:text-red-500">
                      {ICONS.Delete}
                    </button>
                  </td>
                </tr>
              ))}
              {newOrderItems.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-300 italic">{t.cart_empty}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Totals & Payments */}
        <div className="flex flex-col md:flex-row gap-6 items-start border-t border-gray-100 pt-4">
          {/* Payment Info */}
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t.payment_method}</label>
              <div className="flex gap-2">
                {(['cash', 'card', 'transfer'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 px-3 text-xs uppercase font-bold border transition-colors rounded-sm ${paymentMethod === method
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-black'
                      }`}
                  >
                    {t[method]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t.discount} (${t.optional}) [${currency.code}]`}
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                placeholder="0.00"
                className="text-red-500"
              />
              <Input
                label={`${t.deposit} (${t.optional}) [${currency.code}]`}
                type="number"
                value={deposit}
                onChange={e => setDeposit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Totals Display */}
          <div className="w-full md:w-64 bg-gray-50 p-4 rounded border border-gray-100 space-y-3">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{t.items_subtotal || 'Subtotal'}</span>
              <span className="font-medium text-black">{formatCurrency(subtotalAED * currency.rate, lang, currency.code)}</span>
            </div>

            {discountAmountDisplay > 0 && (
              <div className="flex justify-between items-center text-xs text-red-500">
                <span>{t.discount}</span>
                <span>- {formatCurrency(discountAmountAED * currency.rate, lang, currency.code)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm border-t border-gray-200 pt-2">
              <span className="font-bold">{t.total}</span>
              <span className="font-bold text-black text-lg">{formatCurrency(finalTotalAED * currency.rate, lang, currency.code)}</span>
            </div>

            {depositAmountDisplay > 0 && (
              <>
                <div className="flex justify-between items-center text-xs text-green-600">
                  <span>{t.deposit}</span>
                  <span>- {formatCurrency(depositAmountAED * currency.rate, lang, currency.code)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-red-500 border-t border-gray-200 pt-2">
                  <span>{t.balance_due}</span>
                  <span>{formatCurrency(balanceAED * currency.rate, lang, currency.code)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
          <Button onClick={handleCreate} disabled={newOrderItems.length === 0} className="px-8">{t.create_order}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default Orders;
