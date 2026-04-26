import { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Edit2, Trash2, X, Search, Wallet, Receipt } from 'lucide-react'

export default function Accounting() {
  const [invoices, setInvoices] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('invoices')
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [invoiceForm, setInvoiceForm] = useState({ order_id: '', due_date: '', notes: '' })
  const [paymentForm, setPaymentForm] = useState({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference: '' })
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '', status: 'pending' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [invData, payData, expData, custData, ordData] = await Promise.all([
        api.invoices.list(),
        api.payments.list(),
        api.expenses.list(),
        api.customers.list(),
        api.orders.list()
      ])
      setInvoices(invData)
      setPayments(payData)
      setExpenses(expData)
      setCustomers(custData)
      setOrders(ordData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvoice() {
    if (!invoiceForm.order_id) {
      alert('Sélectionnez une commande')
      return
    }
    try {
      await api.invoices.create(invoiceForm)
      setShowInvoiceModal(false)
      setInvoiceForm({ order_id: '', due_date: '', notes: '' })
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleCreatePayment() {
    if (!paymentForm.invoice_id || !paymentForm.amount) {
      alert('Remplissez tous les champs requis')
      return
    }
    try {
      await api.payments.create(paymentForm)
      setShowPaymentModal(false)
      setPaymentForm({ invoice_id: '', amount: '', payment_method: 'bank_transfer', reference: '' })
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleCreateExpense(e) {
    e.preventDefault()
    if (!expenseForm.description || !expenseForm.amount) {
      setError('La description et le montant sont requis')
      return
    }
    try {
      await api.expenses.create(expenseForm)
      setShowExpenseModal(false)
      setExpenseForm({ category: '', description: '', amount: '', status: 'pending' })
      loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleInvoiceStatus(id, status) {
    try {
      await api.invoices.updateStatus(id, status)
      loadData()
    } catch (error) {
      alert(error.message)
    }
  }

  async function handleExpenseDelete(id) {
    if (confirm('Supprimer cette dépense ?')) {
      try {
        await api.expenses.delete(id)
        loadData()
      } catch (error) {
        alert(error.message)
      }
    }
  }

  async function handlePaymentDelete(id) {
    if (confirm('Supprimer ce paiement ?')) {
      try {
        await api.payments.delete(id)
        loadData()
      } catch (error) {
        alert(error.message)
      }
    }
  }

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalDue = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + (i.total_amount || 0), 0)

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Comptabilité</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Revenus encaissés</p>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Wallet className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Montant dû</p>
              <p className="text-2xl font-bold text-orange-600">{totalDue.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Receipt className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Dépenses approuvées</p>
              <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <Wallet className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'invoices' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Factures
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'payments' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Paiements
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'expenses' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Dépenses
        </button>
      </div>

      {activeTab === 'invoices' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              Nouvelle facture
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Client</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Commande</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Aucune facture</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">#{inv.id}</td>
                        <td className="px-6 py-4 text-gray-600">{inv.customer_name || `Client #${inv.customer_id}`}</td>
                        <td className="px-6 py-4 text-gray-600">#{inv.order_id}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800">{inv.total_amount?.toLocaleString('fr-FR')} €</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                            inv.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => handleInvoiceStatus(inv.id, 'paid')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg text-xs"
                              >
                                Marquer payée
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              Nouveau paiement
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Facture</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Méthode</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Référence</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">Aucun paiement</td>
                    </tr>
                  ) : (
                    payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">#{pay.id}</td>
                        <td className="px-6 py-4 text-gray-600">Facture #{pay.invoice_id}</td>
                        <td className="px-6 py-4 text-gray-600">{pay.payment_method || 'Virement'}</td>
                        <td className="px-6 py-4 text-gray-600">{pay.reference || '-'}</td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">{pay.amount?.toLocaleString('fr-FR')} €</td>
                        <td className="px-6 py-4 text-gray-600">{new Date(pay.payment_date || pay.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handlePaymentDelete(pay.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              <Plus size={20} />
              Nouvelle dépense
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Catégorie</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Aucune dépense</td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">{exp.category || '-'}</td>
                        <td className="px-6 py-4 text-gray-600">{exp.description}</td>
                        <td className="px-6 py-4 text-right font-semibold text-red-600">{exp.amount?.toLocaleString('fr-FR')} €</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            exp.status === 'approved' ? 'bg-green-100 text-green-800' :
                            exp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {exp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{new Date(exp.expense_date || exp.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleExpenseDelete(exp.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Nouvelle facture</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commande</label>
                <select
                  value={invoiceForm.order_id}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, order_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une commande</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>#{o.id} - {o.customer_name || `Client ${o.customer_id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
                <input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvoiceModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreateInvoice} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Créer</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Nouveau paiement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facture</label>
                <select
                  value={paymentForm.invoice_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoice_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une facture</option>
                  {invoices.filter(i => i.status !== 'paid').map(inv => (
                    <option key={inv.id} value={inv.id}>#{inv.id} - {inv.customer_name || `Client ${inv.customer_id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Méthode</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="cash">Espèces</option>
                  <option value="check">Chèque</option>
                  <option value="card">Carte bancaire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="N° transaction, chèque..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={handleCreatePayment} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Créer</button>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Nouvelle dépense</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    placeholder="Fournitures, Loisir, Transport..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}