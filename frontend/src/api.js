const API_BASE = '/api'

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  customers: {
    list: () => fetchAPI('/customers'),
    create: (data) => fetchAPI('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/customers/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: () => fetchAPI('/products'),
    create: (data) => fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/products/${id}`, { method: 'DELETE' }),
  },
  orders: {
    list: () => fetchAPI('/orders'),
    create: (data) => fetchAPI('/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, status) => fetchAPI(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    get: (id) => fetchAPI(`/orders/${id}`),
  },
  reports: {
    sales: () => fetchAPI('/reports/sales'),
    financial: () => fetchAPI('/reports/financial'),
    inventory: () => fetchAPI('/reports/inventory'),
  },
  auth: {
    login: (data) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => fetchAPI('/auth/logout', { method: 'POST' }),
    me: () => fetchAPI('/auth/me'),
  },
  users: {
    list: () => fetchAPI('/users'),
    create: (data) => fetchAPI('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/users/${id}`, { method: 'DELETE' }),
  },
  permissions: {
    list: () => fetchAPI('/permissions'),
    update: (id, data) => fetchAPI(`/permissions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  activityLogs: {
    list: () => fetchAPI('/activity-logs'),
  },
  warehouses: {
    list: () => fetchAPI('/warehouses'),
    create: (data) => fetchAPI('/warehouses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/warehouses/${id}`, { method: 'DELETE' }),
  },
  inventory: {
    list: () => fetchAPI('/inventory'),
    create: (data) => fetchAPI('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    transfer: (data) => fetchAPI('/inventory/transfer', { method: 'POST', body: JSON.stringify(data) }),
    getByWarehouse: (warehouseId) => fetchAPI(`/inventory/warehouse/${warehouseId}`),
  },
  suppliers: {
    list: () => fetchAPI('/suppliers'),
    create: (data) => fetchAPI('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/suppliers/${id}`, { method: 'DELETE' }),
  },
  purchaseOrders: {
    list: () => fetchAPI('/purchase-orders'),
    create: (data) => fetchAPI('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, status) => fetchAPI(`/purchase-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    get: (id) => fetchAPI(`/purchase-orders/${id}`),
  },
  invoices: {
    list: () => fetchAPI('/invoices'),
    create: (data) => fetchAPI('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, status) => fetchAPI(`/invoices/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
    get: (id) => fetchAPI(`/invoices/${id}`),
  },
  payments: {
    list: () => fetchAPI('/payments'),
    create: (data) => fetchAPI('/payments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/payments/${id}`, { method: 'DELETE' }),
    getByInvoice: (invoiceId) => fetchAPI(`/payments/invoice/${invoiceId}`),
  },
  expenses: {
    list: () => fetchAPI('/expenses'),
    create: (data) => fetchAPI('/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => fetchAPI('/projects'),
    create: (data) => fetchAPI('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/projects/${id}`, { method: 'DELETE' }),
    get: (id) => fetchAPI(`/projects/${id}`),
  },
  projectTasks: {
    list: (projectId) => fetchAPI(`/project-tasks?project_id=${projectId || ''}`),
    create: (data) => fetchAPI('/project-tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/project-tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/project-tasks/${id}`, { method: 'DELETE' }),
  },
  timeLogs: {
    list: (taskId) => fetchAPI(`/time-logs${taskId ? `?task_id=${taskId}` : ''}`),
    create: (data) => fetchAPI('/time-logs', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetchAPI(`/time-logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchAPI(`/time-logs/${id}`, { method: 'DELETE' }),
  },
  alerts: {
    list: () => fetchAPI('/alerts'),
    markRead: (id) => fetchAPI(`/alerts/${id}/read`, { method: 'PUT' }),
    delete: (id) => fetchAPI(`/alerts/${id}`, { method: 'DELETE' }),
  },
}
