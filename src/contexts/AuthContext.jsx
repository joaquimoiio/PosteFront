import { createContext, useContext, useState, useCallback } from 'react';
import { loginApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('poste-user');
    return stored ? JSON.parse(stored) : null;
  });

  // login chama o backend — retorna Promise
  const login = useCallback(async (tenantId, senha) => {
    const data = await loginApi(tenantId, senha); // throws on error
    const userData = {
      displayName: data.displayName,
      tenant: data.tenantId,
    };
    localStorage.setItem('poste-user', JSON.stringify(userData));
    localStorage.setItem('poste-tenant', data.tenantId);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('poste-user');
    localStorage.removeItem('poste-tenant');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
