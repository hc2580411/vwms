import React from 'react';
import { dbService } from '../services/db';
import { Language } from '../types';
import { translations } from '../i18n';
import { Card, Button } from '../components/ui';
import { ICONS } from '../constants';

interface SettingsProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const Settings: React.FC<SettingsProps> = ({ lang, setLang }) => {
  const t = translations[lang];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
         <h2 className="text-3xl font-bold text-black uppercase tracking-tight">{t.settings}</h2>
      </div>

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

      <Card className="p-6 border border-gray-200">
        <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 flex items-center gap-2">
          {ICONS.Reset} {t.data_management}
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-mono">
            {t.data_management_desc}
          </p>
          <div className="flex gap-4">
            <Button variant="danger" onClick={() => {
              if (window.confirm(t.reset_db_confirm)) {
                dbService.reset();
              }
            }}>
              {t.reset_db}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;