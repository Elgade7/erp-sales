import { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, X, Eye } from 'lucide-react'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [formData, setFormData] = useState({ customer_id: '', items: [{ product_id: '', quantity: 1 }] })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        api.orders.list(),
        api.customers.list(),
        api.products.list()
      ])
      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setFormData({ customer_id: '', items: [{ product_id: '', quantity: 1 }] })
    setError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setFormData({ customer_id: '', items: [{ product_id: '', quantity: 1 }] })
    setError('')
  }

  function addItem() {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1 }]
    })
  }

  function removeItem(index) {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  function updateItem(index, field, value) {
    const newItems = formData.items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: field === 'quantity' ? parseInt(value) || 0 : value }
      }
      return item
    })
    setFormData({ ...formData, items: newItems })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.customer_id) {
      setError('Sélectionnez un client')
      return
    }
    const validItems = formData.items.filter(item => item.product_id && item.quantity > 0)
    if (validItems.length === 0) {
      setError('Ajoutez au moins un produit')
      return
    }
    try {
      await api.orders.create({ customer_id: formData.customer_id, items: validItems })
      closeModal()
      loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.orders.updateStatus(id, status)
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  function viewOrder(order) {
    setSelectedOrder(order)
    setShowDetailModal(true)
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    pending: 'En attente',
    processing: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé'
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Commandes</h2>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Nouvelle commande
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Client</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Aucune commande</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">#{order.id}</td>
                    <td className="px-6 py-4 text-gray-600">{order.customer_name}</td>
                    <td className="px-6 py-4 text-gray-800 text-right font-medium">{order.total_amount.toLocaleString('fr-FR')} €</td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm border-0 focus:ring-2 focus:ring-primary-500 ${statusColors[order.status]}`}
                      >
                        <option value="pending">En attente</option>
                        <option value="processing">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewOrder(order)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Nouvelle commande</h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un client</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Produits</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Ajouter un produit
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Produit</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString('fr-FR')} €</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Qté"
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Créer la commande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Commande #{selectedOrder.id}</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-medium text-gray-800">{selectedOrder.customer_name}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500">Statut</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${statusColors[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-800">{new Date(selectedOrder.created_at).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Produits</p>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => {
                    const product = products.find(p => p.id === item.product_id)
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-800">{product?.name || `Produit #${item.product_id}`}</span>
                        <span className="text-gray-600">x{item.quantity} × {item.unit_price.toLocaleString('fr-FR')} €</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="font-bold text-xl text-primary-600">{selectedOrder.total_amount.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
