export interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  incoming?: number; // Calculated field for stock on order
  category: string;
  unit: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  name: string;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  type: 'customer' | 'distributor' | 'sales_rep';
}

export type Customer = Contact;

export type UserRole = 'admin' | 'employee';

export interface User {
  id: number;
  username: string;
  password?: string; // Only for auth check
  role: UserRole;
  name: string;
  is_logged_in?: number; // 0 or 1
  last_active?: string;
}

export interface Order {
  id: number;
  contact_id: number | null;
  sales_rep_id: number | null;
  sales_rep_name?: string; // Joined field from contacts
  total_amount: number;
  deposit?: number; // New field
  payment_method: 'cash' | 'card' | 'transfer';
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_sale: number;
  product_name?: string;
}

export type PurchaseOrderStatus = 'ordered' | 'shipped' | 'received';

export interface PurchaseOrder {
  id: number;
  distributor_id: number | null;
  status: PurchaseOrderStatus;
  expected_arrival_date: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  product_id: number;
  quantity: number;
  product_name?: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export type Language = 'en' | 'zh';

export interface DashboardStats {
  totalSales: number;
  orderCount: number;
  lowStockCount: number;
  recentOrders: Order[];
}