import { useState } from 'react';
import { useResumoVendas } from '../../hooks/useVendas';
import { useDespesas } from '../../hooks/useDespesas';
import { usePostes } from '../../hooks/usePostes';
import StatCard from '../../components/common/StatCard';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, getCurrentDateInput } from '../../utils/formatters';
import { DollarSign, TrendingUp, ShoppingCart, Package, Users, Truck } from 'lucide-react';

const today = getCurrentDateInput();
const firstOfMonth = today.slice(0, 7) + '-01';

export default function Dashboard() {
  const [start, setStart] = useState(firstOfMonth);
  const [end,   setEnd]   = useState(today);

  const params = { dataInicio: start || undefined, dataFim: end || undefined };
  const { data: resumo, loading: lr }    = useResumoVendas(params);
  const { data: despesas, loading: ld }  = useDespesas(params);
  const { data: postes }                 = usePostes();

  const loading = lr || ld;

  // Calcular totais
  const totalExtras     = parseFloat(resumo?.valorTotalExtras || 0);
  const totalVendas     = parseFloat(resumo?.valorTotalVendas || 0);
  const totalFrete      = parseFloat(resumo?.totalFreteEletrons || 0);
  const custoPostes     = parseFloat(resumo?.totalVendaPostes || 0);

  const despFuncionario = despesas.filter(d => d.tipo === 'FUNCIONARIO').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const despOutras      = despesas.filter(d => d.tipo === 'OUTRAS').reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const totalDespesas   = despFuncionario + despOutras;

  const lucroTotal = totalVendas + totalExtras + totalFrete - custoPostes - despOutras;

  // Distribuição lucro Vermelho: Cicero 50%, Gilberto 25%, Jefferson 25%
  const lucroBase = lucroTotal;
  const cicero    = lucroBase * 0.50;
  const gilberto  = lucroBase * 0.25 - despFuncionario * 0.5;
  const jefferson = lucroBase * 0.25 - despFuncionario * 0.5;

  const postesAtivos = postes.filter(p => p.ativo !== false).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Caminhão Vermelho</p>
        </div>
        <DateRangeFilter
          start={start} end={end}
          onStartChange={setStart} onEndChange={setEnd}
        />
      </div>

      {loading && <LoadingSpinner />}

      {!loading && (
        <>
          {/* Métricas principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Receita Total" value={formatCurrency(totalVendas + totalExtras + totalFrete)} icon={DollarSign} color="blue" />
            <StatCard label="Custo Postes"  value={formatCurrency(custoPostes)}  icon={Package}      color="yellow" />
            <StatCard label="Despesas"       value={formatCurrency(totalDespesas)} icon={ShoppingCart} color="red" />
            <StatCard label="Lucro Líquido"  value={formatCurrency(lucroTotal)}    icon={TrendingUp}   color="green" />
          </div>

          {/* Vendas por tipo */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Vendas Normais (V)" value={resumo?.totalVendasV || 0}   sub={formatCurrency(totalVendas)} color="blue" />
            <StatCard label="Extras (E)"          value={resumo?.totalVendasE || 0}   sub={formatCurrency(totalExtras)} color="yellow" />
            <StatCard label="Loja (L)"            value={resumo?.totalVendasL || 0}   sub={formatCurrency(totalFrete)}  color="purple" />
          </div>

          {/* Distribuição de lucros */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={18} /> Distribuição de Lucros
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { nome: 'Cicero',    valor: cicero,    pct: '50%' },
                { nome: 'Gilberto', valor: gilberto,  pct: '25%' },
                { nome: 'Jefferson',valor: jefferson, pct: '25%' },
              ].map(({ nome, valor, pct }) => (
                <div key={nome} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{nome}</p>
                      <p className="text-xs text-gray-400">{pct} do lucro</p>
                    </div>
                    <span className={`text-lg font-bold ${valor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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

          {/* Outros */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Postes Ativos"    value={postesAtivos}               icon={Package} color="gray" />
            <StatCard label="Desp. Funcionário" value={formatCurrency(despFuncionario)} icon={Truck} color="red" />
          </div>
        </>
      )}
    </div>
  );
}
