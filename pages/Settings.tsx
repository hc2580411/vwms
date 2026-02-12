
import React, { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/db';
import { Language, User, CurrencyConfig, CurrencyCode } from '../types';
import { translations } from '../i18n';
import { Card, Button, Input, Select, Modal, ConfirmationModal } from '../components/ui';
import { ICONS } from '../constants';

interface SettingsProps {
  lang: Language;
  setLang: (l: Language) => void;
  currency: CurrencyConfig;
  onUpdateCurrency: (c: CurrencyConfig) => void;
}

const Settings: React.FC<SettingsProps> = ({ lang, setLang, currency, onUpdateCurrency }) => {
  const t = translations[lang];
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'employee' });
  
  const [systemSettings, setSystemSettings] = useState({
    taxRate: '0',
    currency: 'AED',
    lowStockThreshold: '50'
  });

  const [rateInput, setRateInput] = useState<string>(currency.rate.toString());
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(currency.code);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  
  // New state for success message
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      action: () => void;
      isDanger: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {}, isDanger: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, []);

  useEffect(() => {
      setSelectedCurrency(currency.code);
      setRateInput(currency.rate.toString());
  }, [currency]);

  const loadSettings = () => {
    const s = dbService.getSettings();
    setSystemSettings({
        taxRate: s['tax_rate'] || '0',
        currency: s['currency_symbol'] || 'AED', // Legacy handling
        lowStockThreshold: s['low_stock_threshold'] || '50'
    });
  };

  const loadUsers = () => {
    setUsers(dbService.getUsers());
  };

  const handleSaveSettings = () => {
    dbService.saveSetting('tax_rate', systemSettings.taxRate);
    dbService.saveSetting('low_stock_threshold', systemSettings.lowStockThreshold);
    
    // Currency Save Logic
    onUpdateCurrency({
        code: selectedCurrency,
        rate: parseFloat(rateInput) || 1
    });

    // Show inline success message instead of alert
    setShowSaveSuccess(true);
    setTimeout(() => {
        setShowSaveSuccess(false);
    }, 3000);
  };

  // --- Real Currency API Logic ---
  const fetchLiveRate = async (targetCurrency: CurrencyCode) => {
      if (targetCurrency === 'AED') {
          setRateInput('1');
          return;
      }

      setIsLoadingRate(true);
      try {
          // Using a reliable free API endpoint for AED base rates
          const response = await fetch('https://api.exchangerate-api.com/v4/latest/AED');
          const data = await response.json();
          const rate = data.rates[targetCurrency];
          
          if (rate) {
              setRateInput(rate.toString());
          } else {
              alert('Rate not found for this currency.');
          }
      } catch (error) {
          console.error(error);
          alert('Failed to fetch live rates. Please check your internet connection or enter manually.');
      } finally {
          setIsLoadingRate(false);
      }
  };

  const handleCurrencyChange = (code: CurrencyCode) => {
      setSelectedCurrency(code);
      // Auto-fetch when changing currency
      fetchLiveRate(code);
  };

  // User Management
  const handleAddUser = () => {
      if (!newUser.username || !newUser.password) return;
      const success = dbService.registerUser(newUser.username, newUser.password, newUser.name, newUser.role);
      if (success) {
          setIsAddUserModalOpen(false);
          setNewUser({ name: '', username: '', password: '', role: 'employee' });
          loadUsers();
      } else {
          alert(t.user_exists);
      }
  };

  const confirmDeleteUser = (id: number) => {
      setConfirmState({
          isOpen: true,
          title: t.delete_user_confirm,
          message: 'Are you sure you want to delete this user? This action cannot be undone.',
          isDanger: true,
          action: () => {
              dbService.deleteUser(id);
              loadUsers();
          }
      });
  };

  // Backup & Restore
  const handleDownloadBackup = () => {
      const data = dbService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `veik_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const confirmRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setConfirmState({
          isOpen: true,
          title: t.import_db,
          message: 'Restoring from a backup will overwrite all current data. Are you sure you want to proceed?',
          isDanger: true,
          action: () => {
              const reader = new FileReader();
              reader.onload = (event) => {
                  const content = event.target?.result as string;
                  if (dbService.importData(content)) {
                      alert(t.import_success);
                      window.location.reload();
                  } else {
                      alert(t.import_error);
                  }
              };
              reader.readAsText(file);
          }
      });
      // Reset input so it can be triggered again
      e.target.value = '';
  };

  const confirmResetDB = () => {
      setConfirmState({
          isOpen: true,
          title: t.reset_db,
          message: t.reset_db_confirm,
          isDanger: true,
          action: () => {
              dbService.reset();
          }
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
         <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.settings}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Config */}
          <Card className="p-6 border border-gray-200 h-full">
              <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                {ICONS.Settings} {t.system_config}
              </h3>
              <div className="space-y-4">
                  <Input 
                    label={t.low_stock_threshold}
                    type="number"
                    value={systemSettings.lowStockThreshold}
                    onChange={e => setSystemSettings({...systemSettings, lowStockThreshold: e.target.value})}
                  />
                  
                  {/* Currency Section */}
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded space-y-3">
                      <h4 className="text-xs font-bold uppercase text-gray-500">{t.currency_settings}</h4>
                      <Select 
                        label={t.display_currency}
                        value={selectedCurrency}
                        onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                        options={[
                            { label: 'AED (Dirham)', value: 'AED' },
                            { label: 'USD (Dollar)', value: 'USD' },
                            { label: 'CNY (RMB)', value: 'CNY' },
                        ]}
                      />
                      
                      {selectedCurrency !== 'AED' && (
                          <div className="flex items-end gap-2">
                              <div className="flex-1">
                                  <Input 
                                    label={t.exchange_rate}
                                    type="number"
                                    step="0.0001"
                                    value={rateInput}
                                    onChange={e => setRateInput(e.target.value)}
                                    placeholder="Enter rate manually..."
                                  />
                              </div>
                              <Button 
                                variant="secondary" 
                                onClick={() => fetchLiveRate(selectedCurrency)} 
                                className="text-xs min-w-[100px]"
                                disabled={isLoadingRate}
                              >
                                {isLoadingRate ? 'Loading...' : t.get_live_rate}
                              </Button>
                          </div>
                      )}
                      
                      <p className="text-[10px] text-gray-400 italic">
                          {t.base_currency_note}
                      </p>
                  </div>

                  <Input 
                    label={t.tax_rate}
                    type="number"
                    value={systemSettings.taxRate}
                    onChange={e => setSystemSettings({...systemSettings, taxRate: e.target.value})}
                  />
                  
                  <div className="pt-2 flex justify-end items-center gap-3">
                      {/* Success Hint */}
                      {showSaveSuccess && (
                          <span className="text-green-600 text-xs font-bold flex items-center gap-1 animate-pulse">
                              {ICONS.Check} {t.settings_saved}
                          </span>
                      )}
                      <Button onClick={handleSaveSettings}>{t.save}</Button>
                  </div>
              </div>
          </Card>

           {/* Backup & Restore */}
           <Card className="p-6 border border-gray-200 h-full">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
              {ICONS.Reset} {t.backup_restore}
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 font-mono leading-relaxed">
                {t.data_management_desc}
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="primary" onClick={handleDownloadBackup} className="w-full">
                    {t.download_backup}
                </Button>
                <div className="relative">
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef}
                        onChange={confirmRestoreBackup}
                        className="hidden" 
                    />
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                        {t.restore_backup}
                    </Button>
                </div>
                <div className="border-t border-gray-100 my-2 pt-2">
                     <Button variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50" onClick={confirmResetDB}>
                        {t.reset_db}
                    </Button>
                </div>
              </div>
            </div>
          </Card>
      </div>

      {/* User Management */}
      <Card className="p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                {ICONS.Relationships} {t.user_management}
            </h3>
            <Button onClick={() => setIsAddUserModalOpen(true)} className="text-xs px-2 py-1">
                {ICONS.Add} {t.add_user}
            </Button>
          </div>
          
          <div className="overflow-x-auto border border-gray-100">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase font-bold text-gray-500">
                      <tr>
                          <th className="px-4 py-3">{t.username}</th>
                          <th className="px-4 py-3">{t.name}</th>
                          <th className="px-4 py-3">{t.role}</th>
                          <th className="px-4 py-3 text-right">{t.actions}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {users.map(u => (
                          <tr key={u.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono">{u.username}</td>
                              <td className="px-4 py-3 font-bold">{u.name}</td>
                              <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${u.role === 'admin' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>
                                      {t[u.role as keyof typeof t]}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                  {u.username !== 'admin' && (
                                      <button onClick={() => confirmDeleteUser(u.id)} className="text-red-400 hover:text-red-600">
                                          {ICONS.Delete}
                                      </button>
                                  )}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </Card>

      {/* Language */}
      <Card className="p-6 border border-gray-200">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
          {ICONS.Language} {t.language}
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => setLang('en')}
            className={`flex-1 py-3 px-4 text-sm font-bold border transition-all ${
              lang === 'en' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLang('zh')}
            className={`flex-1 py-3 px-4 text-sm font-bold border transition-all ${
              lang === 'zh' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
            }`}
          >
            中文
          </button>
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title={t.add_user}>
          <div className="space-y-4">
              <Input 
                label={t.name}
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
              />
              <Input 
                label={t.username}
                value={newUser.username}
                onChange={e => setNewUser({...newUser, username: e.target.value})}
              />
              <Input 
                label={t.password}
                type="password"
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
              />
              <Select 
                label={t.role}
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
                options={[
                    { label: t.employee, value: 'employee' },
                    { label: t.admin, value: 'admin' }
                ]}
              />
              <div className="flex justify-end gap-2 mt-4">
                  <Button variant="secondary" onClick={() => setIsAddUserModalOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleAddUser}>{t.save}</Button>
              </div>
          </div>
      </Modal>

      {/* Global Confirmation Modal */}
      <ConfirmationModal 
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState({...confirmState, isOpen: false})}
          onConfirm={confirmState.action}
          title={confirmState.title}
          message={confirmState.message}
          isDanger={confirmState.isDanger}
          confirmText={t.delete || 'Confirm'}
          cancelText={t.cancel}
      />
    </div>
  );
};

export default Settings;
