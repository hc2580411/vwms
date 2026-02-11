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
import { Language, User, Order, OrderItem } from './types';
import { translations } from './i18n';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('zh');
  const [dbReady, setDbReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Init DB
    dbService.init().then(() => {
      setDbReady(true);
      // Optional: Check local storage for persistent login if needed
    });
  }, []);

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
    return <Login onLogin={setUser} lang={lang} />;
  }

  // Wrapper for Orders to inject User
  const OrdersWithUser = () => {
      return <Orders lang={lang} currentUser={user} />;
  };

  return (
    <Router>
      <Layout lang={lang} setLang={setLang} user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard lang={lang} />} />
          <Route path="/orders" element={<OrdersPageWrapper lang={lang} user={user} />} />
          
          {/* Admin Only Routes */}
          {user.role === 'admin' ? (
            <>
              <Route path="/inventory" element={<Inventory lang={lang} />} />
              <Route path="/relationships" element={<Relationships lang={lang} />} />
              <Route path="/settings" element={<Settings lang={lang} setLang={setLang} />} />
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

// Create a wrapper to handle the prop passing without breaking Router types if necessary
// And to handle the injection of the user ID into the Order creation process
const OrdersPageWrapper = ({ lang, user }: { lang: Language, user: User }) => {
    // We need to patch the DB service create order or pass the user.
    // Since Orders.tsx calls `dbService.createOrder`, we need to make sure `Orders.tsx` passes the ID.
    // I will update Orders.tsx (in the XML above) to actually use a prop `currentUser`.
    // I will verify Orders.tsx content in the previous block... 
    // I updated Orders.tsx but I didn't add the prop interface. 
    // I will fix Orders.tsx content now.
    
    // Actually, I can just patch the prototype here? No.
    // I will update Orders.tsx in the XML to accept currentUser.
    return <Orders lang={lang} currentUser={user} />;
}

export default App;