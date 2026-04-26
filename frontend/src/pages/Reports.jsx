import { useState, useEffect } from 'react'
import { api } from '../api'
import { BarChart3, TrendingUp, Package, Users, ShoppingCart, DollarSign, FileText, Wallet } from 'lucide-react'

export default function Reports() {
  const [salesData, setSalesData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [financialData, setFinancialData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState('sales')

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    try {
      const [sales, inventory, financial] = await Promise.all([
        api.reports.sales(),
        api.reports.inventory(),
        api.reports.financial()
      ])
      setSalesData(sales)
      setInventoryData(inventory)
      setFinancialData(financial)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Rapports</h2>
        <button
          onClick={loadReports}
          className="px-4 py-2 text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Actualiser
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveReport('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeReport === 'sales' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingCart size={20} />
          Ventes
        </button>
        <button
          onClick={() => setActiveReport('inventory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeReport === 'inventory' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Package size={20} />
          Inventaire
        </button>
        <button
          onClick={() => setActiveReport('financial')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeReport === 'financial' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <DollarSign size={20} />
          Financier
        </button>
      </div>

      {activeReport === 'sales' && salesData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Commandes</p>
                  <p className="text-2xl font-bold text-gray-800">{salesData.total_orders || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ShoppingCart className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Revenus Totals</p>
                  <p className="text-2xl font-bold text-green-600">{(salesData.total_revenue || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Panier Moyen</p>
                  <p className="text-2xl font-bold text-purple-600">{(salesData.avg_order_value || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <BarChart3 className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Nouveaux Clients</p>
                  <p className="text-2xl font-bold text-orange-600">{salesData.new_customers || 0}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Users className="text-orange-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Commandes Récentes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Client</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Articles</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {salesData.recent_orders?.length > 0 ? (
                    salesData.recent_orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">#{order.id}</td>
                        <td className="px-6 py-4 text-gray-600">{order.customer_name || `Client #${order.customer_id}`}</td>
                        <td className="px-6 py-4 text-center text-gray-600">{order.total_items || 0}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800">{order.total_amount?.toLocaleString('fr-FR')} €</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Aucune commande récente</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'inventory' && inventoryData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Produits</p>
                  <p className="text-2xl font-bold text-gray-800">{inventoryData.total_products || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Stock Total</p>
                  <p className="text-2xl font-bold text-green-600">{inventoryData.total_stock || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Valeur Stock</p>
                  <p className="text-2xl font-bold text-purple-600">{(inventoryData.stock_value || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <DollarSign className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Stock Bas</p>
                  <p className="text-2xl font-bold text-red-600">{inventoryData.low_stock_count || 0}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Package className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Stock par Entrepôt</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Entrepôt</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Articles en Stock</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inventoryData.warehouse_stock?.length > 0 ? (
                    inventoryData.warehouse_stock.map((wh) => (
                      <tr key={wh.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{wh.name}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{wh.total_quantity || 0}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800">{(wh.stock_value || 0).toLocaleString('fr-FR')} €</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Aucune donnée d'entrepôt</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {inventoryData.low_stock_items?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 mt-6">
              <div className="p-6 border-b border-red-100 bg-red-50 rounded-t-xl">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  <Package size={20} />
                  Alertes Stock Bas
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-red-700">Produit</th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-red-700">Entrepôt</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-red-700">Stock Actuel</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-red-700">Stock Minimum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {inventoryData.low_stock_items.map((item) => (
                      <tr key={item.id} className="hover:bg-red-50/50">
                        <td className="px-6 py-4 font-medium text-gray-800">{item.product_name || `Produit #${item.product_id}`}</td>
                        <td className="px-6 py-4 text-center text-gray-600">{item.warehouse_name || `Entrepôt #${item.warehouse_id}`}</td>
                        <td className="px-6 py-4 text-right font-semibold text-red-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-gray-600">{item.min_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeReport === 'financial' && financialData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Revenus</p>
                  <p className="text-2xl font-bold text-green-600">{(financialData.total_revenue || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Dépenses</p>
                  <p className="text-2xl font-bold text-red-600">{(financialData.total_expenses || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Wallet className="text-red-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Bénéfice Net</p>
                  <p className="text-2xl font-bold text-blue-600">{(financialData.net_profit || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <DollarSign className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Montant Dû</p>
                  <p className="text-2xl font-bold text-orange-600">{(financialData.total_outstanding || 0).toLocaleString('fr-FR')} €</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <FileText className="text-orange-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Factures Récentes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">N°</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                      <th className="text-center px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {financialData.recent_invoices?.length > 0 ? (
                      financialData.recent_invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-800">#{inv.id}</td>
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Aucune facture</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Dernières Dépenses</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Catégorie</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Description</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {financialData.recent_expenses?.length > 0 ? (
                      financialData.recent_expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-600">{exp.category || '-'}</td>
                          <td className="px-6 py-4 text-gray-600">{exp.description}</td>
                          <td className="px-6 py-4 text-right font-semibold text-red-600">{exp.amount?.toLocaleString('fr-FR')} €</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-8 text-center text-gray-500">Aucune dépense</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}