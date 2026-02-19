import { useState, useMemo } from 'react';
import {
  Edit, Trash2, Plus, Package, CheckCircle, XCircle,
  DollarSign, Search, X, SlidersHorizontal, BarChart2,
} from 'lucide-react';
import { usePostes } from '../../hooks/usePostes';
import { useAlert } from '../../components/common/Alert';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import PosteForm from '../../components/forms/PosteForm';
import { formatCurrency } from '../../utils/formatters';

export default function Postes() {
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');   // '' | 'ativo' | 'inativo'
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoste, setEditingPoste] = useState(null);
  const [saving, setSaving] = useState(false);

  const showAlert = useAlert();

  const { data: postes, loading, error, criar, atualizar, deletar } = usePostes();

  const postesFiltrados = useMemo(() => {
    let lista = postes;

    if (statusFiltro === 'ativo') lista = lista.filter(p => p.ativo !== false);
    if (statusFiltro === 'inativo') lista = lista.filter(p => p.ativo === false);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      lista = lista.filter(
        p =>
          (p.codigo || '').toLowerCase().includes(q) ||
          (p.descricao || '').toLowerCase().includes(q)
      );
    }

    if (precoMin) lista = lista.filter(p => (parseFloat(p.preco) || 0) >= parseFloat(precoMin));
    if (precoMax) lista = lista.filter(p => (parseFloat(p.preco) || 0) <= parseFloat(precoMax));

    return lista;
  }, [postes, search, statusFiltro, precoMin, precoMax]);

  const totalAtivos = useMemo(() => postes.filter(p => p.ativo !== false).length, [postes]);
  const totalInativos = useMemo(() => postes.filter(p => p.ativo === false).length, [postes]);
  const precoMedio = useMemo(() => {
    if (!postes.length) return 0;
    const soma = postes.reduce((acc, p) => acc + (parseFloat(p.preco) || 0), 0);
    return soma / postes.length;
  }, [postes]);
  const precoMaior = useMemo(
    () => postes.reduce((acc, p) => Math.max(acc, parseFloat(p.preco) || 0), 0),
    [postes]
  );

  const filtrosAtivos = [search, statusFiltro, precoMin, precoMax].filter(Boolean).length;

  function limparFiltros() {
    setSearch('');
    setStatusFiltro('');
    setPrecoMin('');
    setPrecoMax('');
  }

  function handleNovoPoste() { setEditingPoste(null); setModalOpen(true); }
  function handleEditar(p) { setEditingPoste(p); setModalOpen(true); }
  function handleFecharModal() { setModalOpen(false); setEditingPoste(null); }

  async function handleDeletar(poste) {
    if (!window.confirm(`Deseja realmente excluir o poste "${poste.codigo}"?`)) return;
    try {
      await deletar(poste.id);
      showAlert('Poste excluído com sucesso.', 'success');
    } catch (e) {
      showAlert(`Erro ao excluir: ${e.message}`, 'error');
    }
  }

  async function handleSubmit(dto) {
    setSaving(true);
    try {
      if (editingPoste) {
        await atualizar(editingPoste.id, dto);
        showAlert('Poste atualizado com sucesso.', 'success');
      } else {
        await criar(dto);
        showAlert('Poste cadastrado com sucesso.', 'success');
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
      key: 'codigo',
      label: 'Código',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-100 text-sm">{val}</span>
      ),
    },
    {
      key: 'descricao',
      label: 'Descrição',
      render: (val) => <span className="text-sm text-gray-600 dark:text-gray-300">{val || '-'}</span>,
    },
    {
      key: 'preco',
      label: 'Preço',
      sortable: true,
      render: (val) => (
        <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'ativo',
      label: 'Status',
      render: (val) =>
        val !== false ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle size={11} />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            <XCircle size={11} />
            Inativo
          </span>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Postes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Caminhão Vermelho</p>
        </div>
        <Button onClick={handleNovoPoste} className="shrink-0">
          <Plus size={16} />
          <span className="hidden sm:inline">Novo Poste</span>
          <span className="sm:hidden">Novo</span>
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

        <div className="p-4">
          {/* Busca sempre visível */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código ou descrição..."
              className="input pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filtros avançados */}
          {showFiltros && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              {/* Status */}
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2">
                  {[
                    { val: '', label: 'Todos' },
                    { val: 'ativo', label: 'Ativos' },
                    { val: 'inativo', label: 'Inativos' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setStatusFiltro(opt.val)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        statusFiltro === opt.val
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preço mínimo */}
              <div>
                <label className="label">Preço mínimo</label>
                <input
                  type="number"
                  placeholder="R$ 0,00"
                  className="input"
                  value={precoMin}
                  min="0"
                  onChange={e => setPrecoMin(e.target.value)}
                />
              </div>

              {/* Preço máximo */}
              <div>
                <label className="label">Preço máximo</label>
                <input
                  type="number"
                  placeholder={precoMaior ? `Até ${formatCurrency(precoMaior)}` : 'R$ máximo'}
                  className="input"
                  value={precoMax}
                  min="0"
                  onChange={e => setPrecoMax(e.target.value)}
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
            {postesFiltrados.length} poste{postesFiltrados.length !== 1 ? 's' : ''}
            {filtrosAtivos > 0 && <span className="text-gray-400 font-normal"> (filtrado)</span>}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <BarChart2 size={13} />
            <span>Maior: {formatCurrency(precoMaior)}</span>
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <LoadingSpinner text="Carregando postes..." />
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <DataTable
              columns={columns}
              data={postesFiltrados}
              emptyMessage="Nenhum poste encontrado."
              mobileTitle="codigo"
              mobileSub="descricao"
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={handleFecharModal}
        title={editingPoste ? 'Editar Poste' : 'Novo Poste'}
        size="md"
      >
        <PosteForm
          initialData={editingPoste}
          onSubmit={handleSubmit}
          onCancel={handleFecharModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
