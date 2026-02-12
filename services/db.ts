import { Product, Contact, Order, OrderItem, DashboardStats, User, PurchaseOrder, PurchaseOrderItem, Category, Unit, InventoryLog, CurrencyCode } from '../types';

// Declare the global window type for sql.js
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

const DB_NAME = 'veik_wms_renovation_v2.db'; // Version bump for schema change

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
      
      // MIGRATION: Attempt to add order_number column if it doesn't exist
      try {
        this.db.run("ALTER TABLE orders ADD COLUMN order_number TEXT");
      } catch (e) {
        // Column likely exists
      }

      // MIGRATION: Attempt to add discount column
      try {
        this.db.run("ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0");
      } catch (e) {
        // Column likely exists
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
    // 1. Nullify db reference to prevent any pending operations from saving
    this.db = null; 
    this.initialized = false;
    // 2. Clear storage
    localStorage.removeItem(DB_NAME);
    // 3. Force reload
    window.location.reload();
  }

  // --- Data Management (Export/Import) ---
  
  exportData(): string {
    if (!this.db) return '';
    // We export the raw SQLite tables as JSON for portability
    const tables = ['users', 'system_settings', 'categories', 'units', 'products', 'contacts', 'orders', 'order_items', 'purchase_orders', 'purchase_order_items', 'inventory_logs'];
    const exportObj: any = {};
    
    tables.forEach(table => {
        const res = this.db.exec(`SELECT * FROM ${table}`);
        if (res.length > 0) {
            exportObj[table] = this.mapResults(res[0]);
        } else {
            exportObj[table] = [];
        }
    });
    
    return JSON.stringify(exportObj, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
        const data = JSON.parse(jsonString);
        if (!data.products || !data.users) return false; // Basic validation

        // Reset DB tables
        this.db = new this.SQL.Database();
        this.createTables();
        
        // MIGRATION for restored data if needed
        try {
            this.db.run("ALTER TABLE orders ADD COLUMN order_number TEXT");
        } catch (e) {}

        try {
            this.db.run("ALTER TABLE orders ADD COLUMN discount REAL DEFAULT 0");
        } catch (e) {}

        // Helper to insert data
        const insertTable = (tableName: string, rows: any[]) => {
            if (!rows || rows.length === 0) return;
            const keys = Object.keys(rows[0]);
            // Filter keys to match current schema if needed, but for now assume matching
            const placeholders = keys.map(() => '?').join(',');
            const stmt = this.db.prepare(`INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`);
            rows.forEach(row => {
                const values = keys.map(k => row[k]);
                stmt.run(values);
            });
            stmt.free();
        };

        Object.keys(data).forEach(table => {
            insertTable(table, data[table]);
        });

        this.save();
        return true;
    } catch (e) {
        console.error("Import failed", e);
        return false;
    }
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

    // Settings Table (Key-Value)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
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

    // Products - CHANGED stock to REAL for decimals
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL,
        cost REAL,
        stock REAL, 
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

    // Sales Orders - Added order_number and discount
    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT,
        contact_id INTEGER,
        sales_rep_id INTEGER, 
        total_amount REAL,
        discount REAL DEFAULT 0,
        deposit REAL DEFAULT 0,
        payment_method TEXT,
        created_at TEXT
      );
    `);
    
    // CHANGED quantity to REAL
    this.db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity REAL, 
        price_at_sale REAL
      );
    `);

    // Purchase Orders - Added shipping_ref
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        distributor_id INTEGER,
        shipping_ref TEXT,
        status TEXT DEFAULT 'ordered',
        expected_arrival_date TEXT,
        created_at TEXT
      );
    `);
    
    // CHANGED quantity to REAL
    this.db.run(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER,
        product_id INTEGER,
        quantity REAL
      );
    `);

    // Inventory Logs
    this.db.run(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        type TEXT, -- 'sale', 'purchase', 'adjustment'
        quantity REAL, -- positive or negative
        reference_id INTEGER, -- order_id or po_id
        created_at TEXT
      );
    `);
  }

  private seedData() {
    // Seed Users
    this.db.run("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)", ['admin', 'admin', 'admin', 'System Admin']);
    this.db.run("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)", ['sales', '1234', 'employee', 'Sales Manager']);

    // Default Currency Settings (AED)
    this.saveSetting('display_currency', 'AED');
    this.saveSetting('exchange_rate', '1.0');

    // Industry Specific Categories
    const categories = ['Marble (大理石)', 'Mosaic (马赛克)', 'Tiles (瓷砖)', 'Adhesives (辅料)', 'Sanitary (卫浴)', 'Tools (工具)'];
    categories.forEach(c => this.addCategory(c));

    // Industry Specific Units
    const units = ['sqm (平米)', 'box (箱)', 'pcs (片)', 'bag (袋)', 'set (套)'];
    units.forEach(u => this.addUnit(u));

    // Industry Specific Products
    const productsData = [
      { name: 'Italian Carrara White (1200x600)', price: 480.00, cost: 260.00, stock: 500.5, category: 'Marble (大理石)', unit: 'sqm (平米)' },
      { name: 'Nero Marquina Black (800x800)', price: 320.00, cost: 180.00, stock: 300.0, category: 'Marble (大理石)', unit: 'sqm (平米)' },
      { name: 'Crystal Glass Mosaic - Blue Ocean', price: 45.00, cost: 20.00, stock: 200, category: 'Mosaic (马赛克)', unit: 'box (箱)' },
      { name: 'Hexagon Gold Mosaic', price: 68.00, cost: 35.00, stock: 150, category: 'Mosaic (马赛克)', unit: 'box (箱)' },
      { name: 'Rustic Matte Floor Tile (600x600)', price: 85.00, cost: 45.00, stock: 1200.5, category: 'Tiles (瓷砖)', unit: 'sqm (平米)' },
      { name: 'Polished Porcelain Tile White', price: 55.00, cost: 28.00, stock: 2000.0, category: 'Tiles (瓷砖)', unit: 'sqm (平米)' },
      { name: 'Heavy Duty Tile Adhesive', price: 35.00, cost: 18.00, stock: 500, category: 'Adhesives (辅料)', unit: 'bag (袋)' },
      { name: 'Epoxy Grout - Grey', price: 120.00, cost: 70.00, stock: 100, category: 'Adhesives (辅料)', unit: 'set (套)' },
      { name: 'Leveling Spacer Clips (100pcs)', price: 15.00, cost: 5.00, stock: 300, category: 'Tools (工具)', unit: 'bag (袋)' },
      { name: 'Luxury Gold Faucet', price: 899.00, cost: 450.00, stock: 20, category: 'Sanitary (卫浴)', unit: 'set (套)' },
    ];

    productsData.forEach(p => this.addProduct(p as Product));

    // Industry Specific Contacts
    const contacts = [
      { name: 'Golden Home Decor (装修公司)', phone: '138-0011-2233', email: 'purchase@goldenhome.com', address: 'Design District, Building A', type: 'customer' },
      { name: 'Mr. Wang (Contractor)', phone: '139-8888-7777', email: '', address: 'Sunshine Garden Project', type: 'customer' },
      { name: 'City Hotel Project', phone: '021-5555-6666', email: 'procurement@cityhotel.com', address: 'Downtown', type: 'customer' },
      { name: 'Stone Quarry Direct', phone: '0592-1111-2222', email: 'sales@stonequarry.com', address: 'Fujian Province', type: 'distributor' },
      { name: 'Ceramic Factory Ltd', phone: '0757-9999-8888', email: 'orders@foshan-tiles.com', address: 'Foshan City', type: 'distributor' },
      { name: 'Alice (Sales)', phone: 'Internal', email: 'alice@company.com', address: 'Showroom 1', type: 'sales_rep' },
    ];

    contacts.forEach(c => this.addContact(c as Contact));

    // Generate Historical Data
    const productList = this.getProducts();
    const customerList = this.getCustomers();
    const salesRepList = this.getContacts().filter(c => c.type === 'sales_rep');
    const distributorList = this.getContacts().filter(c => c.type === 'distributor');

    // SEED SALES ORDERS
    for (let i = 0; i < 30; i++) {
        const daysAgo = Math.floor(Math.random() * 60); // 2 months history
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        const customer = customerList[Math.floor(Math.random() * customerList.length)];
        const salesRep = salesRepList.length > 0 ? salesRepList[0] : null;
        
        const numItems = Math.floor(Math.random() * 2) + 1;
        const items = [];
        let total = 0;
        
        for (let j = 0; j < numItems; j++) {
            const prod = productList[Math.floor(Math.random() * productList.length)];
            const isSqm = prod.unit.includes('sqm');
            const qty = isSqm ? (Math.floor(Math.random() * 50) + 5.5) : (Math.floor(Math.random() * 50) + 5); 
            const price = prod.price; 
            
            total += price * qty;
            items.push({
                product_id: prod.id,
                quantity: qty,
                price_at_sale: price
            });
        }

        const deposit = total * 0.5; 
        const orderNum = `INV-2023-${1000 + i}`;

        this.createOrderWithDate({
            id: 0,
            order_number: orderNum,
            contact_id: customer.id,
            sales_rep_id: salesRep ? salesRep.id : null,
            total_amount: total,
            discount: 0,
            deposit: deposit,
            payment_method: 'transfer',
            created_at: date.toISOString()
        } as Order, items as any[]);
    }

    // SEED PURCHASE ORDERS
    for (let i = 0; i < 8; i++) {
        const daysAgo = Math.floor(Math.random() * 45); 
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        const distributor = distributorList.length > 0 ? distributorList[Math.floor(Math.random() * distributorList.length)] : null;
        const shippingRef = `CN-SH-${202300 + i}`;
        
        // Items
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items: any[] = [];
        
        for (let j = 0; j < numItems; j++) {
             const prod = productList[Math.floor(Math.random() * productList.length)];
             const isSqm = prod.unit.includes('sqm');
             const qty = isSqm ? (Math.floor(Math.random() * 100) + 50) : (Math.floor(Math.random() * 100) + 20); 
             items.push({ product_id: prod.id, quantity: qty });
        }

        const status = i < 4 ? 'received' : 'shipped';
        const expectedDate = new Date();
        expectedDate.setDate(date.getDate() + 30);

        this.createPurchaseOrderWithDate({
            id: 0,
            distributor_id: distributor ? distributor.id : null,
            shipping_ref: shippingRef,
            status: status as any,
            expected_arrival_date: expectedDate.toISOString().split('T')[0],
            created_at: date.toISOString()
        }, items);
    }
  }

  // --- Seed Helpers ---

  private createOrderWithDate(order: Order, items: any[]) {
      const orderId = this.insertOrderRecord(order);
      this.insertOrderItemsAndLog(orderId, items, order.created_at);
  }

  private createPurchaseOrderWithDate(po: PurchaseOrder, items: any[]) {
      this.db.run("INSERT INTO purchase_orders (distributor_id, shipping_ref, status, expected_arrival_date, created_at) VALUES (?, ?, ?, ?, ?)",
        [po.distributor_id, po.shipping_ref, po.status, po.expected_arrival_date, po.created_at]);
      const poId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      const stmt = this.db.prepare("INSERT INTO purchase_order_items (po_id, product_id, quantity) VALUES (?, ?, ?)");
      items.forEach(i => stmt.run([poId, i.product_id, i.quantity]));
      stmt.free();
      
      // If received, update stock
      if (po.status === 'received') {
         // Logic similar to receivePurchaseOrder but with historical date
         const stockStmt = this.db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
         const logStmt = this.db.prepare("INSERT INTO inventory_logs (product_id, type, quantity, reference_id, created_at) VALUES (?, ?, ?, ?, ?)");
         items.forEach(item => {
            stockStmt.run([item.quantity, item.product_id]);
            logStmt.run([item.product_id, 'purchase', item.quantity, poId, po.created_at]);
         });
         stockStmt.free();
         logStmt.free();
      }
  }

  // --- Core Transaction Logic with Inventory Logging ---

  createOrder(order: Order, items: OrderItem[]): number {
    try {
      const orderId = this.insertOrderRecord(order);
      this.insertOrderItemsAndLog(orderId, items, new Date().toISOString());
      this.save();
      return orderId;
    } catch (e) {
      console.error("Transaction failed", e);
      throw e;
    }
  }

  private insertOrderRecord(order: Order): number {
     const stmt = this.db.prepare("INSERT INTO orders (order_number, contact_id, sales_rep_id, total_amount, discount, deposit, payment_method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      stmt.run([
        order.order_number,
        order.contact_id, 
        order.sales_rep_id, 
        order.total_amount, // Final total after discount
        order.discount || 0,
        order.deposit || 0,
        order.payment_method, 
        order.created_at
      ]);
      stmt.free();
      return this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  }

  private insertOrderItemsAndLog(orderId: number, items: any[], dateStr: string) {
      const itemStmt = this.db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)");
      const stockStmt = this.db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
      const logStmt = this.db.prepare("INSERT INTO inventory_logs (product_id, type, quantity, reference_id, created_at) VALUES (?, ?, ?, ?, ?)");

      items.forEach((item: any) => {
        itemStmt.run([orderId, item.product_id, item.quantity, item.price_at_sale]);
        stockStmt.run([item.quantity, item.product_id]);
        logStmt.run([item.product_id, 'sale', -item.quantity, orderId, dateStr]);
      });

      itemStmt.free();
      stockStmt.free();
      logStmt.free();
  }

  // --- Purchase Order Logic with Logs ---

  receivePurchaseOrder(poId: number) {
    const items = this.getPurchaseOrderItems(poId);
    const stockStmt = this.db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
    const logStmt = this.db.prepare("INSERT INTO inventory_logs (product_id, type, quantity, reference_id, created_at) VALUES (?, ?, ?, ?, ?)");

    items.forEach(item => {
      stockStmt.run([item.quantity, item.product_id]);
      logStmt.run([item.product_id, 'purchase', item.quantity, poId, new Date().toISOString()]);
    });
    stockStmt.free();
    logStmt.free();

    this.db.run("UPDATE purchase_orders SET status = 'received' WHERE id = ?", [poId]);
    this.save();
  }

  // --- Workspace Logic (New) ---

  getPendingOrders(): Order[] {
    if (!this.db) return [];
    // Fetch orders where deposit < total_amount (allowing for small floating point differences)
    // In SQL, using a small epsilon like 0.1 to account for float math
    const res = this.db.exec(`
      SELECT o.*, c.name as sales_rep_name 
      FROM orders o 
      LEFT JOIN contacts c ON o.sales_rep_id = c.id 
      WHERE (o.total_amount - o.deposit) > 0.5
      ORDER BY o.created_at ASC
    `);
    return res.length ? this.mapResults(res[0]) : [];
  }

  getPendingPurchaseOrders(): PurchaseOrder[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT po.*, c.name as distributor_name 
      FROM purchase_orders po 
      LEFT JOIN contacts c ON po.distributor_id = c.id 
      WHERE po.status != 'received'
      ORDER BY po.expected_arrival_date ASC
    `);
    return res.length ? this.mapResults(res[0]) : [];
  }

  updateOrderDeposit(orderId: number, additionalAmount: number) {
      if (!this.db) return;
      this.db.run("UPDATE orders SET deposit = deposit + ? WHERE id = ?", [additionalAmount, orderId]);
      this.save();
  }

  // --- User Management ---
  getUsers(): User[] {
      if (!this.db) return [];
      const res = this.db.exec("SELECT id, username, role, name, last_active FROM users");
      return res.length ? this.mapResults(res[0]) : [];
  }

  deleteUser(id: number) {
      if (!this.db) return;
      this.db.run("DELETE FROM users WHERE id = ?", [id]);
      this.save();
  }

  // Auth
  login(username: string, password: string): { user: User | null, error?: string } {
    if (!this.db) return { user: null };
    const res = this.db.exec("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
    if (!res.length) return { user: null };
    const user = this.mapResults(res[0])[0] as User;
    
    // REMOVED CONCURRENCY CHECK HERE TO ALLOW MULTIPLE LOGINS
    
    this.db.run("UPDATE users SET is_logged_in = 1, last_active = ? WHERE id = ?", [new Date().toISOString(), user.id]);
    this.save();
    return { user };
  }
  
  logout(userId: number) {
    if (!this.db) return;
    this.db.run("UPDATE users SET is_logged_in = 0 WHERE id = ?", [userId]);
    this.save();
  }

  registerUser(u: string, p: string, n: string, role: string = 'employee'): boolean {
    if (!this.db) return false;
    const res = this.db.exec("SELECT id FROM users WHERE username = ?", [u]);
    if (res.length > 0) return false;
    this.db.run("INSERT INTO users (username, password, role, name, is_logged_in) VALUES (?, ?, ?, ?, 0)", [u, p, role, n]);
    this.save();
    return true;
  }

  // Settings
  getSettings(): Record<string, string> {
    if (!this.db) return {};
    const res = this.db.exec("SELECT key, value FROM system_settings");
    if (!res.length) return {};
    const settings: Record<string, string> = {};
    this.mapResults(res[0]).forEach((row: any) => settings[row.key] = row.value);
    
    // Default fallback for currency
    if(!settings['display_currency']) settings['display_currency'] = 'AED';
    if(!settings['exchange_rate']) settings['exchange_rate'] = '1';
    
    return settings;
  }

  saveSetting(key: string, value: string) {
    if (!this.db) return;
    this.db.run("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", [key, value]);
    this.save();
  }

  // Lookups
  getCategories(): Category[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT * FROM categories ORDER BY name ASC");
    return res.length ? this.mapResults(res[0]) : [];
  }
  addCategory(name: string) { if (!this.db) return; try { this.db.run("INSERT INTO categories (name) VALUES (?)", [name]); this.save(); } catch(e){} }
  deleteCategory(id: number) { if (!this.db) return; this.db.run("DELETE FROM categories WHERE id=?", [id]); this.save(); }

  getUnits(): Unit[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT * FROM units ORDER BY name ASC");
    return res.length ? this.mapResults(res[0]) : [];
  }
  addUnit(name: string) { if (!this.db) return; try { this.db.run("INSERT INTO units (name) VALUES (?)", [name]); this.save(); } catch(e){} }
  deleteUnit(id: number) { if (!this.db) return; this.db.run("DELETE FROM units WHERE id=?", [id]); this.save(); }

  // Products
  getProducts(): Product[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT p.*, (SELECT COALESCE(SUM(poi.quantity), 0) FROM purchase_order_items poi JOIN purchase_orders po ON poi.po_id = po.id WHERE poi.product_id = p.id AND po.status != 'received') as incoming
      FROM products p ORDER BY p.id DESC
    `);
    return res.length ? this.mapResults(res[0]) : [];
  }
  addProduct(p: Product) {
    if (!this.db) return;
    this.db.run("INSERT INTO products (name, price, cost, stock, category, unit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [p.name, p.price, p.cost, p.stock, p.category, p.unit || '', new Date().toISOString()]);
    this.save();
  }
  updateProduct(p: Product) {
    if (!this.db) return;
    this.db.run("UPDATE products SET name=?, price=?, cost=?, stock=?, category=?, unit=? WHERE id=?", 
      [p.name, p.price, p.cost, p.stock, p.category, p.unit, p.id]);
    this.save();
  }
  deleteProduct(id: number) { if (!this.db) return; this.db.run("DELETE FROM products WHERE id=?", [id]); this.save(); }

  // LOGS (New Feature)
  getProductLogs(productId: number): any[] {
     if (!this.db) return [];
     const res = this.db.exec(`
        SELECT l.*, 
          CASE 
             WHEN l.type = 'sale' THEN (SELECT order_number FROM orders WHERE id = l.reference_id)
             WHEN l.type = 'purchase' THEN (SELECT shipping_ref FROM purchase_orders WHERE id = l.reference_id)
             ELSE '-'
          END as ref_number
        FROM inventory_logs l 
        WHERE l.product_id = ? 
        ORDER BY l.created_at DESC
     `, [productId]);
     return res.length ? this.mapResults(res[0]) : [];
  }

  // Contacts
  getContacts(): Contact[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT * FROM contacts ORDER BY name ASC");
    return res.length ? this.mapResults(res[0]) : [];
  }
  getCustomers(): Contact[] {
    if (!this.db) return [];
    const res = this.db.exec("SELECT * FROM contacts WHERE type = 'customer' ORDER BY name ASC");
    return res.length ? this.mapResults(res[0]) : [];
  }
  addContact(c: Contact) {
    if (!this.db) return;
    this.db.run("INSERT INTO contacts (name, phone, email, address, type) VALUES (?, ?, ?, ?, ?)", 
      [c.name, c.phone || '', c.email || '', c.address || '', c.type]);
    this.save();
  }
  addCustomer(c: Contact) { this.addContact({ ...c, type: 'customer' }); }

  // Orders
  getOrders(): Order[] {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT o.*, c.name as sales_rep_name FROM orders o LEFT JOIN contacts c ON o.sales_rep_id = c.id ORDER BY o.created_at DESC`);
    return res.length ? this.mapResults(res[0]) : [];
  }
  getOrderItems(orderId: number): OrderItem[] {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT oi.*, p.name as product_name, p.unit FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`, [orderId]);
    return res.length ? this.mapResults(res[0]) : [];
  }

  // POs
  createPurchaseOrder(po: PurchaseOrder, items: PurchaseOrderItem[]): number {
    this.db.run("INSERT INTO purchase_orders (distributor_id, shipping_ref, status, expected_arrival_date, created_at) VALUES (?, ?, ?, ?, ?)",
      [po.distributor_id, po.shipping_ref || '', 'ordered', po.expected_arrival_date, new Date().toISOString()]);
    const poId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    const stmt = this.db.prepare("INSERT INTO purchase_order_items (po_id, product_id, quantity) VALUES (?, ?, ?)");
    items.forEach(i => stmt.run([poId, i.product_id, i.quantity]));
    stmt.free();
    this.save();
    return poId;
  }
  getPurchaseOrders(): PurchaseOrder[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT po.*, c.name as distributor_name 
      FROM purchase_orders po 
      LEFT JOIN contacts c ON po.distributor_id = c.id 
      ORDER BY po.created_at DESC
    `);
    return res.length ? this.mapResults(res[0]) : [];
  }
  getPurchaseOrderItems(poId: number): PurchaseOrderItem[] {
    if (!this.db) return [];
    const res = this.db.exec(`SELECT poi.*, p.name as product_name, p.unit FROM purchase_order_items poi LEFT JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`, [poId]);
    return res.length ? this.mapResults(res[0]) : [];
  }
  updatePurchaseOrder(po: PurchaseOrder) {
    if (!this.db) return;
    this.db.run("UPDATE purchase_orders SET expected_arrival_date=?, status=?, shipping_ref=? WHERE id=?", [po.expected_arrival_date, po.status, po.shipping_ref, po.id]);
    this.save();
  }

  // Stats
  getDashboardStats(): DashboardStats {
    if (!this.db) return { totalSales: 0, orderCount: 0, lowStockCount: 0, recentOrders: [] };
    const settings = this.getSettings();
    const lowStockThreshold = parseInt(settings['low_stock_threshold'] || '50');
    
    // Recent orders always last 10
    const orders = this.getOrders().slice(0, 10);
    const lowStockCount = this.db.exec(`SELECT COUNT(*) FROM products WHERE stock < ${lowStockThreshold}`)[0]?.values[0][0] || 0;
    
    // Total stats (All Time default fallback if analytics not used)
    const totalSales = this.db.exec("SELECT SUM(total_amount) FROM orders")[0]?.values[0][0] || 0;
    const orderCount = this.db.exec("SELECT COUNT(*) FROM orders")[0]?.values[0][0] || 0;

    return { totalSales, orderCount, lowStockCount, recentOrders: orders };
  }

  // NEW: Flexible Analytics Method
  getAnalyticsData(startDate: string | null, endDate: string | null): { totalSales: number, totalReceived: number, totalPending: number, totalOrders: number, salesTrend: {date: string, amount: number}[] } {
    if (!this.db) return { totalSales: 0, totalReceived: 0, totalPending: 0, totalOrders: 0, salesTrend: [] };

    let whereClause = "";
    if (startDate && endDate) {
        // SQLite string comparison works for ISO dates
        whereClause = `WHERE date(created_at) >= date('${startDate}') AND date(created_at) <= date('${endDate}')`;
    }

    // 1. Total Sales & Received & Pending
    const salesRes = this.db.exec(`
        SELECT 
            SUM(total_amount) as gross,
            SUM(deposit) as received,
            SUM(total_amount - deposit) as pending
        FROM orders 
        ${whereClause}
    `);
    
    const totalSales = salesRes.length ? (salesRes[0].values[0][0] || 0) : 0;
    const totalReceived = salesRes.length ? (salesRes[0].values[0][1] || 0) : 0;
    const totalPending = salesRes.length ? (salesRes[0].values[0][2] || 0) : 0;

    // 2. Total Orders in period
    const countRes = this.db.exec(`SELECT COUNT(*) FROM orders ${whereClause}`);
    const totalOrders = countRes.length ? (countRes[0].values[0][0] || 0) : 0;

    // 3. Daily Trend
    const trendRes = this.db.exec(`
        SELECT date(created_at) as d, SUM(total_amount) as total 
        FROM orders 
        ${whereClause} 
        GROUP BY d 
        ORDER BY d ASC
    `);

    const salesTrend = trendRes.length ? this.mapResults(trendRes[0]).map((r: any) => ({ date: r.d, amount: r.total })) : [];

    return { totalSales, totalReceived, totalPending, totalOrders, salesTrend };
  }

  private mapResults(result: any) {
    const columns = result.columns;
    const values = result.values;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => obj[col] = row[i]);
      return obj;
    });
  }
}

export const dbService = new DatabaseService();