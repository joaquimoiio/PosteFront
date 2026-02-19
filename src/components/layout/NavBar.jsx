import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { TENANT_LABELS } from '../../utils/constants';
import {
  LayoutDashboard, ShoppingCart, Receipt, Package,
  BarChart2, Warehouse, LogOut, Truck, Sun, Moon,
} from 'lucide-react';

const NAV_ITEMS = {
  vermelho: [
    { to: '/vermelho/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/vermelho/vendas',     label: 'Vendas',     icon: ShoppingCart },
    { to: '/vermelho/despesas',   label: 'Despesas',   icon: Receipt },
    { to: '/vermelho/postes',     label: 'Postes',     icon: Package },
    { to: '/vermelho/relatorios', label: 'Relatórios', icon: BarChart2 },
  ],
  branco: [
    { to: '/branco/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/branco/vendas',     label: 'Vendas',     icon: ShoppingCart },
    { to: '/branco/despesas',   label: 'Despesas',   icon: Receipt },
    { to: '/branco/postes',     label: 'Postes',     icon: Package },
    { to: '/branco/relatorios', label: 'Relatórios', icon: BarChart2 },
  ],
  jefferson: [
    { to: '/jefferson/dashboard',           label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/jefferson/estoque-consolidado', label: 'Consolidado',icon: Warehouse },
    { to: '/jefferson/estoque-vermelho',    label: 'Vermelho',   icon: Truck },
    { to: '/jefferson/estoque-branco',      label: 'Branco',     icon: Truck },
  ],
};

const TENANT_THEME = {
  vermelho: {
    active: 'bg-red-600 text-white shadow-sm shadow-red-200',
    activeColor: 'text-red-600 dark:text-red-400',
    activeBg: 'bg-red-50 dark:bg-red-900/30',
    activeLine: 'bg-red-600',
    header: 'bg-red-600',
  },
  branco: {
    active: 'bg-blue-700 text-white shadow-sm shadow-blue-200',
    activeColor: 'text-blue-700 dark:text-blue-400',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30',
    activeLine: 'bg-blue-700',
    header: 'bg-blue-700',
  },
  jefferson: {
    active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
    activeColor: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    activeLine: 'bg-emerald-600',
    header: 'bg-emerald-600',
  },
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const tenant = user?.tenant || 'vermelho';
  const theme  = TENANT_THEME[tenant];
  const items  = NAV_ITEMS[tenant] || [];

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen
                        bg-white dark:bg-gray-900
                        border-r border-gray-100 dark:border-gray-800
                        flex-shrink-0">
        <div className={`${theme.header} p-4`}>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Sistema Postes</p>
          <p className="text-white font-bold text-base mt-1">{TENANT_LABELS[tenant]}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            <p className="text-white/70 text-xs">{user?.displayName}</p>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? theme.active
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-gray-100 dark:border-gray-800 mb-1 space-y-0.5">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-500 dark:text-gray-400
                       hover:bg-gray-50 dark:hover:bg-gray-800
                       hover:text-gray-800 dark:hover:text-gray-200
                       transition-all"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                       text-gray-400 dark:text-gray-500
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       hover:text-red-600 dark:hover:text-red-400
                       transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md
                        border-t border-gray-100 dark:border-gray-800
                        shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center pt-1 pb-1.5 text-[10px] font-semibold transition-all ${
                    isActive ? theme.activeColor : 'text-gray-400 dark:text-gray-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`h-0.5 w-8 rounded-full mb-1 transition-all ${
                      isActive ? theme.activeLine : 'bg-transparent'
                    }`} />
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? theme.activeBg : ''}`}>
                      <Icon size={20} />
                    </div>
                    <span className="leading-none mt-0.5 truncate max-w-full px-1">{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center pt-1 pb-1.5
                         text-[10px] font-semibold
                         text-gray-400 dark:text-gray-500
                         hover:text-red-500 transition-all"
            >
              <div className="h-0.5 w-8 rounded-full mb-1 bg-transparent" />
              <div className="p-1.5 rounded-xl">
                <LogOut size={20} />
              </div>
              <span className="leading-none mt-0.5">Sair</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
