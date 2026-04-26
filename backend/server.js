const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, saveDatabase, getDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/customers', (req, res) => {
  const customers = getAll('SELECT * FROM customers ORDER BY created_at DESC');
  res.json(customers);
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, address } = req.body;
  try {
    const id = insertAndGetId('INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)', [name, email, phone, address]);
    res.json({ id, name, email, phone, address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;
  runQuery('UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?', [name, email, phone, address, id]);
  res.json({ id, name, email, phone, address });
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM customers WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/products', (req, res) => {
  const products = getAll('SELECT * FROM products ORDER BY created_at DESC');
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, description, price, stock } = req.body;
  const id = insertAndGetId('INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)', [name, description, price, stock]);
  res.json({ id, name, description, price, stock });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock } = req.body;
  runQuery('UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?', [name, description, price, stock, id]);
  res.json({ id, name, description, price, stock });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  runQuery('DELETE FROM products WHERE id = ?', [id]);
  res.json({ success: true });
});

app.get('/api/orders', (req, res) => {
  const orders = getAll(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
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
  const { customer_id, items } = req.body;

  const getCustomer = getOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
  if (!getCustomer) {
    return res.status(400).json({ error: 'Client non trouvé' });
  }

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

  const order_id = insertAndGetId('INSERT INTO orders (customer_id, total_amount, status) VALUES (?, ?, ?)', [customer_id, total_amount, 'pending']);

  for (const item of items) {
    const product = getOne('SELECT * FROM products WHERE id = ?', [item.product_id]);
    insertAndGetId('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)', [order_id, item.product_id, item.quantity, product.price]);
    runQuery('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
  }

  const order = getOne('SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.id = ?', [order_id]);
  const orderItems = getAll('SELECT * FROM order_items WHERE order_id = ?', [order_id]);

  res.json({ ...order, items: orderItems });
});

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  res.json({ success: true, status });
});

app.get('/api/reports/sales', (req, res) => {
  const totalRevenue = getOne('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"');
  const totalOrders = getOne('SELECT COUNT(*) as count FROM orders WHERE status != "cancelled"');
  const totalCustomers = getOne('SELECT COUNT(*) as count FROM customers');
  const totalProducts = getOne('SELECT COUNT(*) as count FROM products');

  const ordersByStatus = getAll(`
    SELECT status, COUNT(*) as count
    FROM orders
    GROUP BY status
  `);

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