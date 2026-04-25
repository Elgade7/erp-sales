import { useState, useEffect } from 'react'
import { api } from '../api'
import { DollarSign, Users, Package, ShoppingCart, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [])

  async function loadReport() {
    try {
      const data = await api.reports.sales()
      setReport(data)
    } catch (error) {
      console.error('Error loading report:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  const stats = [
    { label: 'Revenus totaux', value: `${(report?.summary?.totalRevenue || 0).toLocaleString('fr-FR')} €`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Commandes', value: report?.summary?.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Clients', value: report?.summary?.totalCustomers || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'Produits', value: report?.summary?.totalProducts || 0, icon: Package, color: 'bg-orange-500' },
  ]

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
              </div>
              <div className={`${color} p-3 rounded-lg`}>
                <Icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600" />
            Commandes récentes
          </h3>
          <div className="space-y-3">
            {report?.recentOrders?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune commande</p>
            ) : (
              report?.recentOrders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800">#{order.id} - {order.customer_name}</p>
                    <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{order.total_amount.toLocaleString('fr-FR')} €</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || statusColors.pending}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Produits</h3>
          <div className="space-y-3">
            {report?.topProducts?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune donnée</p>
            ) : (
              report?.topProducts?.map((product, idx) => (
                <div key={product.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{product.total_revenue.toLocaleString('fr-FR')} €</p>
                    <p className="text-sm text-gray-500">{product.total_sold} vendus</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
