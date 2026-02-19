import { useEstoque } from '../../hooks/useEstoque';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Truck } from 'lucide-react';

export default function EstoqueBranco() {
  const { data, loading, error } = useEstoque();

  const brancoData = data.filter(e => e.tenantId === 'branco');

  function getStatusBadge(qtd) {
    if (qtd < 0)  return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Negativo</span>;
    if (qtd === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Zero</span>;
    if (qtd <= 5)  return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Baixo</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">OK</span>;
  }

  const columns = [
    { key: 'codigoPoste',    label: 'Código',      sortable: true },
    { key: 'descricaoPoste', label: 'Descrição',   sortable: true },
    { key: 'precoPoste',     label: 'Preço',       render: v => formatCurrency(v) },
    { key: 'quantidadeAtual',label: 'Quantidade',  sortable: true, render: v => <span className={`font-bold ${v < 0 ? 'text-red-600' : v === 0 ? 'text-gray-400' : 'text-gray-800'}`}>{v}</span> },
    { key: 'quantidadeAtual',label: 'Status',      render: v => getStatusBadge(v) },
    { key: 'dataAtualizacao',label: 'Atualizado',  render: v => formatDate(v) },
  ];

  const displayData = brancoData.length > 0 ? brancoData : data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Truck size={20} className="text-blue-700" /> Estoque Branco
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Itens do caminhão branco</p>
      </div>

      {loading && <LoadingSpinner />}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {!loading && <DataTable columns={columns} data={displayData} searchable emptyMessage="Nenhum item." />}
    </div>
  );
}
