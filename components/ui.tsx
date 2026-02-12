
import React from 'react';

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-none shadow-none ${className}`}>
    {children}
  </div>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '',
  ...props
}) => {
  const baseStyle = "px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border";
  const variants = {
    primary: "bg-black text-white border-black hover:bg-gray-800",
    secondary: "bg-white text-black border-gray-300 hover:bg-gray-50",
    danger: "bg-white text-black border-red-500 hover:bg-red-50",
    ghost: "border-transparent text-gray-600 hover:bg-gray-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  className = "",
  ...props
}) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
    <input 
      className="border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-0 outline-none transition-colors rounded-none"
      {...props}
    />
  </div>
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = '',
  ...props
}) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>}
    <select
      value={value}
      onChange={onChange}
      className={`border border-gray-300 px-3 py-2 text-sm bg-white focus:border-black focus:ring-0 outline-none rounded-none ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  maxWidth?: string; // New prop to control width
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white border border-black shadow-2xl w-full ${maxWidth} overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-lg text-black uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
        <h3 className={`text-xl font-black uppercase tracking-tight mb-2 ${isDanger ? 'text-red-600' : 'text-black'}`}>
          {title}
        </h3>
        <p className="text-gray-600 mb-8 font-medium">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={isDanger ? 'danger' : 'primary'} 
            onClick={() => { onConfirm(); onClose(); }}
            className={isDanger ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
