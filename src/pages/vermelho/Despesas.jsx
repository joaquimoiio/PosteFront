import { useState, useMemo } from 'react';
import {
  Edit, Trash2, Plus, Wallet, Receipt, TrendingDown,
  Search, X, SlidersHorizontal,
} from 'lucide-react';
import { useDespesas } from '../../hooks/useDespesas';
import { useAlert } from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import DespesaForm from '../../components/forms/DespesaForm';
import {
  formatDate,
  formatCurrency,
  getTipoDespesaLabel,
} from '../../utils/formatters';

const TIPO_BADGE = {
  FUNCIONARIO: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  OUTRAS: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

export default function Despesas() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState(null);
  const [saving, setSaving] = useState(false);

  const showAlert = useAlert();

  const params = useMemo(
    () => ({ dataInicio, dataFim }),
    [dataInicio, dataFim]
  );

  const { data: despesas, loading, error, criar, atualizar, deletar } = useDespesas(params);

  const despesasFiltradas = useMemo(() => {
    let lista = despesas;
    if (tipoFiltro) lista = lista.filter(d => d.tipo === tipoFiltro);
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      lista = lista.filter(d => (d.descricao || '').toLowerCase().includes(q));
    }
    if (valorMin) lista = lista.filter(d => (parseFloat(d.valor) || 0) >= parseFloat(valorMin));
    if (valorMax) lista = lista.filter(d => (parseFloat(d.valor) || 0) <= parseFloat(valorMax));
    return lista;
  }, [despesas, tipoFiltro, busca, valorMin, valorMax]);

  const totalFuncionario = useMemo(
    () => despesas.filter(d => d.tipo === 'FUNCIONARIO').reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0),
    [despesas]
  );
  const totalOutras = useMemo(
    () => despesas.filter(d => d.tipo === 'OUTRAS').reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0),
    [despesas]
  );
  const totalFiltrado = useMemo(
    () => despesasFiltradas.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0),
    [despesasFiltradas]
  );

  const filtrosAtivos = [tipoFiltro, busca, valorMin, valorMax].filter(Boolean).length;

  function limparFiltros() {
    setTipoFiltro('');
    setBusca('');
    setValorMin('');
    setValorMax('');
  }

  function handleNovaDespesa() { setEditingDespesa(null); setModalOpen(true); }
  function handleEditar(d) { setEditingDespesa(d); setModalOpen(true); }
  function handleFecharModal() { setModalOpen(false); setEditingDespesa(null); }

  async function handleDeletar(despesa) {
    if (!window.confirm(`Deseja realmente excluir "${despesa.descricao}"?`)) return;
    try {
      await deletar(despesa.id);
      showAlert('Despesa excluída com sucesso.', 'success');
    } catch (e) {
      showAlert(`Erro ao excluir: ${e.message}`, 'error');
    }
  }

  async function handleSubmit(dto) {
    setSaving(true);
    try {
      if (editingDespesa) {
        await atualizar(editingDespesa.id, dto);
        showAlert('Despesa atualizada com sucesso.', 'success');
      } else {
        await criar(dto);
        showAlert('Despesa registrada com sucesso.', 'success');
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
      key: 'dataDespesa',
      label: 'Data',
      sortable: true,
      render: (val) => formatDate(val, true),
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIPO_BADGE[val] || 'bg-gray-100 text-gray-600'}`}>
          {getTipoDespesaLabel(val)}
        </span>
      ),
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (val) => <span className="text-sm text-gray-700 dark:text-gray-200">{val || '-'}</span>,
    },
    {
      key: 'valor',
      label: 'Valor',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(val)}</span>
      ),
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Despesas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Caminhão Vermelho</p>
        </div>
        <Button onClick={handleNovaDespesa} className="shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Nova Despesa</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="panel">
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
          <DateRangeFilter
            start={dataInicio}
            end={dataFim}
            onStartChange={setDataInicio}
            onEndChange={setDataFim}
          />

          {showFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-50 dark:border-gray-700">
              {/* Busca por descrição */}
              <div className="sm:col-span-2">
                <label className="label">Buscar na descrição</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ex: gasolina, salário..."
                    className="input pl-8"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="FUNCIONARIO">Funcionário</option>
                  <option value="OUTRAS">Outras</option>
                </select>
              </div>

              {/* Faixa de valor */}
              <div>
                <label className="label">Valor mínimo</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  className="input"
                  value={valorMin}
                  min="0"
                  onChange={e => setValorMin(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Valor máximo</label>
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
            {despesasFiltradas.length} despesa{despesasFiltradas.length !== 1 ? 's' : ''}
            {filtrosAtivos > 0 && <span className="text-gray-400 font-normal"> (filtrado)</span>}
          </span>
          {despesasFiltradas.length > 0 && (
            <span className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(totalFiltrado)}</span>
            </span>
          )}
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingSpinner text="Carregando despesas..." />
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <DataTable
              columns={columns}
              data={despesasFiltradas}
              emptyMessage="Nenhuma despesa encontrada."
              mobileTitle="descricao"
              mobileSub="dataDespesa"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleFecharModal}
        title={editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
        size="md"
      >
        <DespesaForm
          initialData={editingDespesa}
          onSubmit={handleSubmit}
          onCancel={handleFecharModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
