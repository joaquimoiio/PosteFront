import { useState, useMemo } from 'react';
import {
  Edit, Trash2, Plus, ShoppingCart, DollarSign,
  TrendingUp, Search, X, SlidersHorizontal,
} from 'lucide-react';
import { useVendas } from '../../hooks/useVendas';
import { usePostes } from '../../hooks/usePostes';
import { useAlert } from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import VendaForm from '../../components/forms/VendaForm';
import {
  formatDate,
  formatCurrency,
  getMetodoPagamentoLabel,
  getTipoVendaLabel,
} from '../../utils/formatters';
import { METODOS_PAGAMENTO, TENANT_LABELS } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

const TIPO_BADGE = {
  V: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  E: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  L: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

export default function Vendas() {
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [metodoPgto, setMetodoPgto] = useState('');
  const [busca, setBusca] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState(null);
  const [saving, setSaving] = useState(false);

  const showAlert = useAlert();

  const params = useMemo(
    () => ({ dataInicio, dataFim }),
    [dataInicio, dataFim]
  );

  const { data: vendas, loading, error, refetch, criar, atualizar, deletar } = useVendas(params);
  const { data: postes } = usePostes();

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
    if (valorMin) lista = lista.filter(v => (parseFloat(v.valorVenda) || 0) >= parseFloat(valorMin));
    if (valorMax) lista = lista.filter(v => (parseFloat(v.valorVenda) || 0) <= parseFloat(valorMax));
    return lista;
  }, [vendas, tipoFiltro, metodoPgto, busca, valorMin, valorMax]);

  const totalValorVenda = useMemo(
    () => vendasFiltradas.reduce((acc, v) => acc + (parseFloat(v.valorVenda) || 0), 0),
    [vendasFiltradas]
  );
  const totalExtra = useMemo(
    () => vendasFiltradas.reduce((acc, v) => acc + (parseFloat(v.valorExtra) || 0), 0),
    [vendasFiltradas]
  );
  const totalFrete = useMemo(
    () => vendasFiltradas.reduce((acc, v) => acc + (parseFloat(v.freteEletrons) || 0), 0),
    [vendasFiltradas]
  );
  const totalGeral = totalValorVenda + totalExtra + totalFrete;

  const filtrosAtivos = [tipoFiltro, metodoPgto, busca, valorMin, valorMax].filter(Boolean).length;

  function limparFiltros() {
    setTipoFiltro('');
    setMetodoPgto('');
    setBusca('');
    setValorMin('');
    setValorMax('');
  }

  function handleNovaVenda() { setEditingVenda(null); setModalOpen(true); }
  function handleEditar(v) { setEditingVenda(v); setModalOpen(true); }
  function handleFecharModal() { setModalOpen(false); setEditingVenda(null); }

  async function handleDeletar(venda) {
    if (!window.confirm(`Deseja realmente excluir esta venda de ${formatDate(venda.dataVenda, true)}?`)) return;
    try {
      await deletar(venda.id);
      showAlert('Venda excluída com sucesso.', 'success');
    } catch (e) {
      showAlert(`Erro ao excluir: ${e.message}`, 'error');
    }
  }

  async function handleSubmit(dto) {
    setSaving(true);
    try {
      if (editingVenda) {
        await atualizar(editingVenda.id, dto);
        showAlert('Venda atualizada com sucesso.', 'success');
      } else {
        await criar(dto);
        showAlert('Venda registrada com sucesso.', 'success');
      }
      handleFecharModal();
    } catch (e) {
      showAlert(`Erro ao salvar: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
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
      render: (val, row) => val ? (
        <div className="min-w-0">
          <span className="font-mono font-semibold text-xs text-gray-800 dark:text-gray-100">{val}</span>
          {row.descricaoPoste && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {row.descricaoPoste}
            </p>
          )}
        </div>
      ) : '-',
    },
    {
      key: 'quantidade',
      label: 'Qtd',
      render: (val) => val ?? '-',
    },
    {
      key: 'valorVenda',
      label: 'Valor',
      sortable: true,
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
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{getMetodoPagamentoLabel(val)}</span>
      ),
    },
    {
      key: 'observacoes',
      label: 'Obs',
      render: (val) => val ? (
        <span className="text-xs text-gray-500 dark:text-gray-400">{val}</span>
      ) : '-',
    },
    {
      key: 'acoes',
      label: '',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleEditar(row)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit size={15} />
          </button>
          <button
            onClick={() => handleDeletar(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Vendas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{TENANT_LABELS[user?.tenant] || 'Caminhão Vermelho'}</p>
        </div>
        <Button onClick={handleNovaVenda} className="shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Nova Venda</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="panel">
        {/* Cabeçalho dos filtros */}
        <div className="flex items-center justify-between p-4 border-b border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filtros</span>
            {filtrosAtivos > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                {filtrosAtivos}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filtrosAtivos > 0 && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={12} />
                Limpar
              </button>
            )}
            <button
              onClick={() => setShowFiltros(f => !f)}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium"
            >
              {showFiltros ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Período */}
          <DateRangeFilter
            start={dataInicio}
            end={dataFim}
            onStartChange={setDataInicio}
            onEndChange={setDataFim}
          />

          {/* Filtros expandidos */}
          {showFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-gray-50 dark:border-gray-700">
              {/* Busca */}
              <div className="relative">
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

              {/* Tipo */}
              <div>
                <label className="label">Tipo de Venda</label>
                <select className="input" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                  <option value="">Todos os tipos</option>
                  <option value="V">Venda Normal</option>
                  <option value="E">Extra</option>
                  <option value="L">Venda Loja</option>
                </select>
              </div>

              {/* Método pagamento */}
              <div>
                <label className="label">Pagamento</label>
                <select className="input" value={metodoPgto} onChange={e => setMetodoPgto(e.target.value)}>
                  <option value="">Todos os métodos</option>
                  {METODOS_PAGAMENTO.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Faixa de valor */}
              <div>
                <label className="label">Valor Venda — de</label>
                <input
                  type="number"
                  placeholder="R$ mínimo"
                  className="input"
                  value={valorMin}
                  min="0"
                  onChange={e => setValorMin(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Valor Venda — até</label>
                <input
                  type="number"
                  placeholder="R$ máximo"
                  className="input"
                  value={valorMax}
                  min="0"
                  onChange={e => setValorMax(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {vendasFiltradas.length} venda{vendasFiltradas.length !== 1 ? 's' : ''}
            {filtrosAtivos > 0 && <span className="text-gray-400 font-normal"> (filtrado)</span>}
          </span>
          {vendasFiltradas.length > 0 && (
            <span className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-800">{formatCurrency(totalGeral)}</span>
            </span>
          )}
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingSpinner text="Carregando vendas..." />
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <DataTable
              columns={columns}
              data={vendasFiltradas}
              emptyMessage="Nenhuma venda encontrada."
              mobileTitle="dataVenda"
              mobileSub="codigoPoste"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleFecharModal}
        title={editingVenda ? 'Editar Venda' : 'Nova Venda'}
        size="lg"
      >
        <VendaForm
          postes={postes}
          initialData={editingVenda}
          onSubmit={handleSubmit}
          onCancel={handleFecharModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
