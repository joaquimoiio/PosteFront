import { useState } from 'react';
import { useEstoque } from '../../hooks/useEstoque';
import { movimentosApi } from '../../api/movimentos';
import { useEffect } from 'react';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import { Package, TrendingDown, TrendingUp, AlertTriangle, Warehouse } from 'lucide-react';

export default function Dashboard() {
  const { data: estoque, stats, loading } = useEstoque({ consolidated: true });
  const [estatisticas, setEstatisticas]   = useState(null);

  useEffect(() => {
    movimentosApi.estatisticas({}).then(setEstatisticas).catch(() => {});
  }, []);

  const positivo  = estoque.filter(e => (e.quantidadeAtual || 0) > 5).length;
  const baixo     = estoque.filter(e => (e.quantidadeAtual || 0) > 0 && (e.quantidadeAtual || 0) <= 5).length;
  const zero      = estoque.filter(e => (e.quantidadeAtual || 0) === 0).length;
  const negativo  = estoque.filter(e => (e.quantidadeAtual || 0) < 0).length;
  const valorTotal = estoque.reduce((sum, e) => sum + (parseFloat(e.precoPoste || 0) * (e.quantidadeAtual || 0)), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Dashboard Consolidado</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral dos dois caminhões</p>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Tipos"     value={estoque.length} icon={Warehouse}      color="blue" />
            <StatCard label="Em Estoque (+5)" value={positivo}       icon={TrendingUp}     color="green" />
            <StatCard label="Estoque Baixo"   value={baixo}          icon={AlertTriangle}  color="yellow" />
            <StatCard label="Negativos"       value={negativo}       icon={TrendingDown}   color="red" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Zerados"         value={zero}                     icon={Package} color="gray" />
            <StatCard label="Valor Total"     value={formatCurrency(valorTotal)} icon={Package} color="blue" />
          </div>

          {/* Alertas */}
          {negativo > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle size={18} /> Itens com estoque negativo ({negativo})
              </h3>
              <div className="mt-2 space-y-1">
                {estoque.filter(e => (e.quantidadeAtual || 0) < 0).map(e => (
                  <p key={e.id} className="text-sm text-red-600">
                    {e.codigoPoste} — {e.descricaoPoste}: {e.quantidadeAtual} un.
                  </p>
                ))}
              </div>
            </div>
          )}

          {baixo > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-semibold text-yellow-700 flex items-center gap-2">
                <AlertTriangle size={18} /> Estoque baixo ({baixo})
              </h3>
              <div className="mt-2 space-y-1">
                {estoque.filter(e => (e.quantidadeAtual || 0) > 0 && (e.quantidadeAtual || 0) <= 5).map(e => (
                  <p key={e.id} className="text-sm text-yellow-700">
                    {e.codigoPoste} — {e.descricaoPoste}: {e.quantidadeAtual} un.
                  </p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
