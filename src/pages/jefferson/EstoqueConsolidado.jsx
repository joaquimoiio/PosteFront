import { useState } from 'react';
import { useEstoque } from '../../hooks/useEstoque';
import { usePostes } from '../../hooks/usePostes';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import EstoqueForm from '../../components/forms/EstoqueForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAlert } from '../../components/common/Alert';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Minus, Warehouse } from 'lucide-react';

export default function EstoqueConsolidado() {
  const showAlert = useAlert();
  const { data, loading, error, adicionar, remover } = useEstoque({ consolidated: true });
  const { data: postes } = usePostes();

  const [modalMode, setModalMode]   = useState(null); // 'adicionar' | 'remover'
  const [saving, setSaving]         = useState(false);

  const positivo  = data.filter(e => (e.quantidadeAtual || 0) > 5).length;
  const baixo     = data.filter(e => (e.quantidadeAtual || 0) > 0 && (e.quantidadeAtual || 0) <= 5).length;
  const zero      = data.filter(e => (e.quantidadeAtual || 0) === 0).length;
  const negativo  = data.filter(e => (e.quantidadeAtual || 0) < 0).length;

  async function handleEstoque(dto) {
    setSaving(true);
    try {
      if (modalMode === 'adicionar') {
        await adicionar(dto);
        showAlert('Estoque adicionado!', 'success');
      } else {
        await remover(dto);
        showAlert('Estoque removido!', 'success');
      }
      setModalMode(null);
    } catch (e) {
      showAlert(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(qtd) {
    if (qtd < 0)  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Negativo</span>;
    if (qtd === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Zero</span>;
    if (qtd <= 5)  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Baixo</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">OK</span>;
  }

  const columns = [
    { key: 'codigoPoste',    label: 'Código',      sortable: true },
    { key: 'descricaoPoste', label: 'Descrição',   sortable: true },
    { key: 'precoPoste',     label: 'Preço',       render: v => formatCurrency(v) },
    { key: 'quantidadeAtual',label: 'Quantidade',  sortable: true, render: v => <span className={`font-bold ${v < 0 ? 'text-red-600' : v === 0 ? 'text-gray-400' : 'text-gray-800'}`}>{v}</span> },
    { key: 'quantidadeAtual',label: 'Status',      render: v => getStatusBadge(v) },
    { key: 'dataAtualizacao',label: 'Atualizado',  render: v => formatDate(v) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Estoque Consolidado</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Todos os caminhões</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalMode('remover')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Minus size={16} /> Remover
          </button>
          <button
            onClick={() => setModalMode('adicionar')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'OK (>5)',   value: positivo, color: 'text-emerald-600' },
          { label: 'Baixo',     value: baixo,    color: 'text-yellow-600' },
          { label: 'Zerado',    value: zero,     color: 'text-gray-500' },
          { label: 'Negativo',  value: negativo, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && <DataTable columns={columns} data={data} searchable emptyMessage="Nenhum item no estoque." />}

      <Modal
        isOpen={!!modalMode}
        onClose={() => setModalMode(null)}
        title={modalMode === 'adicionar' ? 'Adicionar Estoque' : 'Remover Estoque'}
      >
        <EstoqueForm
          postes={postes}
          mode={modalMode || 'adicionar'}
          onSubmit={handleEstoque}
          onCancel={() => setModalMode(null)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
