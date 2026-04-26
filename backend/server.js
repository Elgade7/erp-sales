const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, saveDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let currentUser = null;

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
  const results = [];
  const stmt = database.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function insertAndGetId(sql, params = []) {
  const database = getDb();
  database.run(sql, params);
  saveDatabase();
  const result = database.exec('SELECT last_insert_rowid() as id');
  return result[0].values[0][0];
}

function logActivity(action, module, details = null) {
  if (currentUser) {
    insertAndGetId(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [currentUser.id, action, module, details]
    );
  }
}

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
  if (currentUser) {
    logActivity('logout', 'auth', `User ${currentUser.username} logged out`);
  }
  currentUser = null;
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!currentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const permissions = getAll('SELECT * FROM permissions WHERE user_id = ?', [currentUser.id]);
  res.json({ user: { id: currentUser.id, username: currentUser.username, email: currentUser.email, full_name: currentUser.full_name, role: currentUser.role }, permissions });
});

app.get('/api/users', (req, res) => {
  const users = getAll('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

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

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { username, email, full_name, role, is_active, password } = req.body;
  if (password) {
    runQuery('UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ?, password = ? WHERE id = ?',
      [username, email, full_name, role, is_active, password, id]);
  } else {
    runQuery('UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, is_active = ? WHERE id = ?',
      [username, email, full_name, role, is_active, id]);
  }
  logActivity('update', 'users', `Updated user ${id}`);
  res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM users WHERE id = ?', [id]);
  logActivity('delete', 'users', `Deleted user ${id}`);
  res.json({ success: true });
});

app.get('/api/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  const perms = getAll('SELECT * FROM permissions WHERE user_id = ?', [userId]);
  res.json(perms);
});

app.put('/api/permissions/:userId', (req, res) => {
  const { userId } = req.params;
  const permissions = req.body;
  runQuery('DELETE FROM permissions WHERE user_id = ?', [userId]);
  for (const p of permissions) {
    insertAndGetId(
      'INSERT INTO permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, p.module, p.can_view ? 1 : 0, p.can_create ? 1 : 0, p.can_edit ? 1 : 0, p.can_delete ? 1 : 0]
    );
  }
  logActivity('update', 'permissions', `Updated permissions for user ${userId}`);
  res.json({ success: true });
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
  runQuery(
    'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, tax_id = ?, customer_type = ?, credit_limit = ?, is_active = ? WHERE id = ?',
    [name, email, phone, address, city, country, tax_id, customer_type, credit_limit, is_active, id]
  );
  logActivity('update', 'customers', `Updated customer ${id}`);
  res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM customers WHERE id = ?', [id]);
  logActivity('delete', 'customers', `Deleted customer ${id}`);
  res.json({ success: true });
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
  runQuery(
    'UPDATE products SET sku = ?, name = ?, description = ?, category = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?, unit = ?, is_active = ? WHERE id = ?',
    [sku, name, description, category, price, cost_price, stock, min_stock, unit, is_active, id]
  );
  logActivity('update', 'products', `Updated product ${id}`);
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM products WHERE id = ?', [id]);
  logActivity('delete', 'products', `Deleted product ${id}`);
  res.json({ success: true });
});

app.get('/api/warehouses', (req, res) => {
  const warehouses = getAll('SELECT * FROM warehouses ORDER BY created_at DESC');
  res.json(warehouses);
});

