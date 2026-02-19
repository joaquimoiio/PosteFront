export default function StatCard({ label, value, sub, icon: Icon, color = 'blue', className = '' }) {
  const colors = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-700 dark:text-blue-400',    icon: 'text-blue-500 dark:text-blue-400' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-700 dark:text-red-400',      icon: 'text-red-500 dark:text-red-400' },
    green:   { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', icon: 'text-emerald-500 dark:text-emerald-400' },
    yellow:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20',   text: 'text-yellow-700 dark:text-yellow-400', icon: 'text-yellow-500 dark:text-yellow-400' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',   text: 'text-purple-700 dark:text-purple-400', icon: 'text-purple-500 dark:text-purple-400' },
    gray:    { bg: 'bg-gray-100 dark:bg-gray-700/50',      text: 'text-gray-700 dark:text-gray-300',    icon: 'text-gray-500 dark:text-gray-400' },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.text}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c.bg} flex-shrink-0 ml-3`}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  );
}
