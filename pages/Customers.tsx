import React, { useEffect, useState } from 'react';
import { dbService } from '../services/db';
import { Customer, Language } from '../types';
import { translations } from '../i18n';
import { Card, Button, Input, Modal } from '../components/ui';
import { ICONS } from '../constants';

interface CustomersProps {
  lang: Language;
}

const Customers: React.FC<CustomersProps> = ({ lang }) => {
  const t = translations[lang];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  useEffect(() => {
    setCustomers(dbService.getCustomers());
  }, []);

  const handleSave = () => {
    if (formData.name) {
      dbService.addCustomer(formData as Customer);
      setCustomers(dbService.getCustomers());
      setIsModalOpen(false);
      setFormData({});
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">{t.customers}</h2>
        <Button onClick={() => setIsModalOpen(true)}>{ICONS.Add} {t.add_customer}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(c => (
          <Card key={c.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold">
                {c.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{c.name}</h3>
                <p className="text-xs text-gray-500">{t.id}: {c.id}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2">📞 {c.phone}</p>
              <p className="flex items-center gap-2">✉️ {c.email}</p>
              <p className="flex items-center gap-2">📍 {c.address}</p>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t.add_customer}>
        <div className="space-y-4">
          <Input label={t.name} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          <Input label={t.phone} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <Input label={t.email} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
          <Input label={t.address} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
          <div className="flex justify-end gap-3 mt-4">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
             <Button onClick={handleSave}>{t.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;