app.post('/api/warehouses', (req, res) => {
  const { name, location } = req.body;
  try {
    const id = insertAndGetId('INSERT INTO warehouses (name, location) VALUES (?, ?)', [name, location]);
    logActivity('create', 'inventory', `Created warehouse ${name}`);
    res.json({ id, name, location });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const { name, location, is_default } = req.body;
  if (is_default) {
    runQuery('UPDATE warehouses SET is_default = 0');
  }
  runQuery('UPDATE warehouses SET name = ?, location = ?, is_default = ? WHERE id = ?', [name, location, is_default ? 1 : 0, id]);
  logActivity('update', 'inventory', `Updated warehouse ${id}`);
  res.json({ success: true });
});

app.delete('/api/warehouses/:id', (req, res) => {
  const { id } = req.params;
  const defaultWh = getOne('SELECT * FROM warehouses WHERE is_default = 1');
  if (defaultWh && defaultWh.id == id) {
    return res.status(400).json({ error: 'Cannot delete default warehouse' });
  }
  runQuery('DELETE FROM warehouses WHERE id = ?', [id]);
  logActivity('delete', 'inventory', `Deleted warehouse ${id}`);
  res.json({ success: true });
});

app.get('/api/inventory', (req, res) => {
  const inventory = getAll(`
    SELECT i.*, p.name as product_name, p.sku, w.name as warehouse_name
    FROM inventory i
    JOIN products p ON i.product_id = p.id
    JOIN warehouses w ON i.warehouse_id = w.id
  `);
  res.json(inventory);
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
  logActivity('adjust', 'inventory', `Adjusted inventory: ${type} ${quantity} units`);
  res.json({ success: true });
});

app.get('/api/stock-transfers', (req, res) => {
  const transfers = getAll(`
    SELECT st.*, p.name as product_name, fw.name as from_warehouse, tw.name as to_warehouse, u.username
    FROM stock_transfers st
    JOIN products p ON st.product_id = p.id
    LEFT JOIN warehouses fw ON st.from_warehouse_id = fw.id
    LEFT JOIN warehouses tw ON st.to_warehouse_id = tw.id
    LEFT JOIN users u ON st.created_by = u.id
    ORDER BY st.created_at DESC
  `);
  res.json(transfers);
});

app.post('/api/stock-transfers', (req, res) => {
  const { from_warehouse_id, to_warehouse_id, product_id, quantity, notes } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO stock_transfers (from_warehouse_id, to_warehouse_id, product_id, quantity, notes, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [from_warehouse_id, to_warehouse_id, product_id, quantity, notes, currentUser?.id, 'completed']
    );
    if (from_warehouse_id) {
      const fromInv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, from_warehouse_id]);
      if (fromInv) {
        runQuery('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [quantity, fromInv.id]);
      }
    }
    const toInv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?', [product_id, to_warehouse_id]);
    if (toInv) {
      runQuery('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [quantity, toInv.id]);
    } else {
      insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)', [product_id, to_warehouse_id, quantity]);
    }
    logActivity('create', 'inventory', `Stock transfer created: ${quantity} units`);
    res.json({ id, success: true });
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
  runQuery(
    'UPDATE suppliers SET name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, tax_id = ?, contact_person = ?, is_active = ? WHERE id = ?',
    [name, email, phone, address, city, country, tax_id, contact_person, is_active, id]
  );
  logActivity('update', 'suppliers', `Updated supplier ${id}`);
  res.json({ success: true });
});

app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM suppliers WHERE id = ?', [id]);
  logActivity('delete', 'suppliers', `Deleted supplier ${id}`);
  res.json({ success: true });
});

app.get('/api/purchase-orders', (req, res) => {
  const orders = getAll(`
    SELECT po.*, s.name as supplier_name, u.username
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    ORDER BY po.created_at DESC
  `);
  const items = getAll('SELECT * FROM purchase_order_items');
  const ordersWithItems = orders.map(order => ({
    ...order,
    items: items.filter(item => item.purchase_order_id === order.id)
  }));
  res.json(ordersWithItems);
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
      const inv = getOne('SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = 1', [item.product_id]);
      if (inv) {
        runQuery('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [item.received_quantity || item.quantity, inv.id]);
      } else {
        insertAndGetId('INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, 1, ?)', [item.product_id, item.received_quantity || item.quantity]);
      }
      runQuery('UPDATE products SET stock = stock + ? WHERE id = ?', [item.received_quantity || item.quantity, item.product_id]);
    }
  }
  runQuery('UPDATE purchase_orders SET status = ?, received_date = ? WHERE id = ?', [status, status === 'received' ? new Date().toISOString().split('T')[0] : null, id]);
  logActivity('update', 'suppliers', `Updated PO ${id} status to ${status}`);
  res.json({ success: true });
});

