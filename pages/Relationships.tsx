import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Contact, Language } from '../types';
import { translations } from '../i18n';
import { Card, Button, Input, Modal, Select } from '../components/ui';
import { ICONS } from '../constants';

interface RelationshipsProps {
  lang: Language;
}

const Relationships: React.FC<RelationshipsProps> = ({ lang }) => {
  const t = translations[lang];
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'customer' | 'distributor' | 'sales_rep'>('customer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Remove ID from Partial to ensure clean insert
  const [formData, setFormData] = useState<Partial<Omit<Contact, 'id'>>>({ type: 'customer' });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    // Force a fresh fetch
    const freshContacts = dbService.getContacts();
    setContacts(freshContacts);
  };

  const handleSave = () => {
    if (formData.name) {
      dbService.addContact(formData as Contact);
      // Wait a tick for DB then reload
      setTimeout(() => {
          loadContacts();
          setIsModalOpen(false);
          setFormData({ type: activeTab }); 
      }, 50);
    }
  };

  const filteredContacts = contacts.filter(c => c.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.relationships}</h2>
        <Button onClick={() => { setFormData({ type: activeTab }); setIsModalOpen(true); }}>
          {ICONS.Add} {t.add_contact}
        </Button>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('customer')}
          className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'customer' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
          {t.customer}
        </button>
        <button 
          onClick={() => setActiveTab('distributor')}
          className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'distributor' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
          {t.distributor}
        </button>
        <button 
          onClick={() => setActiveTab('sales_rep')}
          className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'sales_rep' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'}`}
        >
          {t.sales_reps || 'Sales Reps'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map(c => (
          <Card key={c.id} className="p-4 border border-gray-200 hover:border-black transition-colors">
            <div className="flex items-center gap-3 mb-3 border-b border-gray-100 pb-2">
              <div className="w-8 h-8 flex items-center justify-center bg-black text-white font-bold text-xs">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-black">{c.name}</h3>
                <p className="text-[10px] text-gray-500 uppercase">{t.id}: {c.id}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              {c.phone && <p className="flex items-center gap-2 text-xs">{ICONS.Phone} {c.phone}</p>}
              {c.email && <p className="flex items-center gap-2 text-xs">{ICONS.Mail} {c.email}</p>}
              {c.address && <p className="flex items-center gap-2 text-xs">{ICONS.Address} {c.address}</p>}
            </div>
          </Card>
        ))}
        {filteredContacts.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-400 text-sm">
            {t.no_data}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t.add_contact}>
        <div className="space-y-4">
          <Select 
            label={t.type} 
            value={formData.type || 'customer'} 
            onChange={e => setFormData({...formData, type: e.target.value as any})}
            options={[
              { label: t.customer, value: 'customer' },
              { label: t.distributor, value: 'distributor' },
              { label: t.sales_rep || 'Sales Rep', value: 'sales_rep' }
            ]}
          />
          <Input label={t.name} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          <Input label={`${t.phone} (${t.optional})`} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <Input label={`${t.email} (${t.optional})`} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
          <Input label={`${t.address} (${t.optional})`} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          <div className="flex justify-end gap-3 mt-4">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
             <Button onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Relationships;