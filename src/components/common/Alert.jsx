import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const showAlert = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), duration);
    }
    return id;
  }, []);

  const removeAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const icons = { success: CheckCircle, error: AlertCircle, warning: AlertCircle, info: Info };
  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200',
    error:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    info:    'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200',
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div className="fixed top-14 md:top-4 right-4 z-[60] space-y-2 w-80">
        {alerts.map(({ id, message, type }) => {
          const Icon = icons[type] || Info;
          return (
            <div key={id} className={`flex items-start gap-3 p-3 rounded-xl border shadow-lg ${colors[type]}`}>
              <Icon size={18} className="flex-shrink-0 mt-0.5" />
              <span className="flex-1 text-sm font-medium">{message}</span>
              <button onClick={() => removeAlert(id)} className="flex-shrink-0 opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx.showAlert;
}
