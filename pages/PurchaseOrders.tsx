import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { PurchaseOrder, PurchaseOrderItem, Language, Contact, Product } from '../types';
import { translations, formatCurrency, formatDate } from '../i18n';
import { Card, Modal, Button, Select, Input } from '../components/ui';
import { ICONS } from '../constants';

interface PurchaseOrdersProps {
  lang: Language;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ lang }) => {
  const t = translations[lang];
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPOItems] = useState<PurchaseOrderItem[]>([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Data for forms
  const [distributors, setDistributors] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Create Form State
  const [newPODistributor, setNewPODistributor] = useState<string>('');
  const [newPOItems, setNewPOItems] = useState<{product: Product, quantity: number}[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [expectedDate, setExpectedDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPOs(dbService.getPurchaseOrders());
    setDistributors(dbService.getContacts().filter(c => c.type === 'distributor'));
    setProducts(dbService.getProducts());
  };

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setPOItems(dbService.getPurchaseOrderItems(po.id));
    setIsViewModalOpen(true);
  };

  const handleEditPO = (e: React.MouseEvent, po: PurchaseOrder) => {
    e.stopPropagation();
    setSelectedPO(po);
    setExpectedDate(po.expected_arrival_date || '');
    setIsEditModalOpen(true);
  };

  // Add Item Logic
  const handleAddItem = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find(p => p.id.toString() === selectedProductToAdd);
    if (!prod) return;

    setNewPOItems(prev => {
      const exists = prev.find(i => i.product.id === prod.id);
      if (exists) {
        return prev.map(i => i.product.id === prod.id ? { ...i, quantity: i.quantity + quantityToAdd } : i);
      }
      return [...prev, { product: prod, quantity: quantityToAdd }];
    });
    setQuantityToAdd(1);
    setSelectedProductToAdd('');
  };

  const handleRemoveItem = (prodId: number) => {
    setNewPOItems(prev => prev.filter(i => i.product.id !== prodId));
  };

  const handleCreatePO = () => {
    if (newPOItems.length === 0 || !newPODistributor) return;

    try {
      const poData: PurchaseOrder = {
        id: 0,
        distributor_id: parseInt(newPODistributor),
        status: 'ordered',
        expected_arrival_date: expectedDate,
        created_at: new Date().toISOString()
      };

      const items: PurchaseOrderItem[] = newPOItems.map(i => ({
        id: 0,
        po_id: 0,
        product_id: i.product.id,
        quantity: i.quantity,
      }));

      dbService.createPurchaseOrder(poData, items);
      setIsCreateModalOpen(false);
      setNewPOItems([]);
      setNewPODistributor('');
      setExpectedDate('');
      loadData();
    } catch (e) {
      alert(t.error_order);
    }
  };

  const handleUpdatePO = () => {
    if (!selectedPO) return;
    dbService.updatePurchaseOrder({ ...selectedPO, expected_arrival_date: expectedDate });
    setIsEditModalOpen(false);
    loadData();
  };

  const handleReceivePO = () => {
    if (!selectedPO) return;
    if (confirm(t.reset_db_confirm)) {
        dbService.receivePurchaseOrder(selectedPO.id);
        alert(t.po_received_msg);
        setIsEditModalOpen(false);
        setIsViewModalOpen(false);
        loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.purchase_orders}</h2>
        <Button onClick={() => {
            setNewPODistributor('');
            setNewPOItems([]);
            setExpectedDate('');
            setIsCreateModalOpen(true);
        }}>
            {ICONS.Add} {t.create_po}
        </Button>
      </div>

      <Card className="overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-800">
            <thead className="bg-gray-50 text-black uppercase font-bold text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">{t.order_id}</th>
                <th className="px-6 py-4">{t.date}</th>
                <th className="px-6 py-4">{t.distributor}</th>
                <th className="px-6 py-4">{t.status}</th>
                <th className="px-6 py-4">{t.expected_arrival}</th>
                <th className="px-6 py-4">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pos.map(po => {
                 const distributorName = distributors.find(d => d.id === po.distributor_id)?.name || t.uncategorized;
                 return (
                    <tr 
                      key={po.id} 
                      onClick={() => handleViewPO(po)} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold">#{po.id}</td>
                      <td className="px-6 py-4 font-mono text-xs">{formatDate(po.created_at, lang)}</td>
                      <td className="px-6 py-4">{distributorName}</td>
                      <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${
                              po.status === 'received' ? 'bg-green-100 text-green-700' : 
                              po.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                              {t[`status_${po.status}` as keyof typeof t]}
                          </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{formatDate(po.expected_arrival_date, lang)}</td>
                      <td className="px-6 py-4">
                          {po.status !== 'received' && (
                              <button onClick={(e) => handleEditPO(e, po)} className="text-gray-500 hover:text-black p-2">
                                  {ICONS.Edit}
                              </button>
                          )}
                      </td>
                    </tr>
                 );
              })}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">{t.no_data}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      <Modal 
        isOpen={isViewModalOpen} 
        onClose={() => setIsViewModalOpen(false)} 
        title={`${t.purchase_orders} #${selectedPO?.id}`}
      >
        {selectedPO && (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-gray-500 border-b border-gray-100 pb-4">
              <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold">{t.date}</span>
                  <span>{formatDate(selectedPO.created_at, lang)}</span>
              </div>
              <div className="flex flex-col text-right">
                 <span className="text-xs uppercase font-bold">{t.status}</span>
                 <span className="font-bold text-black uppercase">{t[`status_${selectedPO.status}` as keyof typeof t]}</span>
              </div>
            </div>
            
            {selectedPO.expected_arrival_date && (
                <div className="bg-gray-50 p-3 rounded text-xs font-mono border border-gray-200">
                    <span className="font-bold text-gray-500">{t.expected_arrival}: </span>
                    {formatDate(selectedPO.expected_arrival_date, lang)}
                </div>
            )}

            <div className="space-y-3">
              {poItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-black">{item.product_name || `${t.product_id_fallback}${item.product_id}`}</p>
                  </div>
                  <span className="font-mono">{t.qty}: {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title={t.create_po}
      >
        <div className="space-y-4">
          <Select 
            label={t.distributor}
            value={newPODistributor}
            onChange={(e) => setNewPODistributor(e.target.value)}
            options={[
              { label: t.distributor_required, value: '' },
              ...distributors.map(c => ({ label: c.name, value: c.id.toString() }))
            ]}
          />
          
          <Input 
             type="date"
             label={t.expected_arrival}
             value={expectedDate}
             onChange={e => setExpectedDate(e.target.value)}
          />
          
          <div className="p-4 border border-gray-100 bg-gray-50">
            <h4 className="text-xs font-bold uppercase mb-3">{t.add_item}</h4>
            <div className="flex gap-2 items-end mb-2">
              <div className="flex-[3]">
                <Select 
                  label={t.select_product}
                  value={selectedProductToAdd}
                  onChange={e => setSelectedProductToAdd(e.target.value)}
                  options={[
                    { label: t.select_product, value: '' },
                    ...products.map(p => ({ label: p.name, value: p.id.toString() }))
                  ]}
                />
              </div>
              <div className="flex-[2]">
                <Input 
                  label={t.qty}
                  type="number" 
                  value={quantityToAdd} 
                  onChange={e => setQuantityToAdd(parseInt(e.target.value))} 
                />
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProductToAdd}>{ICONS.Add}</Button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 border-t border-b border-gray-100 py-2">
             {newPOItems.map(item => (
               <div key={item.product.id} className="flex justify-between items-center text-sm">
                 <span>{item.product.name}</span>
                 <div className="flex items-center gap-2">
                   <span className="font-mono font-bold">x {item.quantity}</span>
                   <button onClick={() => handleRemoveItem(item.product.id)} className="text-gray-400 hover:text-black">
                     {ICONS.Delete}
                   </button>
                 </div>
               </div>
             ))}
             {newPOItems.length === 0 && <p className="text-center text-gray-400 text-xs italic">{t.cart_empty}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-4">
             <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>{t.cancel}</Button>
             <Button onClick={handleCreatePO} disabled={newPOItems.length === 0 || !newPODistributor}>{t.save}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit/Update Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`${t.edit} #${selectedPO?.id}`}
      >
        <div className="space-y-6">
            <Input 
                type="date"
                label={t.expected_arrival}
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
            />
             
            {selectedPO && selectedPO.status !== 'received' && (
                <div className="border-t border-gray-100 pt-4">
                    <Button variant="primary" className="w-full mb-2" onClick={handleUpdatePO}>{t.save}</Button>
                    <Button variant="secondary" className="w-full border-green-500 text-green-700 bg-green-50 hover:bg-green-100" onClick={handleReceivePO}>
                        {ICONS.Check} {t.receive_goods}
                    </Button>
                </div>
            )}
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseOrders;