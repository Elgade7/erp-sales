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
  },
  reports: {
    sales: () => fetchAPI('/reports/sales'),
  },
}
