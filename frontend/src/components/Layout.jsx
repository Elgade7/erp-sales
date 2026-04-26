import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Package, ShoppingCart, Warehouse, Truck, FileText, Wallet, FolderKanban, BarChart3 } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/customers', icon: Users, label: 'Clients' },
  { to: '/products', icon: Package, label: 'Produits' },
  { to: '/orders', icon: ShoppingCart, label: 'Commandes' },
  { to: '/users', icon: Users, label: 'Utilisateurs' },
  { to: '/inventory', icon: Warehouse, label: 'Inventaire' },
  { to: '/suppliers', icon: Truck, label: 'Fournisseurs' },
  { to: '/accounting', icon: Wallet, label: 'Comptabilité' },
  { to: '/projects', icon: FolderKanban, label: 'Projets' },
  { to: '/reports', icon: BarChart3, label: 'Rapports' },
  { to: '/invoices', icon: FileText, label: 'Factures' },
]

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-primary-800 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">ERP Sales</h1>
          <p className="text-primary-200 text-sm mt-1">Gestion des ventes</p>
        </div>
        <nav className="mt-6">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:bg-primary-700/50'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
