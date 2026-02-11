import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-none shadow-none ${className}`}>
    {children}
  </div>
);

export const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  className = '',
  disabled = false
}: { 
  children: React.ReactNode, 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost', 
  onClick?: () => void,
  className?: string,
  disabled?: boolean
}) => {
  const baseStyle = "px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border";
  const variants = {
    primary: "bg-black text-white border-black hover:bg-gray-800",
    secondary: "bg-white text-black border-gray-300 hover:bg-gray-50",
    danger: "bg-white text-black border-red-500 hover:bg-red-50",
    ghost: "border-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

export const Input = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "",
  className = ""
}: { 
  label?: string, 
  value: string | number, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  type?: string,
  placeholder?: string,
  className?: string
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      className="border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-0 outline-none transition-colors rounded-none"
    />
  </div>
);

export const Select = ({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
}) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      className="border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black focus:ring-0 outline-none rounded-none"
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
      <div className="bg-white border border-black shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-black uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};