
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import Relationships from './pages/Relationships';
import PurchaseOrders from './pages/PurchaseOrders';
import Login from './components/Login';
import { dbService } from './services/db';
import { Language, User, Order, OrderItem, CurrencyConfig, CurrencyCode } from './types';
import { translations } from './i18n';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [dbReady, setDbReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // Currency State
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>({ code: 'AED', rate: 1 });

  useEffect(() => {
    // Init DB
    dbService.init().then(() => {
      setDbReady(true);
      loadCurrencySettings();
    });
  }, []);

  const loadCurrencySettings = () => {
      const s = dbService.getSettings();
      setCurrencyConfig({
          code: (s['display_currency'] as CurrencyCode) || 'AED',
          rate: parseFloat(s['exchange_rate'] || '1')
      });
  };

  const updateCurrencySettings = (newConfig: CurrencyConfig) => {
      setCurrencyConfig(newConfig);
      dbService.saveSetting('display_currency', newConfig.code);
      dbService.saveSetting('exchange_rate', newConfig.rate.toString());
  };

  const handleLogout = () => {
    if (user) {
        dbService.logout(user.id);
    }
    setUser(null);
  };

  if (!dbReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-black flex-col gap-4">
        <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin"></div>
        <p className="text-xs uppercase tracking-widest">{translations[lang].initializing}</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} lang={lang} setLang={setLang} />;
  }

  return (
    <Router>
      <Layout lang={lang} setLang={setLang} user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard lang={lang} currency={currencyConfig} />} />
          <Route path="/orders" element={<Orders lang={lang} currentUser={user} currency={currencyConfig} />} />
          
          {/* Admin Only Routes */}
          {user.role === 'admin' ? (
            <>
              <Route path="/inventory" element={<Inventory lang={lang} currency={currencyConfig} />} />
              <Route path="/relationships" element={<Relationships lang={lang} />} />
              <Route path="/settings" element={<Settings lang={lang} setLang={setLang} currency={currencyConfig} onUpdateCurrency={updateCurrencySettings} />} />
              <Route path="/purchase-orders" element={<PurchaseOrders lang={lang} />} />
            </>
          ) : (
            // Redirect employees trying to access admin routes
            <Route path="*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
