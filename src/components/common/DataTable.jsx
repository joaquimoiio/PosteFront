import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  searchable = false,
  emptyMessage = 'Nenhum registro encontrado.',
  mobileTitle,
  mobileSub,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!searchable || !search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data, search, searchable]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const titleKey = mobileTitle || columns[0]?.key;
  const subKey   = mobileSub   || columns[1]?.key;
  const dataCols  = columns.filter(c => c.key !== 'acoes');
  const actionCol = columns.find(c => c.key === 'acoes');

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="input pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
              {columns.map(col => (
                <th
                  key={col.key + col.label}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300' : ''}`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/40 transition-colors">
                  {columns.map(col => (
                    <td key={col.key + col.label} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-2">
        {sorted.length === 0 ? (
          <div className="card text-center py-10 text-gray-400 dark:text-gray-500 text-sm">{emptyMessage}</div>
        ) : (
          sorted.map((row, i) => (
            <div key={row.id ?? i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {titleKey && (
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {columns.find(c => c.key === titleKey)?.render
                        ? columns.find(c => c.key === titleKey).render(row[titleKey], row)
                        : (row[titleKey] ?? '—')}
                    </div>
                  )}
                  {subKey && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {columns.find(c => c.key === subKey)?.render
                        ? columns.find(c => c.key === subKey).render(row[subKey], row)
                        : (row[subKey] ?? '—')}
                    </div>
                  )}
                </div>
                {actionCol && (
                  <div className="flex-shrink-0">{actionCol.render(row[actionCol.key], row)}</div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                {dataCols
                  .filter(c => c.key !== titleKey && c.key !== subKey)
                  .map(col => (
                    <div key={col.key + col.label}>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{col.label}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      {sorted.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right px-1">{sorted.length} registro(s)</p>
      )}
    </div>
  );
}
