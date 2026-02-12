
import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Product, Language, Category, Unit, CurrencyConfig } from '../types';
import { translations, formatCurrency } from '../i18n';
import { Card, Button, Input, Modal, Select, ConfirmationModal } from '../components/ui';
import { ICONS } from '../constants';

interface InventoryProps {
  lang: Language;
  currency: CurrencyConfig;
}

const Inventory: React.FC<InventoryProps> = ({ lang, currency }) => {
  const t = translations[lang];
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', price: 0, cost: 0, stock: 0, category: '', unit: ''
  });
  // Local state for editing prices in displayed currency
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [displayCost, setDisplayCost] = useState<number>(0);

  // Management Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

   // Confirmation Modal State
   const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });


  const loadData = () => {
    setProducts(dbService.getProducts());
    setCategories(dbService.getCategories());
    setUnits(dbService.getUnits());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
      // Convert to display currency for input
      setDisplayPrice(parseFloat((product.price * currency.rate).toFixed(2)));
      setDisplayCost(parseFloat((product.cost * currency.rate).toFixed(2)));
    } else {
      setEditingProduct(null);
      // Default to first category/unit if available
      const defaultCat = categories.length > 0 ? categories[0].name : '';
      const defaultUnit = units.length > 0 ? units[0].name : '';
      setFormData({ name: '', price: 0, cost: 0, stock: 0, category: defaultCat, unit: defaultUnit });
      setDisplayPrice(0);
      setDisplayCost(0);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) return;
    
    // Convert back to AED for storage
    const p = {
        ...formData,
        price: displayPrice / currency.rate,
        cost: displayCost / currency.rate
    } as Product;
    
    if (editingProduct) {
      dbService.updateProduct({ ...editingProduct, ...p });
    } else {
      dbService.addProduct(p);
    }
    
    setIsModalOpen(false);
    loadData();
  };

  const confirmDeleteProduct = (id: number) => {
      setConfirmState({
          isOpen: true,
          title: t.delete,
          message: 'Are you sure you want to delete this product?',
          isDanger: true,
          action: () => {
            dbService.deleteProduct(id);
            loadData();
          }
      });
  };

  // Category Management Handlers
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      dbService.addCategory(newCategoryName.trim());
      setNewCategoryName('');
      loadData();
    }
  };

  const confirmDeleteCategory = (id: number) => {
    setConfirmState({
        isOpen: true,
        title: t.delete,
        message: 'Are you sure you want to delete this category?',
        isDanger: true,
        action: () => {
            dbService.deleteCategory(id);
            loadData();
        }
    });
  };

  // Unit Management Handlers
  const handleAddUnit = () => {
    if (newUnitName.trim()) {
      dbService.addUnit(newUnitName.trim());
      setNewUnitName('');
      loadData();
    }
  };

  const confirmDeleteUnit = (id: number) => {
    setConfirmState({
        isOpen: true,
        title: t.delete,
        message: 'Are you sure you want to delete this unit?',
        isDanger: true,
        action: () => {
            dbService.deleteUnit(id);
            loadData();
        }
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.inventory}</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" onClick={() => setIsUnitModalOpen(true)} className="flex-1 md:flex-none">
            {t.manage_units}
          </Button>
          <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)} className="flex-1 md:flex-none">
            {t.manage_categories}
          </Button>
          <Button onClick={() => handleOpenModal()} className="flex-1 md:flex-none">
            {ICONS.Add} {t.add_product}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center gap-3">
          {ICONS.Search}
          <input
            type="text"
            placeholder={t.search}
            className="bg-transparent outline-none w-full text-sm font-mono"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-800">
            <thead className="bg-gray-50 text-black uppercase font-bold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">{t.name}</th>
                <th className="px-6 py-4 text-right">{t.price}</th>
                <th className="px-6 py-4 text-right">{t.stock}</th>
                <th className="px-6 py-4 text-center">{t.unit}</th>
                <th className="px-6 py-4">{t.category}</th>
                <th className="px-6 py-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold">{p.name}</td>
                  <td className="px-6 py-4 text-right">{formatCurrency(p.price * currency.rate, lang, currency.code)}</td>
                  <td className={`px-6 py-4 text-right`}>
                    <span className={`font-bold ${p.stock < 10 ? 'text-red-500' : ''}`}>{p.stock}</span>
                    {p.incoming ? <span className="text-gray-400 ml-1 text-xs">(+{p.incoming})</span> : null}
                  </td>
                  <td className="px-6 py-4 text-center text-xs uppercase font-bold text-gray-500">{p.unit}</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs border border-gray-200">{p.category}</span></td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(p)} className="p-2 hover:bg-gray-100">
                      {ICONS.Edit}
                    </button>
                    <button onClick={() => confirmDeleteProduct(p.id)} className="p-2 hover:bg-gray-100">
                      {ICONS.Delete}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">{t.no_data}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? t.edit : t.add_product}
      >
        <div className="space-y-4">
          <Input 
            label={t.name} 
            value={formData.name || ''} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select
                label={t.category}
                value={formData.category || ''}
                onChange={e => setFormData({...formData, category: e.target.value})}
                options={[
                    { label: t.select_category, value: '' },
                    ...categories.map(c => ({ label: c.name, value: c.name }))
                ]}
            />
             <Select
                label={t.unit}
                value={formData.unit || ''}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                options={[
                    { label: t.select_unit, value: '' },
                    ...units.map(u => ({ label: u.name, value: u.name }))
                ]}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input 
              label={`${t.price} (${currency.code})`} 
              type="number"
              value={displayPrice} 
              onChange={e => setDisplayPrice(parseFloat(e.target.value))} 
            />
            <Input 
              label={`${t.cost} (${currency.code})`} 
              type="number"
              value={displayCost} 
              onChange={e => setDisplayCost(parseFloat(e.target.value))} 
            />
            <Input 
              label={t.stock} 
              type="number"
              value={formData.stock || 0} 
              onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} 
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{t.save}</Button>
          </div>
        </div>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t.manage_categories}
      >
          <div className="space-y-6">
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <Input 
                        label={t.add_category}
                        placeholder={t.category_name}
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                      />
                  </div>
                  <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>{ICONS.Add}</Button>
              </div>

              <div className="border border-gray-100 max-h-60 overflow-y-auto">
                  {categories.map(cat => (
                      <div key={cat.id} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <span className="font-medium text-sm">{cat.name}</span>
                          <button onClick={() => confirmDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                              {ICONS.Delete}
                          </button>
                      </div>
                  ))}
                  {categories.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-xs">{t.no_data}</div>
                  )}
              </div>
          </div>
      </Modal>

       {/* Unit Manager Modal */}
       <Modal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        title={t.manage_units}
      >
          <div className="space-y-6">
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <Input 
                        label={t.add_unit}
                        placeholder={t.unit_name}
                        value={newUnitName}
                        onChange={e => setNewUnitName(e.target.value)}
                      />
                  </div>
                  <Button onClick={handleAddUnit} disabled={!newUnitName.trim()}>{ICONS.Add}</Button>
              </div>

              <div className="border border-gray-100 max-h-60 overflow-y-auto">
                  {units.map(u => (
                      <div key={u.id} className="flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <span className="font-medium text-sm">{u.name}</span>
                          <button onClick={() => confirmDeleteUnit(u.id)} className="text-gray-400 hover:text-red-500">
                              {ICONS.Delete}
                          </button>
                      </div>
                  ))}
                  {units.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-xs">{t.no_data}</div>
                  )}
              </div>
          </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal 
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState({...confirmState, isOpen: false})}
          onConfirm={confirmState.action}
          title={confirmState.title}
          message={confirmState.message}
          isDanger={confirmState.isDanger}
          confirmText={t.delete}
          cancelText={t.cancel}
      />
    </div>
  );
};

export default Inventory;
