import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import PrivateRoute from './components/layout/PrivateRoute';
import NavBar from './components/layout/NavBar';
import { Sun, Moon } from 'lucide-react';

import Login from './pages/Login';

import VDashboard  from './pages/vermelho/Dashboard';
import VVendas     from './pages/vermelho/Vendas';
import VDespesas   from './pages/vermelho/Despesas';
import VPostes     from './pages/vermelho/Postes';
import VRelatorios from './pages/vermelho/Relatorios';

import BDashboard  from './pages/branco/Dashboard';
import BVendas     from './pages/branco/Vendas';
import BDespesas   from './pages/branco/Despesas';
import BPostes     from './pages/branco/Postes';
import BRelatorios from './pages/branco/Relatorios';

import JDashboard   from './pages/jefferson/Dashboard';
import JConsolidado from './pages/jefferson/EstoqueConsolidado';
import JVermelho    from './pages/jefferson/EstoqueVermelho';
import JBranco      from './pages/jefferson/EstoqueBranco';

function TopBar() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-12
                       bg-white/95 dark:bg-gray-900/95 backdrop-blur-md
                       border-b border-gray-100 dark:border-gray-800
                       flex items-center justify-between px-4">
      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
        Sistema Postes
      </span>
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl text-gray-500 dark:text-gray-400
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Alternar tema"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <NavBar />
      {/* TopBar só no mobile */}
      <TopBar />
      <main className="flex-1 overflow-auto pt-16 pb-20 px-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route element={<PrivateRoute allowedTenants={['vermelho']} />}>
            <Route element={<AppLayout><VDashboard /></AppLayout>}  path="/vermelho/dashboard" />
            <Route element={<AppLayout><VVendas /></AppLayout>}     path="/vermelho/vendas" />
            <Route element={<AppLayout><VDespesas /></AppLayout>}   path="/vermelho/despesas" />
            <Route element={<AppLayout><VPostes /></AppLayout>}     path="/vermelho/postes" />
            <Route element={<AppLayout><VRelatorios /></AppLayout>} path="/vermelho/relatorios" />
          </Route>

          <Route element={<PrivateRoute allowedTenants={['branco']} />}>
            <Route element={<AppLayout><BDashboard /></AppLayout>}  path="/branco/dashboard" />
            <Route element={<AppLayout><BVendas /></AppLayout>}     path="/branco/vendas" />
            <Route element={<AppLayout><BDespesas /></AppLayout>}   path="/branco/despesas" />
            <Route element={<AppLayout><BPostes /></AppLayout>}     path="/branco/postes" />
            <Route element={<AppLayout><BRelatorios /></AppLayout>} path="/branco/relatorios" />
          </Route>

          <Route element={<PrivateRoute allowedTenants={['jefferson']} />}>
            <Route element={<AppLayout><JDashboard /></AppLayout>}   path="/jefferson/dashboard" />
            <Route element={<AppLayout><JConsolidado /></AppLayout>} path="/jefferson/estoque-consolidado" />
            <Route element={<AppLayout><JVermelho /></AppLayout>}    path="/jefferson/estoque-vermelho" />
            <Route element={<AppLayout><JBranco /></AppLayout>}      path="/jefferson/estoque-branco" />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
