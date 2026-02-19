import { useState, useMemo } from 'react';
import {
  FileDown, Search, ShoppingCart, Zap, Store, TrendingUp,
  TrendingDown, SlidersHorizontal, X, PieChart, Users,
} from 'lucide-react';
import { vendasApi } from '../../api/vendas';
import { despesasApi } from '../../api/despesas';
import { useAlert } from '../../components/common/Alert';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import {
  formatDate,
  formatCurrency,
  getMetodoPagamentoLabel,
  getTipoVendaLabel,
} from '../../utils/formatters';
import { METODOS_PAGAMENTO } from '../../utils/constants';

const TIPO_BADGE = {
  V: 'bg-blue-100 text-blue-700',
  E: 'bg-amber-100 text-amber-700',
  L: 'bg-emerald-100 text-emerald-700',
};

// Distribuição de lucro: Vermelho = Cicero 50%, Gilberto 25%, Jefferson 25%
const DISTRIBUICAO = [
  { nome: 'Cícero', pct: 0.50, cor: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
  { nome: 'Gilberto', pct: 0.25, cor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
  { nome: 'Jefferson', pct: 0.25, cor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' },
];

function exportCSV(vendas) {
  const header = ['Data', 'Tipo', 'Poste', 'Qtd', 'Valor Venda', 'Valor Extra', 'Frete', 'Pagamento', 'Obs'];
  const rows = vendas.map(v => [
    formatDate(v.dataVenda, true),
    getTipoVendaLabel(v.tipoVenda),
    v.codigoPoste || '-',
    v.quantidade || '-',
    v.valorVenda || 0,
    v.valorExtra || 0,
    v.freteEletrons || 0,
    getMetodoPagamentoLabel(v.metodoPagamento),
    `"${(v.observacoes || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-vermelho-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

export default function Relatorios() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [metodoPgto, setMetodoPgto] = useState('');
  const [busca, setBusca] = useState('');
  const [showFiltros, setShowFiltros] = useState(true);

  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerado, setGerado] = useState(false);

  const showAlert = useAlert();

  async function handleGerarRelatorio() {
    if (!dataInicio || !dataFim) {
      showAlert('Informe a data início e a data fim para gerar o relatório.', 'warning');
      return;
    }
    setLoading(true);
    setGerado(false);
    try {
      const [vResult, dResult] = await Promise.all([
        vendasApi.listar({ dataInicio, dataFim }),
        despesasApi.listar({ dataInicio, dataFim }),
      ]);
      setVendas(Array.isArray(vResult) ? vResult : []);
      setDespesas(Array.isArray(dResult) ? dResult : []);
      setGerado(true);
    } catch (e) {
      showAlert(`Erro ao carregar dados: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  const vendasFiltradas = useMemo(() => {
    let lista = vendas;
    if (tipoFiltro) lista = lista.filter(v => v.tipoVenda === tipoFiltro);
    if (metodoPgto) lista = lista.filter(v => (v.metodoPagamento || '') === metodoPgto);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(v =>
        (v.codigoPoste || '').toLowerCase().includes(q) ||
        (v.observacoes || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [vendas, tipoFiltro, metodoPgto, busca]);

  // Totais por tipo de venda
  const totalV = useMemo(
    () => vendasFiltradas.filter(v => v.tipoVenda === 'V').reduce((acc, v) => acc + (parseFloat(v.valorVenda) || 0), 0),
    [vendasFiltradas]
  );
  const totalE = useMemo(
    () => vendasFiltradas.filter(v => v.tipoVenda === 'E').reduce((acc, v) => acc + (parseFloat(v.valorExtra) || 0), 0),
    [vendasFiltradas]
  );
  const totalL = useMemo(
    () => vendasFiltradas.filter(v => v.tipoVenda === 'L').reduce((acc, v) => acc + (parseFloat(v.freteEletrons) || 0), 0),
    [vendasFiltradas]
  );
  const totalReceita = totalV + totalE + totalL;

  const totalDespesas = useMemo(
    () => despesas.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0),
    [despesas]
  );
  const lucroLiquido = totalReceita - totalDespesas;

  // Por método de pagamento (breakdown)
  const porMetodo = useMemo(() => {
    const mapa = {};
    vendasFiltradas.forEach(v => {
      const key = v.metodoPagamento || 'NAO_INFORMADO';
      if (!mapa[key]) mapa[key] = 0;
      mapa[key] += (parseFloat(v.valorVenda) || 0) + (parseFloat(v.valorExtra) || 0) + (parseFloat(v.freteEletrons) || 0);
    });
    return Object.entries(mapa)
      .map(([key, val]) => ({ metodo: getMetodoPagamentoLabel(key === 'NAO_INFORMADO' ? null : key), valor: val }))
      .sort((a, b) => b.valor - a.valor);
  }, [vendasFiltradas]);

  const filtrosAtivos = [tipoFiltro, metodoPgto, busca].filter(Boolean).length;

  function limparFiltros() {
    setTipoFiltro('');
    setMetodoPgto('');
    setBusca('');
  }

  const columns = [
    {
      key: 'dataVenda',
      label: 'Data',
      sortable: true,
      render: (val) => formatDate(val, true),
    },
    {
      key: 'tipoVenda',
      label: 'Tipo',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIPO_BADGE[val] || 'bg-gray-100 text-gray-700'}`}>
          {getTipoVendaLabel(val)}
        </span>
      ),
    },
    {
      key: 'codigoPoste',
      label: 'Poste',
      render: (val) => val || '-',
    },
    {
      key: 'quantidade',
      label: 'Qtd',
      render: (val) => val ?? '-',
    },
    {
      key: 'valorVenda',
      label: 'Valor',
      render: (val) => val != null ? formatCurrency(val) : '-',
    },
    {
      key: 'valorExtra',
      label: 'Extra',
      render: (val) => val != null ? formatCurrency(val) : '-',
    },
    {
      key: 'freteEletrons',
      label: 'Frete',
      render: (val) => val != null ? formatCurrency(val) : '-',
    },
    {
      key: 'metodoPagamento',
      label: 'Pagamento',
      render: (val) => (
        <span className="text-xs text-gray-600">{getMetodoPagamentoLabel(val)}</span>
      ),
    },
    {
      key: 'observacoes',
      label: 'Obs',
      render: (val) => val ? (
        <span className="text-xs text-gray-500" title={val}>
          {val.length > 30 ? val.slice(0, 30) + '…' : val}
        </span>
      ) : '-',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Caminhão Vermelho</p>
        </div>
        {gerado && vendasFiltradas.length > 0 && (
          <Button variant="secondary" onClick={() => exportCSV(vendasFiltradas)} className="shrink-0">
            <FileDown size={16} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        )}
      </div>

      {/* Filtros e geração */}
      <div className="panel">
        <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Parâmetros do Relatório</span>
            {filtrosAtivos > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                {filtrosAtivos}
              </span>
            )}
          </div>
          {filtrosAtivos > 0 && (
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Período */}
          <DateRangeFilter
            start={dataInicio}
            end={dataFim}
            onStartChange={setDataInicio}
            onEndChange={setDataFim}
          />

          {/* Filtros secundários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tipo */}
            <div>
              <label className="label">Tipo de Venda</label>
              <select className="input" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="V">Venda Normal (V)</option>
                <option value="E">Extra (E)</option>
                <option value="L">Venda Loja (L)</option>
              </select>
            </div>

            {/* Método pagamento */}
            <div>
              <label className="label">Método de Pagamento</label>
              <select className="input" value={metodoPgto} onChange={e => setMetodoPgto(e.target.value)}>
                <option value="">Todos os métodos</option>
                {METODOS_PAGAMENTO.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Busca */}
            <div>
              <label className="label">Busca</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Poste ou observação..."
                  className="input pl-8"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Botão */}
          <div className="flex justify-end">
            <Button onClick={handleGerarRelatorio} loading={loading}>
              <Search size={16} />
              Gerar Relatório
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      {gerado && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Registros"
              value={vendasFiltradas.length.toString()}
              icon={TrendingUp}
              color="blue"
              sub="vendas"
            />
            <StatCard
              label="Vendas (V)"
              value={formatCurrency(totalV)}
              icon={ShoppingCart}
              color="blue"
            />
            <StatCard
              label="Extras (E)"
              value={formatCurrency(totalE)}
              icon={Zap}
              color="yellow"
            />
            <StatCard
              label="Loja (L)"
              value={formatCurrency(totalL)}
              icon={Store}
              color="green"
            />
          </div>

          {/* Receita vs Despesas vs Lucro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Receita Total"
              value={formatCurrency(totalReceita)}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Despesas"
              value={formatCurrency(totalDespesas)}
              icon={TrendingDown}
              color="red"
            />
            <StatCard
              label="Lucro Líquido"
              value={formatCurrency(lucroLiquido)}
              icon={PieChart}
              color={lucroLiquido >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Distribuição de lucro */}
          {lucroLiquido > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Distribuição do Lucro Líquido</h2>
                <span className="text-xs text-gray-400">({formatCurrency(lucroLiquido)})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DISTRIBUICAO.map(d => (
                  <div key={d.nome} className={`border rounded-xl p-4 ${d.bg}`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{d.nome}</p>
                    <p className={`text-xl font-bold mt-1 ${d.cor}`}>
                      {formatCurrency(lucroLiquido * d.pct)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{(d.pct * 100).toFixed(0)}% do lucro</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown por pagamento */}
          {porMetodo.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Receita por Método de Pagamento</h2>
              </div>
              <div className="space-y-2">
                {porMetodo.map(item => (
                  <div key={item.metodo} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-36 shrink-0">{item.metodo}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${totalReceita > 0 ? (item.valor / totalReceita) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 w-28 text-right shrink-0">
                      {formatCurrency(item.valor)}
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right shrink-0">
                      {totalReceita > 0 ? ((item.valor / totalReceita) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabela de resultados */}
      {loading ? (
        <div className="card p-8">
          <LoadingSpinner text="Gerando relatório..." />
        </div>
      ) : gerado ? (
        <div className="panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {vendasFiltradas.length} registro{vendasFiltradas.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Receita: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalReceita)}</span>
            </span>
          </div>
          <div className="p-4">
            <DataTable
              columns={columns}
              data={vendasFiltradas}
              emptyMessage="Nenhuma venda encontrada para os filtros selecionados."
              mobileTitle="dataVenda"
              mobileSub="codigoPoste"
            />
          </div>
        </div>
      ) : (
        <div className="card p-12 flex flex-col items-center gap-3 text-gray-300 dark:text-gray-600">
          <Search size={48} />
          <p className="text-sm text-center text-gray-400">
            Selecione o período e clique em <strong>Gerar Relatório</strong>
          </p>
        </div>
      )}
    </div>
  );
}
