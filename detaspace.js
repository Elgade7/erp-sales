const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const isDeta = process.env.DETA_SPACE === '1';

app.use(cors());
app.use(express.json());

let db;
const DB_PATH = isDeta ? '/data/erp.db' : path.join(__dirname, 'erp.db');

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function saveDatabase() {
}

function initDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module TEXT NOT NULL,
      can_view INTEGER DEFAULT 0,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      module TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tax_id TEXT,
      customer_type TEXT DEFAULT 'individual',
      credit_limit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      tax_id TEXT,
      contact_person TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      order_number TEXT UNIQUE,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      expected_date TEXT,
      received_date TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      received_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      customer_id INTEGER NOT NULL,
      user_id INTEGER,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE,
      order_id INTEGER,
      customer_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      due_date TEXT,
      paid_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      date TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_warehouse_id INTEGER,
      to_warehouse_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      created_by INTEGER,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  function addColumnIfNotExists(table, column, type) {
    try {
      const result = database.exec(`PRAGMA table_info(${table})`);
      const exists = result.length > 0 && result[0].values.some(row => row[1] === column);
      if (!exists) {
        database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      }
    } catch (e) {
      console.error(`Error adding column ${column} to ${table}:`, e.message);
    }
  }

  addColumnIfNotExists('products', 'sku', 'TEXT');
  addColumnIfExists('products', 'category', 'TEXT');
  addColumnIfNotExists('products', 'min_stock', 'INTEGER DEFAULT 0');
  addColumnIfNotExists('inventory', 'min_stock', 'INTEGER DEFAULT 0');

  const defaultUser = database.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!defaultUser) {
    database.run(`INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)`,
      ['admin', 'admin123', 'admin@example.com', 'Administrator', 'admin']);

    const modules = ['dashboard', 'customers', 'products', 'inventory', 'suppliers', 'orders', 'invoices', 'expenses', 'projects'];
    const userId = database.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
    for (const mod of modules) {
      database.run(`INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)`,
        [userId, mod]);
    }
  }

  const defaultWarehouse = database.prepare('SELECT * FROM warehouses WHERE is_default = 1').get();
  if (!defaultWarehouse) {
    database.run(`INSERT INTO warehouses (name, location, is_default) VALUES (?, ?, 1)`,
      ['Main Warehouse', 'Main Location']);
  }
}

function addColumnIfExists(table, column, type) {
  try {
    const result = db.exec(`PRAGMA table_info(${table})`);
    const exists = result.length > 0 && result[0].values.some(row => row[1] === column);
    if (!exists) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  } catch (e) {
    console.error(`Error adding column ${column} to ${table}:`, e.message);
  }
}

function runQuery(sql, params = []) {
  const database = getDb();
  try {
    database.run(sql, params);
    saveDatabase();
    return { changes: database.getRowsModified() };
  } catch (error) {
    throw error;
  }
}

function insertAndGetId(sql, params = []) {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
  const result = database.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
}