app.get('/api/orders', (req, res) => {
  const orders = getAll(`
    SELECT o.*, c.name as customer_name, u.username
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `);
  const orderItems = getAll('SELECT * FROM order_items');
  const ordersWithItems = orders.map(order => ({
    ...order,
    items: orderItems.filter(item => item.order_id === order.id)
  }));
  res.json(ordersWithItems);
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
  runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  logActivity('update', 'orders', `Updated order ${id} status to ${status}`);
  res.json({ success: true });
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
  const order = getOne('SELECT * FROM orders WHERE id = ?', [order_id]);
  if (!order) {
    return res.status(400).json({ error: 'Order not found' });
  }
  const invoice_number = 'INV-' + Date.now();
  const tax_amount = order.total_amount * 0.15;
  const total_amount = order.total_amount + tax_amount - order.discount_amount;
  try {
    const id = insertAndGetId(
      'INSERT INTO invoices (invoice_number, order_id, customer_id, total_amount, tax_amount, discount_amount, due_date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [invoice_number, order_id, customer_id, total_amount, tax_amount, order.discount_amount, due_date, notes, 'sent']
    );
    logActivity('create', 'invoices', `Created invoice ${invoice_number}`);
    res.json({ id, invoice_number, total_amount, status: 'sent' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  runQuery('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
  logActivity('update', 'invoices', `Updated invoice ${id} status to ${status}`);
  res.json({ success: true });
});

app.get('/api/payments', (req, res) => {
  const payments = getAll(`
    SELECT p.*, c.name as customer_name, u.username
    FROM payments p
    LEFT JOIN customers c ON p.customer_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.created_at DESC
  `);
  res.json(payments);
});

app.post('/api/payments', (req, res) => {
  const { invoice_id, customer_id, amount, payment_method, reference, notes } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO payments (invoice_id, customer_id, amount, payment_method, reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [invoice_id, customer_id, amount, payment_method, reference, notes, currentUser?.id]
    );
    if (invoice_id) {
      const invoice = getOne('SELECT * FROM invoices WHERE id = ?', [invoice_id]);
      if (invoice) {
        runQuery('UPDATE invoices SET amount_paid = amount_paid + ? WHERE id = ?', [amount, invoice_id]);
        if (invoice.amount_paid + amount >= invoice.total_amount) {
          runQuery('UPDATE invoices SET status = ? WHERE id = ?', ['paid', invoice_id]);
          runQuery('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', invoice.order_id]);
        }
      }
    }
    logActivity('create', 'invoices', `Payment received: ${amount}`);
    res.json({ id, amount, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/expenses', (req, res) => {
  const expenses = getAll(`
    SELECT e.*, s.name as supplier_name, u.username
    FROM expenses e
    LEFT JOIN suppliers s ON e.supplier_id = s.id
    LEFT JOIN users u ON e.created_by = u.id
    ORDER BY e.created_at DESC
  `);
  res.json(expenses);
});

app.post('/api/expenses', (req, res) => {
  const { category, description, amount, expense_date, supplier_id, status, receipt_url } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO expenses (category, description, amount, expense_date, supplier_id, status, receipt_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [category, description, amount, expense_date, supplier_id, status || 'pending', receipt_url, currentUser?.id]
    );
    logActivity('create', 'expenses', `Created expense: ${amount}`);
    res.json({ id, category, description, amount, status });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/expenses/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  runQuery('UPDATE expenses SET status = ? WHERE id = ?', [status, id]);
  logActivity('update', 'expenses', `Updated expense ${id} status to ${status}`);
  res.json({ success: true });
});

app.get('/api/projects', (req, res) => {
  const projects = getAll(`
    SELECT p.*, c.name as client_name, u.username
    FROM projects p
    LEFT JOIN customers c ON p.client_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    ORDER BY p.created_at DESC
  `);
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name, description, client_id, start_date, end_date, budget } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO projects (name, description, client_id, start_date, end_date, budget, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, client_id, start_date, end_date, budget || 0, currentUser?.id, 'planning']
    );
    logActivity('create', 'projects', `Created project ${name}`);
    res.json({ id, name, description, status: 'planning' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, client_id, start_date, end_date, budget, status } = req.body;
  runQuery(
    'UPDATE projects SET name = ?, description = ?, client_id = ?, start_date = ?, end_date = ?, budget = ?, status = ? WHERE id = ?',
    [name, description, client_id, start_date, end_date, budget, status, id]
  );
  logActivity('update', 'projects', `Updated project ${id}`);
  res.json({ success: true });
});

app.get('/api/project-tasks', (req, res) => {
  const tasks = getAll(`
    SELECT pt.*, p.name as project_name, u.username as assigned_name
    FROM project_tasks pt
    LEFT JOIN projects p ON pt.project_id = p.id
    LEFT JOIN users u ON pt.assigned_to = u.id
    ORDER BY pt.created_at DESC
  `);
  res.json(tasks);
});

app.post('/api/project-tasks', (req, res) => {
  const { project_id, title, description, assigned_to, due_date, estimated_hours, priority } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO project_tasks (project_id, title, description, assigned_to, due_date, estimated_hours, priority) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_id, title, description, assigned_to, due_date, estimated_hours || 0, priority || 'medium']
    );
    logActivity('create', 'projects', `Created task ${title}`);
    res.json({ id, title, status: 'todo' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/project-tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, assigned_to, due_date, estimated_hours, priority, status, logged_hours } = req.body;
  runQuery(
    'UPDATE project_tasks SET title = ?, description = ?, assigned_to = ?, due_date = ?, estimated_hours = ?, priority = ?, status = ?, logged_hours = ? WHERE id = ?',
    [title, description, assigned_to, due_date, estimated_hours, priority, status, logged_hours, id]
  );
  logActivity('update', 'projects', `Updated task ${id}`);
  res.json({ success: true });
});

app.get('/api/time-logs', (req, res) => {
  const logs = getAll(`
    SELECT tl.*, u.username, pt.title as task_title, p.name as project_name
    FROM time_logs tl
    LEFT JOIN users u ON tl.user_id = u.id
    LEFT JOIN project_tasks pt ON tl.task_id = pt.id
    LEFT JOIN projects p ON tl.project_id = p.id
    ORDER BY tl.created_at DESC
  `);
  res.json(logs);
});

app.post('/api/time-logs', (req, res) => {
  const { task_id, project_id, hours, description, log_date } = req.body;
  try {
    const id = insertAndGetId(
      'INSERT INTO time_logs (task_id, project_id, user_id, hours, description, log_date) VALUES (?, ?, ?, ?, ?, ?)',
      [task_id, project_id, currentUser?.id, hours, description, log_date]
    );
    if (task_id) {
      const task = getOne('SELECT * FROM project_tasks WHERE id = ?', [task_id]);
      if (task) {
        runQuery('UPDATE project_tasks SET logged_hours = logged_hours + ? WHERE id = ?', [hours, task_id]);
      }
    }
    logActivity('create', 'projects', `Logged ${hours} hours`);
    res.json({ id, hours, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/alerts', (req, res) => {
  const alerts = getAll('SELECT * FROM alerts WHERE is_read = 0 ORDER BY created_at DESC LIMIT 20');
  res.json(alerts);
});

app.put('/api/alerts/:id/read', (req, res) => {
  const { id } = req.params;
  runQuery('UPDATE alerts SET is_read = 1 WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/reports/sales', (req, res) => {
  const totalRevenue = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"');
  const totalOrders = getOne('SELECT COUNT(*) as count FROM orders WHERE status != "cancelled"');
  const totalCustomers = getOne('SELECT COUNT(*) as count FROM customers');
  const totalProducts = getOne('SELECT COUNT(*) as count FROM products');

  const ordersByStatus = getAll('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
  const recentOrders = getAll(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 10
  `);
  const topProducts = getAll(`
    SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.unit_price) as total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY p.id
    ORDER BY total_revenue DESC
    LIMIT 5
  `);

  res.json({
    summary: {
      totalRevenue: totalRevenue ? totalRevenue.total : 0,
      totalOrders: totalOrders ? totalOrders.count : 0,
      totalCustomers: totalCustomers ? totalCustomers.count : 0,
      totalProducts: totalProducts ? totalProducts.count : 0
    },
    ordersByStatus,
    recentOrders,
    topProducts
  });
});

app.get('/api/reports/financial', (req, res) => {
  const totalRevenue = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"')?.total || 0;
  const totalExpenses = getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = "approved"')?.total || 0;
  const totalPayments = getOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments')?.total || 0;
  const totalInvoices = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices')?.total || 0;
  const unpaidInvoices = getOne('SELECT COALESCE(SUM(total_amount - amount_paid), 0) as total FROM invoices WHERE status != "paid"')?.total || 0;

  const revenueByMonth = getAll(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(total_amount) as revenue
    FROM orders WHERE status != 'cancelled'
    GROUP BY month ORDER BY month DESC LIMIT 12
  `);

  const expensesByCategory = getAll(`
    SELECT category, SUM(amount) as total FROM expenses WHERE status = 'approved' GROUP BY category
  `);

  res.json({
    totalRevenue,
    totalExpenses,
    totalPayments,
    totalInvoices,
    unpaidInvoices,
    profit: totalRevenue - totalExpenses,
    revenueByMonth: revenueByMonth.reverse(),
    expensesByCategory
  });
});

app.get('/api/reports/inventory', (req, res) => {
  const lowStock = getAll('SELECT * FROM products WHERE stock <= min_stock AND is_active = 1');
  const outOfStock = getAll('SELECT * FROM products WHERE stock = 0 AND is_active = 1');
  const inventoryValue = getOne('SELECT COALESCE(SUM(price * stock), 0) as total FROM products WHERE is_active = 1')?.total || 0;

  const stockByWarehouse = getAll(`
    SELECT w.name as warehouse, SUM(i.quantity) as total_items, COUNT(DISTINCT i.product_id) as unique_products
    FROM inventory i
    JOIN warehouses w ON i.warehouse_id = w.id
    GROUP BY w.id
  `);

  res.json({
    lowStock,
    outOfStock,
    inventoryValue,
    stockByWarehouse,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');
    app.listen(PORT, () => {
      console.log(`ERP Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
