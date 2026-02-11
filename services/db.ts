import { Product, Contact, Order, OrderItem, DashboardStats, User, PurchaseOrder, PurchaseOrderItem, Category, Unit } from '../types';

// Declare the global window type for sql.js
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

const DB_NAME = 'veik_wms_v7.db'; // Bump version for new schema

export class DatabaseService {
  private db: any = null;
  private SQL: any = null;
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;

    try {
      this.SQL = await window.initSqlJs({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
      });

      // Try to load from local storage
      const savedDb = localStorage.getItem(DB_NAME);
      if (savedDb) {
        const u8 = new Uint8Array(JSON.parse(savedDb));
        this.db = new this.SQL.Database(u8);
      } else {
        this.db = new this.SQL.Database();
        this.createTables();
        this.seedData();
      }
      
      this.initialized = true;
      this.save();
    } catch (err) {
      console.error("Failed to init DB", err);
      throw err;
    }
  }

  private save() {
    if (!this.db) return;
    const data = this.db.export();
    const array = Array.from(data);
    localStorage.setItem(DB_NAME, JSON.stringify(array));
  }

  reset() {
    localStorage.removeItem(DB_NAME);
    window.location.reload();
  }

  private createTables() {
    // Users Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT,
        is_logged_in INTEGER DEFAULT 0,
        last_active TEXT
      );
    `);

    // Categories Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // Units Table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // Products
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL,
        cost REAL,
        stock INTEGER,
        category TEXT,
        unit TEXT,
        created_at TEXT
      );
    `);

    // Contacts
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        type TEXT DEFAULT 'customer'
      );
    `);

    // Sales Orders (Added deposit)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        sales_rep_id INTEGER, 
        total_amount REAL,
        deposit REAL DEFAULT 0,
        payment_method TEXT,
        created_at TEXT
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price_at_sale REAL
      );
    `);

    // Purchase Orders
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        distributor_id INTEGER,
        status TEXT DEFAULT 'ordered',
        expected_arrival_date TEXT,
        created_at TEXT
      );
    `);
    
    // Purchase Order Items
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER,
        product_id INTEGER,
        quantity INTEGER
      );
    `);
  }

  private seedData() {
    // Seed Users
    this.db.run("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)", ['admin', 'admin', 'admin', 'Administrator']);
    this.db.run("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)", ['user', 'user', 'employee', 'Staff Member']);

    // Seed Categories
    this.addCategory('Electronics');
    this.addCategory('Accessories');
    this.addCategory('Furniture');

    // Seed Units
    this.addUnit('pcs');
    this.addUnit('box');
    this.addUnit('kg');

    // Seed Products
    this.addProduct({ name: 'Mechanical Keyboard', price: 120.00, cost: 60.00, stock: 15, category: 'Electronics', unit: 'pcs' } as Product);
    this.addProduct({ name: 'Wireless Mouse', price: 45.00, cost: 20.00, stock: 30, category: 'Electronics', unit: 'pcs' } as Product);
    this.addProduct({ name: 'USB-C Cable', price: 12.00, cost: 3.00, stock: 100, category: 'Accessories', unit: 'box' } as Product);
    
    // Seed Contacts
    this.addContact({ name: 'John Doe', phone: '123-456-7890', email: 'john@example.com', address: '123 Main St', type: 'customer' } as Contact);
    this.addContact({ name: 'Global Tech Supply', phone: '987-654-3210', email: 'sales@globaltech.com', address: '456 Port Rd', type: 'distributor' } as Contact);
    this.addContact({ name: 'Alice Sales', phone: '555-0101', email: 'alice@veik.com', address: 'Office', type: 'sales_rep' } as Contact);
  }

  // --- Auth ---
  login(username: string, password: string): { user: User | null, error?: string } {
    const res = this.db.exec("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
    if (!res.length) return { user: null };
    
    const user = this.mapResults(res[0])[0] as User;

    // Admin Lock Check
    if (user.role === 'admin') {
      // Check if logged in and active in last 30 minutes
      if (user.is_logged_in === 1) {
         const lastActive = user.last_active ? new Date(user.last_active).getTime() : 0;
         const now = new Date().getTime();
         const thirtyMins = 30 * 60 * 1000;
         
         // If active less than 30 mins ago, block
         if (now - lastActive < thirtyMins) {
           return { user: null, error: 'admin_locked' };
         }
      }
    }

    // Update login status
    this.db.run("UPDATE users SET is_logged_in = 1, last_active = ? WHERE id = ?", [new Date().toISOString(), user.id]);
    this.save();
    return { user };
  }

  logout(userId: number) {
    this.db.run("UPDATE users SET is_logged_in = 0 WHERE id = ?", [userId]);
    this.save();
  }

  registerUser(username: string, password: string, name: string): boolean {
    // Check if user exists
    const res = this.db.exec("SELECT id FROM users WHERE username = ?", [username]);
    if (res.length > 0) return false;

    const stmt = this.db.prepare("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)");
    stmt.run([username, password, 'employee', name]);
    stmt.free();
    this.save();
    return true;
  }

  // --- Categories ---
  getCategories(): Category[] {
    const res = this.db.exec("SELECT * FROM categories ORDER BY name ASC");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  addCategory(name: string) {
    try {
      const stmt = this.db.prepare("INSERT INTO categories (name) VALUES (?)");
      stmt.run([name]);
      stmt.free();
      this.save();
    } catch (e) {
      console.log("Category probably exists", e);
    }
  }

  deleteCategory(id: number) {
    this.db.run("DELETE FROM categories WHERE id=?", [id]);
    this.save();
  }

  // --- Units ---
  getUnits(): Unit[] {
    const res = this.db.exec("SELECT * FROM units ORDER BY name ASC");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  addUnit(name: string) {
    try {
      const stmt = this.db.prepare("INSERT INTO units (name) VALUES (?)");
      stmt.run([name]);
      stmt.free();
      this.save();
    } catch (e) {
      console.log("Unit probably exists", e);
    }
  }

  deleteUnit(id: number) {
    this.db.run("DELETE FROM units WHERE id=?", [id]);
    this.save();
  }

  // --- Products ---

  getProducts(): Product[] {
    const res = this.db.exec(`
      SELECT 
        p.*,
        (
          SELECT COALESCE(SUM(poi.quantity), 0)
          FROM purchase_order_items poi
          JOIN purchase_orders po ON poi.po_id = po.id
          WHERE poi.product_id = p.id AND po.status != 'received'
        ) as incoming
      FROM products p 
      ORDER BY p.id DESC
    `);
    
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  addProduct(p: Product) {
    const stmt = this.db.prepare("INSERT INTO products (name, price, cost, stock, category, unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run([p.name, p.price, p.cost, p.stock, p.category, p.unit || '', new Date().toISOString()]);
    stmt.free();
    this.save();
  }

  updateProduct(p: Product) {
    const stmt = this.db.prepare("UPDATE products SET name=?, price=?, cost=?, stock=?, category=?, unit=? WHERE id=?");
    stmt.run([p.name, p.price, p.cost, p.stock, p.category, p.unit, p.id]);
    stmt.free();
    this.save();
  }

  deleteProduct(id: number) {
    this.db.run("DELETE FROM products WHERE id=?", [id]);
    this.save();
  }

  // --- Contacts ---

  getContacts(): Contact[] {
    const res = this.db.exec("SELECT * FROM contacts ORDER BY name ASC");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getCustomers(): Contact[] {
    const res = this.db.exec("SELECT * FROM contacts WHERE type = 'customer' ORDER BY name ASC");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  addContact(c: Contact) {
    const stmt = this.db.prepare("INSERT INTO contacts (name, phone, email, address, type) VALUES (?, ?, ?, ?, ?)");
    stmt.run([c.name, c.phone || '', c.email || '', c.address || '', c.type]);
    stmt.free();
    this.save();
  }

  addCustomer(c: Contact) {
    this.addContact({ ...c, type: 'customer' });
  }

  // --- Sales Orders ---

  createOrder(order: Order, items: OrderItem[]): number {
    try {
      const stmt = this.db.prepare("INSERT INTO orders (contact_id, sales_rep_id, total_amount, deposit, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run([
        order.contact_id, 
        order.sales_rep_id, 
        order.total_amount, 
        order.deposit || 0,
        order.payment_method, 
        new Date().toISOString()
      ]);
      stmt.free();
      
      const orderId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];

      const itemStmt = this.db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)");
      const stockStmt = this.db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

      items.forEach(item => {
        itemStmt.run([orderId, item.product_id, item.quantity, item.price_at_sale]);
        stockStmt.run([item.quantity, item.product_id]);
      });

      itemStmt.free();
      stockStmt.free();
      
      this.save();
      return orderId;
    } catch (e) {
      console.error("Transaction failed", e);
      throw e;
    }
  }

  getOrders(): Order[] {
    const res = this.db.exec(`
      SELECT o.*, c.name as sales_rep_name
      FROM orders o
      LEFT JOIN contacts c ON o.sales_rep_id = c.id
      ORDER BY o.created_at DESC
    `);
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getOrderItems(orderId: number): OrderItem[] {
    const res = this.db.exec(`
      SELECT oi.*, p.name as product_name 
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  // --- Purchase Orders ---

  createPurchaseOrder(po: PurchaseOrder, items: PurchaseOrderItem[]): number {
    try {
      const stmt = this.db.prepare("INSERT INTO purchase_orders (distributor_id, status, expected_arrival_date, created_at) VALUES (?, ?, ?, ?)");
      stmt.run([po.distributor_id, 'ordered', po.expected_arrival_date, new Date().toISOString()]);
      stmt.free();

      const poId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      const itemStmt = this.db.prepare("INSERT INTO purchase_order_items (po_id, product_id, quantity) VALUES (?, ?, ?)");
      
      items.forEach(item => {
        itemStmt.run([poId, item.product_id, item.quantity]);
      });
      itemStmt.free();
      
      this.save();
      return poId;
    } catch (e) {
      console.error("PO Creation failed", e);
      throw e;
    }
  }

  getPurchaseOrders(): PurchaseOrder[] {
    const res = this.db.exec("SELECT * FROM purchase_orders ORDER BY created_at DESC");
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  getPurchaseOrderItems(poId: number): PurchaseOrderItem[] {
    const res = this.db.exec(`
      SELECT poi.*, p.name as product_name 
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = ?
    `, [poId]);
    if (!res.length) return [];
    return this.mapResults(res[0]);
  }

  updatePurchaseOrder(po: PurchaseOrder) {
    const stmt = this.db.prepare("UPDATE purchase_orders SET expected_arrival_date=?, status=? WHERE id=?");
    stmt.run([po.expected_arrival_date, po.status, po.id]);
    stmt.free();
    this.save();
  }

  receivePurchaseOrder(poId: number) {
    const items = this.getPurchaseOrderItems(poId);
    const stockStmt = this.db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");

    items.forEach(item => {
      stockStmt.run([item.quantity, item.product_id]);
    });
    stockStmt.free();

    this.db.run("UPDATE purchase_orders SET status = 'received' WHERE id = ?", [poId]);
    this.save();
  }

  // --- Stats ---

  getDashboardStats(): DashboardStats {
    const orders = this.getOrders().slice(0, 10);
    const totalSalesRes = this.db.exec("SELECT SUM(total_amount) FROM orders");
    const totalSales = totalSalesRes[0]?.values[0][0] || 0;
    
    const countOrdersRes = this.db.exec("SELECT COUNT(*) FROM orders");
    const orderCount = countOrdersRes[0]?.values[0][0] || 0;

    const lowStockRes = this.db.exec("SELECT COUNT(*) FROM products WHERE stock < 10");
    const lowStockCount = lowStockRes[0]?.values[0][0] || 0;

    return {
      totalSales,
      orderCount,
      lowStockCount,
      recentOrders: orders
    };
  }

  getSalesLast7Days(): {date: string, amount: number}[] {
    const res = this.db.exec(`
      SELECT date(created_at) as d, SUM(total_amount) as total 
      FROM orders 
      WHERE created_at >= date('now', '-7 days')
      GROUP BY d
      ORDER BY d ASC
    `);
    if (!res.length) return [];
    return this.mapResults(res[0]).map((r: any) => ({ date: r.d, amount: r.total }));
  }

  private mapResults(result: any) {
    const columns = result.columns;
    const values = result.values;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
}

export const dbService = new DatabaseService();