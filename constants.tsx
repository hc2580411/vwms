<<<<<<< HEAD

=======
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  Settings, 
  Users,
  Menu,
  X,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  Languages,
  Database,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  ShoppingCart,
<<<<<<< HEAD
  Ship,
  Calendar,
  ClipboardList // New Icon for Workspace
=======
  Ship
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
<<<<<<< HEAD
  Workspace: <ClipboardList size={20} />,
=======
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
  Inventory: <Package size={20} />,
  Orders: <History size={20} />,
  PurchaseOrders: <Ship size={20} />,
  Relationships: <Users size={20} />,
  Distributor: <Briefcase size={20} />,
  Settings: <Settings size={20} />,
  Menu: <Menu size={24} />,
  Close: <X size={24} />,
  Add: <Plus size={16} />,
  Delete: <Trash2 size={16} />,
  Edit: <Edit2 size={16} />,
  Search: <Search size={18} />,
  Check: <Check size={18} />,
  Language: <Languages size={20} />,
  Reset: <Database size={20} />,
  Phone: <Phone size={14} />,
  Mail: <Mail size={14} />,
  Address: <MapPin size={14} />,
  POS: <ShoppingCart size={20} />,
<<<<<<< HEAD
  Calendar: <Calendar size={16} />,
=======
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
};

// Roles: 'all' means everyone, 'admin' means only admin
export const ROUTES = [
<<<<<<< HEAD
  { path: '/', name: 'overview', icon: ICONS.Dashboard, role: 'all' },
  { path: '/workspace', name: 'workspace', icon: ICONS.Workspace, role: 'all' }, // New Route
=======
  { path: '/', name: 'dashboard', icon: ICONS.Dashboard, role: 'all' },
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
  { path: '/orders', name: 'orders', icon: ICONS.Orders, role: 'all' },
  { path: '/purchase-orders', name: 'purchase_orders', icon: ICONS.PurchaseOrders, role: 'admin' },
  { path: '/inventory', name: 'inventory', icon: ICONS.Inventory, role: 'admin' },
  { path: '/relationships', name: 'relationships', icon: ICONS.Relationships, role: 'admin' },
  { path: '/settings', name: 'settings', icon: ICONS.Settings, role: 'admin' },
<<<<<<< HEAD
];
=======
];
>>>>>>> 4b13eafc19fea19f6da9cd2046a1d4a438a830f5
