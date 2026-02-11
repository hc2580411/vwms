import React, { useState } from 'react';
import { ROUTES, ICONS } from '../constants';
import { translations } from '../i18n';
import { Language, User } from '../types';
import { NavLink } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  lang: Language;
  setLang: (lang: Language) => void;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, lang, setLang, user, onLogout }) => {
  const t = translations[lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter routes based on role
  const allowedRoutes = ROUTES.filter(route => {
    if (route.role === 'all') return true;
    if (user?.role === 'admin') return true;
    return false;
  });

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-black text-white border-r border-gray-800">
        <div className="p-6 border-b border-gray-800 flex justify-center">
          {/* LOGO REPLACEMENT */}
          <div className="flex flex-col gap-2 items-center">
            <div className="bg-white rounded p-1">
              <img src="./logo.jpg" alt="VWMS Logo" className="h-16 w-auto object-contain" onError={(e) => {
                e.currentTarget.style.display='none';
                e.currentTarget.parentElement!.innerText = 'VWMS'; // Fallback
              }}/>
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest leading-tight text-center">
              {t.full_app_name}
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-900">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t.login}:</div>
          <div className="font-bold truncate">{user?.name}</div>
          <div className="text-xs text-gray-500 uppercase">{user?.role === 'admin' ? t.admin : t.employee}</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {allowedRoutes.map((route) => (
              <li key={route.path}>
                <NavLink
                  to={route.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-white text-black font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`
                  }
                >
                  {route.icon}
                  <span className="uppercase tracking-wide">{t[route.name as keyof typeof t]}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex flex-col gap-4">
            <div className="flex justify-center gap-2">
               <button 
                 onClick={() => setLang('en')}
                 className={`text-xs font-bold uppercase px-2 py-1 ${lang === 'en' ? 'text-white bg-gray-800' : 'text-gray-600 hover:text-white'}`}
               >
                 EN
               </button>
               <span className="text-gray-700">|</span>
               <button 
                 onClick={() => setLang('zh')}
                 className={`text-xs font-bold uppercase px-2 py-1 ${lang === 'zh' ? 'text-white bg-gray-800' : 'text-gray-600 hover:text-white'}`}
               >
                 中文
               </button>
            </div>
            <button 
              onClick={onLogout}
              className="w-full text-center text-xs text-red-400 hover:text-red-300 uppercase font-bold"
            >
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-black text-white p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
             <img src="./logo.jpg" alt="VWMS" className="h-8 w-auto bg-white rounded" />
             <span className="font-black tracking-tighter">VWMS</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1">
            {mobileMenuOpen ? ICONS.Close : ICONS.Menu}
          </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-14 left-0 w-full bg-black z-10 border-b border-gray-800">
            <div className="p-4 border-b border-gray-800 bg-gray-900">
              <div className="text-white font-bold">{user?.name}</div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
            <nav className="flex flex-col p-2">
              {allowedRoutes.map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-4 border-b border-gray-800 last:border-0 ${
                      isActive ? 'text-white font-bold bg-gray-900' : 'text-gray-400'
                    }`
                  }
                >
                  {route.icon}
                  <span className="uppercase">{t[route.name as keyof typeof t]}</span>
                </NavLink>
              ))}
              <div className="flex items-center gap-4 px-4 py-4 text-gray-400 border-b border-gray-800">
                <button onClick={() => { setLang('en'); setMobileMenuOpen(false); }} className={lang === 'en' ? 'text-white font-bold' : ''}>English</button>
                <span>/</span>
                <button onClick={() => { setLang('zh'); setMobileMenuOpen(false); }} className={lang === 'zh' ? 'text-white font-bold' : ''}>中文</button>
              </div>
              <button onClick={onLogout} className="px-4 py-4 text-left text-red-400 font-bold uppercase">
                {t.logout}
              </button>
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 md:p-8 relative bg-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;