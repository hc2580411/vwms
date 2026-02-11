import React, { useState } from 'react';
import { dbService } from '../services/db';
import { User, Language } from '../types';
import { translations } from '../i18n';
import { Card, Input, Button } from './ui';

interface LoginProps {
  onLogin: (user: User) => void;
  lang: Language;
}

const Login: React.FC<LoginProps> = ({ onLogin, lang }) => {
  const t = translations[lang];
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = dbService.login(username, password);
    if (result.user) {
      onLogin(result.user);
    } else {
      setError(result.error ? t[result.error as keyof typeof t] : t.access_denied);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if(!regUsername || !regPassword || !regName) return;
    
    const success = dbService.registerUser(regUsername, regPassword, regName);
    if (success) {
      // Auto login after register
      const result = dbService.login(regUsername, regPassword);
      if (result.user) onLogin(result.user);
    } else {
      setError(t.user_exists);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
           <img src="./logo.jpg" alt="VWMS" className="h-20 w-auto object-contain mb-4" onError={(e) => {
                e.currentTarget.style.display='none';
           }}/>
           <h1 className="text-4xl font-black tracking-tighter mb-2">VWMS</h1>
           <p className="text-gray-500 uppercase tracking-widest text-xs">{t.full_app_name}</p>
        </div>
        <Card className="p-8 border border-gray-200 shadow-xl">
          {!isRegistering ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-center mb-6">{t.login}</h2>
              
              <Input 
                label={t.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
              />
              
              <Input 
                label={t.password}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />

              {error && (
                <p className="text-red-500 text-sm text-center font-bold">{error}</p>
              )}

              <Button onClick={() => {}} className="w-full py-3 text-lg">
                {t.login_btn}
              </Button>
              
              <div className="text-center">
                 <button type="button" onClick={() => { setIsRegistering(true); setError(null); }} className="text-sm text-gray-500 hover:text-black underline">
                   {t.create_account}
                 </button>
              </div>

              <div className="mt-4 text-center text-xs text-gray-400">
                <p>Default Admin: admin / admin</p>
                <p>Default Staff: user / user</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-center mb-6">{t.register}</h2>
              
              <Input 
                label={t.name}
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full"
              />

              <Input 
                label={t.username}
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full"
              />
              
              <Input 
                label={t.password}
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full"
              />

              {error && (
                <p className="text-red-500 text-sm text-center font-bold">{error}</p>
              )}

              <Button onClick={() => {}} className="w-full py-3 text-lg">
                {t.register_btn}
              </Button>

              <div className="text-center">
                 <button type="button" onClick={() => { setIsRegistering(false); setError(null); }} className="text-sm text-gray-500 hover:text-black underline">
                   {t.login}
                 </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;