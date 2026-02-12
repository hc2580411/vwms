import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Product, CartItem, Language, Customer, OrderItem, Order, User } from '../types';
import { translations, formatCurrency } from '../i18n';
import { Card, Button, Input, Select, Modal } from '../components/ui';
import { ICONS } from '../constants';
import { ShoppingCart } from 'lucide-react';

interface POSProps {
  lang: Language;
  user?: User | null;
}

const POS: React.FC<POSProps> = ({ lang, user }) => {
  const t = translations[lang];
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  useEffect(() => {
    const p = dbService.getProducts();
    setProducts(p);
    setCategories(['All', ...Array.from(new Set(p.map(x => x.category || t.uncategorized)))]);
    setCustomers(dbService.getCustomers());
  }, [lang]); // Reload when lang changes to translate 'Uncategorized' if needed dynamically, though categories are data-driven usually.

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item);
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(1, item.cartQuantity + delta);
        return { ...item, cartQuantity: newQ };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toString().includes(searchTerm);
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory || (selectedCategory === t.uncategorized && !p.category);
    return matchesSearch && matchesCat;
  });

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
  };

  const confirmOrder = () => {
    try {
      const orderData: Order = {
        id: 0, // auto
        order_number: `POS-${Date.now()}`, // Auto-generated order number for POS
        contact_id: selectedCustomer ? parseInt(selectedCustomer) : null,
        sales_rep_id: user?.id || null,
        total_amount: cartTotal,
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      };
      
      const orderItems: OrderItem[] = cart.map(c => ({
        id: 0,
        order_id: 0,
        product_id: c.id,
        quantity: c.cartQuantity,
        price_at_sale: c.price
      }));

      dbService.createOrder(orderData, orderItems);
      
      setCart([]);
      setIsCheckoutOpen(false);
      alert(t.order_success);
      // Refresh products to show new stock
      setProducts(dbService.getProducts());
    } catch (e) {
      alert(t.error_order);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-100px)] lg:h-[calc(100vh-6rem)] gap-4">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                selectedCategory === cat 
                  ? 'bg-sky-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            {ICONS.Search}
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
            placeholder={t.search}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => product.stock > 0 && addToCart(product)}
              className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${product.stock <= 0 ? 'opacity-50 grayscale' : 'hover:-translate-y-1'}`}
            >
              <div>
                <h3 className="font-bold text-gray-800 line-clamp-2">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-1">#{product.id} • {product.category}</p>
              </div>
              <div className="mt-4 flex justify-between items-end">
                <span className="font-bold text-lg text-sky-600">{formatCurrency(product.price, lang)}</span>
                <span className={`text-xs px-2 py-1 rounded ${product.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                  {product.stock} {t.stock_left}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[40vh] lg:h-full">
        <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex justify-between items-center">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            {ICONS.POS} {t.cart}
          </h2>
          <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-bold">{cart.length} {t.items_suffix}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <ShoppingCart size={48} className="opacity-20" />
              <p>{t.cart_empty}</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg group">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-slate-800 line-clamp-1">{item.name}</h4>
                  <p className="text-xs text-sky-600 font-bold">{formatCurrency(item.price, lang)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white rounded-md border border-gray-200 shadow-sm">
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                    >-</button>
                    <span className="w-8 text-center text-sm font-medium">{item.cartQuantity}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 text-gray-600"
                    >+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    {ICONS.Delete}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-4">
          <div className="flex justify-between items-center text-slate-600">
            <span>{t.subtotal}</span>
            <span>{formatCurrency(cartTotal, lang)}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold text-slate-800">
            <span>{t.total}</span>
            <span>{formatCurrency(cartTotal, lang)}</span>
          </div>
          <Button 
            onClick={handleCheckout} 
            className="w-full py-3 text-lg shadow-sky-200"
            disabled={cart.length === 0}
          >
            {t.checkout}
          </Button>
        </div>
      </div>

      <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title={t.checkout}>
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-500 text-sm mb-1">{t.total}</p>
            <p className="text-3xl font-bold text-sky-600">{formatCurrency(cartTotal, lang)}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.payment_method}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'card', 'transfer'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 px-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                      paymentMethod === method
                        ? 'bg-sky-600 text-white border-sky-600 shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t[method]}
                  </button>
                ))}
              </div>
            </div>

            <Select 
              label={`${t.customer} (${t.optional})`}
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              options={[
                { label: t.walk_in_customer, value: '' },
                ...customers.map(c => ({ label: c.name, value: c.id.toString() }))
              ]}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsCheckoutOpen(false)}>{t.cancel}</Button>
            <Button className="flex-1" onClick={confirmOrder}>{t.confirm_payment}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default POS;