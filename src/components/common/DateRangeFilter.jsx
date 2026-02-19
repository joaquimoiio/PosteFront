import { getCurrentDateInput } from '../../utils/formatters';

export default function DateRangeFilter({ start, end, onStartChange, onEndChange, onFilter, loading }) {
  const today = getCurrentDateInput();
  const firstOfMonth = today.slice(0, 7) + '-01';

  function setThisMonth() {
    onStartChange(firstOfMonth);
    onEndChange(today);
  }
  function setAll() {
    onStartChange('');
    onEndChange('');
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Data Início</label>
        <input
          type="date"
          className="input"
          value={start}
          onChange={e => onStartChange(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Data Fim</label>
        <input
          type="date"
          className="input"
          value={end}
          onChange={e => onEndChange(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={setThisMonth}
          className="px-3 py-2 text-sm font-medium
                     bg-gray-100 dark:bg-gray-700
                     text-gray-700 dark:text-gray-200
                     rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors"
        >
          Este mês
        </button>
        <button
          onClick={setAll}
          className="px-3 py-2 text-sm font-medium
                     bg-gray-100 dark:bg-gray-700
                     text-gray-700 dark:text-gray-200
                     rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600
                     transition-colors"
        >
          Todos
        </button>
        {onFilter && (
          <button
            onClick={onFilter}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
        )}
      </div>
    </div>
  );
}
