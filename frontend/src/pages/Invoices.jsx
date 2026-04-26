import { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Search, FileText, Check, X, Eye } from 'lucide-react'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ order_id: '', due_date: '', notes: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [invData, custData, ordData] = await Promise.all([
        api.invoices.list(),
        api.customers.list(),
        api.orders.list()
      ])
      setInvoices(invData)
      setCustomers(custData)
      setOrders(ordData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvoice() {
    if (!formData.order_id) {
      alert('Sélectionnez une commande')
      return
    }
    try {
      await api.invoices.create(formData)
      setShowModal(false)
      setFormData({ order_id: '', due_date: '', notes: '' })
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.invoices.updateStatus(id, status)
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  function viewInvoice(invoice) {
    setSelectedInvoice(invoice)
    setShowDetailModal(true)
  }

  const filteredInvoices = invoices.filter(inv => {
    const customer = customers.find(c => c.id === inv.customer_id)
    const customerName = customer?.name?.toLowerCase() || ''
    return customerName.includes(searchTerm.toLowerCase()) || `#${inv.id}`.includes(searchTerm)
  })

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalDue = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Factures</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Créer une facture
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Total Factures</p>
          <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Montant Payé</p>
          <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Montant Dû</p>
          <p className="text-2xl font-bold text-orange-600">{totalDue.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Client</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Commande</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Échéance</th>
                <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Aucune facture trouvée</td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customer_id)
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">#{invoice.id}</td>
                      <td className="px-6 py-4 text-gray-600">{customer?.name || `Client #${invoice.customer_id}`}</td>
                      <td className="px-6 py-4 text-gray-600">#{invoice.order_id}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">{invoice.total_amount?.toLocaleString('fr-FR')} €</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewInvoice(invoice)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Voir détails"
                          >
                            <Eye size={18} />
                          </button>
                          {invoice.status !== 'paid' && (
                            <button
                              onClick={() => handleStatusChange(invoice.id, 'paid')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Marquer payée"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {invoice.status === 'sent' && (
                            <button
                              onClick={() => handleStatusChange(invoice.id, 'overdue')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Marquer échue"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Créer une facture
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commande</label>
                <select
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une commande</option>
                  {orders.map(o => {
                    const customer = customers.find(c => c.id === o.customer_id)
                    return (
                      <option key={o.id} value={o.id}>
                        #{o.id} - {customer?.name || `Client ${o.customer_id}`} - {o.total_amount?.toLocaleString('fr-FR')} €
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  placeholder="Notes optionnelles..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoice}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Facture #{selectedInvoice.id}
              </h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-gray-800">
                  {customers.find(c => c.id === selectedInvoice.customer_id)?.name || `Client #${selectedInvoice.customer_id}`}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Commande</span>
                <span className="font-medium text-gray-800">#{selectedInvoice.order_id}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Montant</span>
                <span className="font-bold text-xl text-gray-800">{selectedInvoice.total_amount?.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Statut</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                  selectedInvoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-500">Date d'échéance</span>
                <span className="font-medium text-gray-800">
                  {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('fr-FR') : '-'}
                </span>
              </div>
              {selectedInvoice.notes && (
                <div className="py-3">
                  <span className="text-gray-500 block mb-2">Notes</span>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{selectedInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              {selectedInvoice.status !== 'paid' && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedInvoice.id, 'paid')
                    setShowDetailModal(false)
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Marquer payée
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}