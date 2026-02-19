import { useState } from 'react';
import { useResumoVendas } from '../../hooks/useVendas';
import { useDespesas } from '../../hooks/useDespesas';
import { usePostes } from '../../hooks/usePostes';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/common/StatCard';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, getCurrentDateInput } from '../../utils/formatters';
import { TENANT_LABELS } from '../../utils/constants';
import { DollarSign, Package, Users, Truck, Zap, ShoppingCart } from 'lucide-react';

const today = getCurrentDateInput();
const firstOfMonth = today.slice(0, 7) + '-01';

function MetricCard({ label, value, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: 'text-blue-500 dark:text-blue-400',     val: 'text-blue-700 dark:text-blue-300' },
    yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: 'text-yellow-500 dark:text-yellow-400', val: 'text-yellow-700 dark:text-yellow-300' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',       icon: 'text-red-500 dark:text-red-400',       val: 'text-red-700 dark:text-red-300' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-500 dark:text-purple-400', val: 'text-purple-700 dark:text-purple-300' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-500 dark:text-emerald-400', val: 'text-emerald-700 dark:text-emerald-300' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-col items-center text-center gap-2">
      <div className={`p-2.5 rounded-xl ${c.bg}`}>
        <Icon size={22} className={c.icon} />
      </div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
      <p className={`text-base sm:text-lg font-bold leading-tight ${c.val}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [start, setStart] = useState(firstOfMonth);
  const [end,   setEnd]   = useState(today);

  const params = { dataInicio: start || undefined, dataFim: end || undefined };
  const { data: resumo, loading: lr }    = useResumoVendas(params);
  const { data: despesas, loading: ld }  = useDespesas(params);
  const { data: postes }                 = usePostes();

  const loading = lr || ld;

  const totalExtras   = parseFloat(resumo?.valorTotalExtras || 0);
  const totalVendas   = parseFloat(resumo?.valorTotalVendas || 0);
  const totalFrete    = parseFloat(resumo?.totalFreteEletrons || 0);
  const custoPostes   = parseFloat(resumo?.totalVendaPostes || 0);

  const despFuncionario = despesas.filter(d => d.tipo === 'FUNCIONARIO').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const despOutras      = despesas.filter(d => d.tipo === 'OUTRAS').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const totalDespesas   = despFuncionario + despOutras;

  const custoFreteL = custoPostes - totalFrete;

  const lucroTotal = totalVendas + totalExtras + totalFrete - custoPostes - despOutras;

  // Branco: Gilberto 50% (sem desconto), Jefferson 50% (menos despesas de funcionário)
  const gilberto  = lucroTotal * 0.50;
  const jefferson = lucroTotal * 0.50 - despFuncionario;

  const postesAtivos = postes.filter(p => p.ativo !== false).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{TENANT_LABELS[user?.tenant] || 'Caminhão Branco'}</p>
        </div>
        <DateRangeFilter
          start={start} end={end}
          onStartChange={setStart} onEndChange={setEnd}
        />
      </div>

      {loading && <LoadingSpinner />}

      {!loading && (
        <>
          {/* 4 métricas — 2x2 mobile, 4 colunas desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Arrecadado"      value={formatCurrency(totalVendas + totalExtras)} icon={DollarSign}   color="blue" />
            <MetricCard label="Custo Eletrons"  value={formatCurrency(custoPostes)}               icon={Package}      color="yellow" />
            <MetricCard label="Custo - Frete L" value={formatCurrency(custoFreteL)}                icon={Zap}          color="purple" />
            <MetricCard label="Despesas"         value={formatCurrency(despOutras)}             icon={ShoppingCart} color="red" />
          </div>

          {/* Resumo de vendas por tipo */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Resumo de Vendas</h2>
            <div className="divide-y divide-gray-50 dark:divide-gray-700/60">
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">V</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Vendas Normais</span>
                  <span className="text-xs text-gray-400">({resumo?.totalVendasV || 0})</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalVendas)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">E</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Extras</span>
                  <span className="text-xs text-gray-400">({resumo?.totalVendasE || 0})</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalExtras)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">L</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Loja</span>
                  <span className="text-xs text-gray-400">({resumo?.totalVendasL || 0})</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalFrete)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 pb-1">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Total</span>
                <span className="text-base font-bold text-gray-900 dark:text-gray-50">{formatCurrency(totalVendas + totalExtras + totalFrete)}</span>
              </div>
            </div>
          </div>

          {/* Distribuição de lucros */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={18} /> Distribuição de Lucros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { nome: 'Gilberto', valor: gilberto,  pct: '50%' },
                { nome: 'Jefferson',valor: jefferson, pct: '50%' },
              ].map(({ nome, valor, pct }) => (
                <div key={nome} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{nome}</p>
                      <p className="text-xs text-gray-400">{pct} do lucro</p>
                    </div>
                    <span className={`text-lg font-bold ${valor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * Despesas de funcionário descontadas de Jefferson
            </p>
          </div>

          {/* Postes ativos + desp. funcionário */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Postes Ativos"    value={postesAtivos}                   icon={Package} color="gray" />
            <StatCard label="Desp. Funcionário" value={formatCurrency(despFuncionario)} icon={Truck}   color="red" />
          </div>
        </>
      )}
    </div>
  );
}
