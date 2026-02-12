
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
  order_number: string; // NEW: Manual Order Number
  contact_id: number | null;
  sales_rep_id: number | null;
  sales_rep_name?: string; // Joined field from contacts
  total_amount: number; // This is the Final Total (Subtotal - Discount)
  discount?: number; // New field for tracking discount amount
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
  unit?: string; // Add unit for display
}

export type PurchaseOrderStatus = 'ordered' | 'shipped' | 'received';

export interface PurchaseOrder {
  id: number;
  distributor_id: number | null;
  shipping_ref?: string; // NEW: Container No / Tracking ID
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
  unit?: string; // Add unit for display
}

// New Interface for Audit Trail
export interface InventoryLog {
  id: number;
  product_id: number;
  type: 'sale' | 'purchase' | 'adjustment' | 'return';
  quantity: number; // Negative for sale, positive for purchase
  reference_id: number; // Order ID or PO ID
  reason?: string;
  created_at: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export type Language = 'en' | 'zh';

export type CurrencyCode = 'AED' | 'USD' | 'CNY';

export interface CurrencyConfig {
  code: CurrencyCode;
  rate: number; // Rate relative to Base Currency (AED)
}

export interface DashboardStats {
  totalSales: number;
  orderCount: number;
  lowStockCount: number;
  recentOrders: Order[];
}