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
import { DollarSign, TrendingUp, Package, Users, Truck, Zap, ShoppingCart } from 'lucide-react';

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

  const totalExtras     = parseFloat(resumo?.valorTotalExtras || 0);
  const totalVendas     = parseFloat(resumo?.valorTotalVendas || 0);
  const totalFrete      = parseFloat(resumo?.totalFreteEletrons || 0);
  const custoPostes     = parseFloat(resumo?.totalVendaPostes || 0);

  const despFuncionario = despesas.filter(d => d.tipo === 'FUNCIONARIO').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const despOutras      = despesas.filter(d => d.tipo === 'OUTRAS').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const totalDespesas   = despFuncionario + despOutras;

  const lucroTotal = totalVendas + totalExtras + totalFrete - custoPostes - despOutras;

  const cicero    = lucroTotal * 0.50;
  const gilberto  = lucroTotal * 0.25 - despFuncionario * 0.5;
  const jefferson = lucroTotal * 0.25 - despFuncionario * 0.5;

  const postesAtivos = postes.filter(p => p.ativo !== false).length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{TENANT_LABELS[user?.tenant] || 'Caminhão Vermelho'}</p>
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
            <MetricCard label="Custo - Frete L" value={formatCurrency(totalFrete)}                icon={Zap}          color="purple" />
            <MetricCard label="Despesas"         value={formatCurrency(totalDespesas)}             icon={ShoppingCart} color="red" />
          </div>

          {/* Lucro líquido em destaque */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Lucro Líquido</p>
                <p className={`text-2xl font-bold ${lucroTotal >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(lucroTotal)}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-emerald-700 dark:text-emerald-500 space-y-0.5 shrink-0">
              <p>V: <span className="font-semibold">{resumo?.totalVendasV || 0}</span></p>
              <p>E: <span className="font-semibold">{resumo?.totalVendasE || 0}</span></p>
              <p>L: <span className="font-semibold">{resumo?.totalVendasL || 0}</span></p>
            </div>
          </div>

          {/* Distribuição de lucros */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={18} /> Distribuição de Lucros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { nome: 'Cicero',    valor: cicero,    pct: '50%' },
                { nome: 'Gilberto', valor: gilberto,  pct: '25%' },
                { nome: 'Jefferson',valor: jefferson, pct: '25%' },
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
              * Despesas de funcionário descontadas de Gilberto e Jefferson
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