function getOne(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

let currentUser = null;

initDatabase();

app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = getOne('SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1', [username, password]);
  if (user) {
    currentUser = user;
    const permissions = getAll('SELECT * FROM permissions WHERE user_id = ?', [user.id]);
    logActivity('login', 'auth', `User ${username} logged in`);
    res.json({ user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role }, permissions });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  logActivity('logout', 'auth', `User ${currentUser?.username} logged out`);
  currentUser = null;
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (currentUser) {
    const permissions = getAll('SELECT * FROM permissions WHERE user_id = ?', [currentUser.id]);
    res.json({ user: { id: currentUser.id, username: currentUser.username, email: currentUser.email, full_name: currentUser.full_name, role: currentUser.role }, permissions });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

function logActivity(action, module, details = null) {
  if (currentUser) {
    insertAndGetId(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [currentUser.id, action, module, details]
    );
  }
}

app.post('/api/users', (req, res) => {
  const { username, password, email, full_name, role } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO users (username, password, email, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, password, email, full_name, role || 'user']
    );
    const modules = ['dashboard', 'customers', 'products', 'inventory', 'suppliers', 'orders', 'invoices', 'expenses', 'projects'];
    for (const mod of modules) {
      insertAndGetId(
        'INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)',
        [id, mod]
      );
    }
    logActivity('create', 'users', `Created user ${username}`);
    res.json({ id, username, email, full_name, role });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', (req, res) => {
  const users = getAll('SELECT id, username, email, full_name, role, is_active, created_at FROM users');
  res.json(users);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, email, full_name, role, is_active } = req.body;
  try {
    runQuery('UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ? WHERE id = ?',
      [username, email, full_name, role, is_active ? 1 : 0, id]);
    logActivity('update', 'users', `Updated user ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM permissions WHERE user_id = ?', [id]);
    runQuery('DELETE FROM users WHERE id = ?', [id]);
    logActivity('delete', 'users', `Deleted user ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  const permissions = getAll('SELECT * FROM permissions WHERE user_id = ?', [userId]);
  res.json(permissions);
});

app.put('/api/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  const { permissions } = req.body;
  try {
    runQuery('DELETE FROM permissions WHERE user_id = ?', [userId]);
    for (const p of permissions) {
      insertAndGetId(
        'INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, p.module, p.can_view ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0]
      );
    }
    logActivity('update', 'permissions', `Updated permissions for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/activity-logs', (req, res) => {
  const logs = getAll('SELECT al.*, u.username FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 100');
  res.json(logs);
});

app.get('/api/customers', (req, res) => {
  const customers = getAll('SELECT * FROM customers ORDER BY created_at DESC');
  res.json(customers);
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, address, city, country, tax_id, customer_type, credit_limit } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO customers (name, email, phone, address, city, country, tax_id, customer_type, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, city, country, tax_id, customer_type || 'individual', credit_limit || 0]
    );
    logActivity('create', 'customers', `Created customer ${name}`);
    res.json({ id, name, email, phone, address, city, country, tax_id, customer_type, credit_limit });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, city, country, tax_id, customer_type, credit_limit, is_active } = req.body;
  try {
    runQuery('UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, tax_id = ?, customer_type = ?, credit_limit = ?, is_active = ? WHERE id = ?',
      [name, email, phone, address, city, country, tax_id, customer_type, credit_limit, is_active ? 1 : 0, id]);
    logActivity('update', 'customers', `Updated customer ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM customers WHERE id = ?', [id]);
    logActivity('delete', 'customers', `Deleted customer ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/products', (req, res) => {
  const products = getAll('SELECT * FROM products ORDER BY created_at DESC');
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { sku, name, description, category, price, cost_price, stock, min_stock, unit } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO products (sku, name, description, category, price, cost_price, stock, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sku, name, description, category, price, cost_price || 0, stock || 0, min_stock || 0, unit || 'piece']
    );
    logActivity('create', 'products', `Created product ${name}`);
    res.json({ id, sku, name, description, category, price, cost_price, stock, min_stock, unit });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { sku, name, description, category, price, cost_price, stock, min_stock, unit, is_active } = req.body;
  try {
    runQuery('UPDATE products SET sku = ?, name = ?, description = ?, category = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?, unit = ?, is_active = ? WHERE id = ?',
      [sku, name, description, category, price, cost_price || 0, stock || 0, min_stock || 0, unit || 'piece', is_active ? 1 : 0, id]);
    logActivity('update', 'products', `Updated product ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM products WHERE id = ?', [id]);
    logActivity('delete', 'products', `Deleted product ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/inventory', (req, res) => {
  const inventory = getAll(`
    SELECT i.*, p.name as product_name, p.sku, p.stock as total_stock, w.name as warehouse_name
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
    LEFT JOIN warehouses w ON i.warehouse_id = w.id
    ORDER BY i.id DESC
  `);
  res.json(inventory);
});

app.get('/api/warehouses', (req, res) => {
  const warehouses = getAll('SELECT * FROM warehouses ORDER BY created_at DESC');
  res.json(warehouses);
});

app.post('/api/warehouses', (req, res) => {
  const { name, location, is_default } = req.body;
  try {
    if (is_default) {
      runQuery('UPDATE warehouses SET is_default = 0');
    }
    const id = insertAndGetId('INSERT INTO warehouses (name, location, is_default) VALUES (?, ?, ?)', [name, location, is_default ? 1 : 0]);
    logActivity('create', 'warehouses', `Created warehouse ${name}`);
    res.json({ id, name, location, is_default });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const { name, location, is_default } = req.body;
  try {
    if (is_default) {
      runQuery('UPDATE warehouses SET is_default = 0');
    }
    runQuery('UPDATE warehouses SET name = ?, location = ?, is_default = ? WHERE id = ?', [name, location, is_default ? 1 : 0, id]);
    logActivity('update', 'warehouses', `Updated warehouse ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const defaultWh = getOne('SELECT * FROM warehouses WHERE is_default = 1');
  if (defaultWh && defaultWh.id == id) {
    return res.status(400).json({ error: 'Cannot delete default warehouse' });
  }
  runQuery('DELETE FROM warehouses WHERE id = ?', [id]);
  logActivity('delete', 'warehouses', `Deleted warehouse ${id}`);
  res.json({ success: true });
});

app.post('/api/inventory', (req, res) => {
  const { product_id, warehouse_id, quantity, min_stock } = req.body;
  try {
    const existing = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, warehouse_id]);
    if (existing) {
      runQuery('UPDATE inventory SET quantity = ?, min_stock = ? WHERE id = ?', [quantity, min_stock || 0, existing.id]);
      logActivity('update', 'inventory', `Updated inventory for product ${product_id}`);
    } else {
      const id = insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity, min_stock) VALUES (?, ?, ?, ?)', [product_id, warehouse_id, quantity, min_stock || 0]);
      logActivity('create', 'inventory', `Created inventory for product ${product_id}`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { quantity, min_stock } = req.body;
  try {
    runQuery('UPDATE inventory SET quantity = ?, min_stock = ? WHERE id = ?', [quantity, min_stock || 0, id]);
    logActivity('update', 'inventory', `Updated inventory ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM inventory WHERE id = ?', [id]);
    logActivity('delete', 'inventory', `Deleted inventory ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/inventory/adjust', (req, res) => {
  const { product_id, warehouse_id, quantity, type, notes } = req.body;
  const inv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, warehouse_id]);
  if (inv) {
    const newQty = type === 'add' ? inv.quantity + quantity : inv.quantity - quantity;
    runQuery('UPDATE inventory SET quantity = ? WHERE id = ?', [newQty, inv.id]);
  } else {
    insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)', [product_id, warehouse_id, quantity]);
  }
  logActivity('adjust', 'inventory', `Adjusted ${type} quantity ${quantity} for product ${product_id}`);
  res.json({ success: true });
});

app.post('/api/inventory/transfer', (req, res) => {
  const { product_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
  try {
    if (!product_id || !to_warehouse_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid transfer data' });
    }
    if (from_warehouse_id) {
      const fromInv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, from_warehouse_id]);
      if (!fromInv) {
        return res.status(400).json({ error: 'Source inventory not found' });
      }
      if (fromInv.quantity < quantity) {
        return res.status(400).json({ error: `Insufficient stock. Available: ${fromInv.quantity}` });
      }
      runQuery('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity, fromInv.id]);
    }
    const toInv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, to_warehouse_id]);
    if (toInv) {
      runQuery('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, toInv.id]);
    } else {
      insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)', [product_id, to_warehouse_id, quantity]);
    }
    logActivity('transfer', 'inventory', `Transferred ${quantity} units of product ${product_id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/suppliers', (req, res) => {
  const suppliers = getAll('SELECT * FROM suppliers ORDER BY created_at DESC');
  res.json(suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const { name, email, phone, address, city, country, tax_id, contact_person } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO suppliers (name, email, phone, address, city, country, tax_id, contact_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, city, country, tax_id, contact_person]
    );
    logActivity('create', 'suppliers', `Created supplier ${name}`);
    res.json({ id, name, email, phone, address, city, country, tax_id, contact_person });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, city, country, tax_id, contact_person, is_active } = req.body;
  try {
    runQuery('UPDATE suppliers SET name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, tax_id = ?, contact_person = ?, is_active = ? WHERE id = ?',
      [name, email, phone, address, city, country, tax_id, contact_person, is_active ? 1 : 0, id]);
    logActivity('update', 'suppliers', `Updated supplier ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM suppliers WHERE id = ?', [id]);
    logActivity('delete', 'suppliers', `Deleted supplier ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders', (req, res) => {
  const orders = getAll(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `);
  res.json(orders);
});

app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const order = getOne('SELECT * FROM orders WHERE id = ?', [id]);
  if (order) {
    const items = getAll('SELECT oi.*, p.name as product_name FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [id]);
    order.items = items;
  }
  res.json(order || {});
});

app.post('/api/orders', (req, res) => {
  const { customer_id, items, discount_amount, notes } = req.body;
  const getCustomer = getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
  if (!getCustomer) {
    return res.status(400).json({ error: 'Client non trouvé' });
  }
  const order_number = 'ORD-' + Date.now();
  let total_amount = 0;
  for (const item of items) {
    const product = getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
    if (!product) {
      return res.status(400).json({ error: `Produit ID ${item.product_id} non trouvé` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `Stock insuffisant pour ${product.name}` });
    }
    total_amount += product.price * item.quantity;
  }
  const tax_amount = total_amount * 0.15;
  const final_amount = total_amount + tax_amount - (discount_amount || 0);
  try {
    const order_id = insertAndGetId(
      'INSERT INTO orders (order_number, customer_id, user_id, total_amount, discount_amount, tax_amount, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [order_number, customer_id, currentUser?.id, total_amount, discount_amount || 0, tax_amount, notes, 'pending']
    );
    for (const item of items) {
      const product = getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
      insertAndGetId(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES (?, ?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, product.price, item.discount || 0]
      );
      runQuery('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    logActivity('create', 'orders', `Created order ${order_number}`);
    res.json({ id: order_id, order_number, total_amount: final_amount, status: 'pending' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    logActivity('update', 'orders', `Updated order ${id} status to ${status}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/purchase-orders', (req, res) => {
  const { supplier_id, items, expected_date, notes } = req.body;
  const order_number = 'PO-' + Date.now();
  let total = 0;
  for (const item of items) {
    total += item.quantity * item.unit_price;
  }
  try {
    const id = insertAndGetId(
      'INSERT INTO purchase_orders (supplier_id, order_number, total_amount, expected_date, notes, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [supplier_id, order_number, total, expected_date, notes, currentUser?.id, 'pending']
    );
    for (const item of items) {
      insertAndGetId(
        'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [id, item.product_id, item.quantity, item.unit_price]
      );
    }
    logActivity('create', 'suppliers', `Created purchase order ${order_number}`);
    res.json({ id, order_number, total_amount: total, status: 'pending' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/purchase-orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status === 'received') {
    const items = getAll('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [id]);
    for (const item of items) {
      const inv = getOne('SELECT * FROM inventory WHERE product_id = ?', [item.product_id]);
      if (inv) {
        runQuery('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [item.quantity, inv.id]);
      } else {
        const defaultWh = getOne('SELECT * FROM warehouses WHERE is_default = 1');
        if (defaultWh) {
          insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)', [item.product_id, defaultWh.id, item.quantity]);
        }
      }
      runQuery('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
  }
  try {
    runQuery('UPDATE purchase_orders SET status = ?, received_date = ? WHERE id = ?', [status, status === 'received' ? new Date().toISOString() : null, id]);
    logActivity('update', 'suppliers', `Updated purchase order ${id} status to ${status}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/invoices', (req, res) => {
  const invoices = getAll(`
    SELECT i.*, c.name as customer_name, o.order_number
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN orders o ON i.order_id = o.id
    ORDER BY i.created_at DESC
  `);
  res.json(invoices);
});

app.post('/api/invoices', (req, res) => {
  const { order_id, customer_id, due_date, notes } = req.body;
  const invoice_number = 'INV-' + Date.now();
  try {
    const order = getOne('SELECT * FROM orders WHERE id = ?', [order_id]);
    const tax_amount = order.total_amount * 0.15;
    const total = order.total_amount + tax_amount;
    const id = insertAndGetId(
      'INSERT INTO invoices (invoice_number, order_id, customer_id, total_amount, tax_amount, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [invoice_number, order_id, customer_id, total, tax_amount, due_date, notes]
    );
    logActivity('create', 'invoices', `Created invoice ${invoice_number}`);
    res.json({ id, invoice_number, total_amount: total, status: 'draft' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status === 'paid') {
      runQuery('UPDATE invoices SET status = ?, paid_date = ? WHERE id = ?', [status, new Date().toISOString(), id]);
    } else {
      runQuery('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    }
    logActivity('update', 'invoices', `Updated invoice ${id} status to ${status}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/expenses', (req, res) => {
  const expenses = getAll('SELECT * FROM expenses ORDER BY created_at DESC');
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  const { category, description, amount, date } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO expenses (category, description, amount, date) VALUES (?, ?, ?, ?)',
      [category, description, amount, date]
    );
    logActivity('create', 'expenses', `Created expense ${category}`);
    res.json({ id, category, description, amount, date });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const { category, description, amount, date, status } = req.body;
  try {
    runQuery('UPDATE expenses SET category = ?, description = ?, amount = ?, date = ?, status = ? WHERE id = ?',
      [category, description, amount, date, status, id]);
    logActivity('update', 'expenses', `Updated expense ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  try {
    runQuery('DELETE FROM expenses WHERE id = ?', [id]);
    logActivity('delete', 'expenses', `Deleted expense ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/sales', (req, res) => {
  const { start_date, end_date } = req.query;
  let query = `
    SELECT DATE(o.created_at) as date, COUNT(*) as orders, SUM(o.total_amount) as total
    FROM orders o
    WHERE o.status != 'cancelled'
  `;
  const params = [];
  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  query += ' GROUP BY DATE(o.created_at) ORDER BY date DESC LIMIT 30';
  const sales = getAll(query, params);
  res.json(sales);
});

app.get('/api/reports/financial', (req, res) => {
  const totalRevenue = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = "completed"')?.total || 0;
  const totalExpenses = getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = "paid"')?.total || 0;
  const totalInvoices = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = "paid"')?.total || 0;
  res.json({
    revenue: totalRevenue,
    expenses: totalExpenses,
    invoices: totalInvoices,
    profit: totalRevenue - totalExpenses
  });
});

app.get('/api/reports/inventory', (req, res) => {
  const lowStock = getAll('SELECT * FROM products WHERE stock <= min_stock AND is_active = 1');
  const totalProducts = getOne('SELECT COUNT(*) as count FROM products WHERE is_active = 1')?.count || 0;
  const totalValue = getOne('SELECT COALESCE(SUM(price * stock), 0) as total FROM products WHERE is_active = 1')?.total || 0;
  res.json({
    lowStock,
    totalProducts,
    totalValue
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ERP Backend running on http://localhost:${PORT}`);
});