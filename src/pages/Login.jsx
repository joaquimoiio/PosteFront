import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

const REDIRECT = {
  vermelho:  '/vermelho/dashboard',
  branco:    '/branco/dashboard',
  jefferson: '/jefferson/dashboard',
};

const TENANTS = [
  {
    id: 'vermelho',
    label: 'Caminhão Vermelho',
    sub: 'Cicero',
    bg: 'bg-gradient-to-br from-red-500 to-red-700',
    bgHover: 'hover:from-red-400 hover:to-red-600',
    border: 'border-red-400',
    ring: 'ring-red-400',
    icon: '🚛',
  },
  {
    id: 'branco',
    label: 'Caminhão Branco',
    sub: 'Gilberto',
    bg: 'bg-gradient-to-br from-blue-600 to-blue-800',
    bgHover: 'hover:from-blue-500 hover:to-blue-700',
    border: 'border-blue-400',
    ring: 'ring-blue-400',
    icon: '🚚',
  },
  {
    id: 'jefferson',
    label: 'Jefferson',
    sub: 'Gerente',
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    bgHover: 'hover:from-emerald-400 hover:to-emerald-600',
    border: 'border-emerald-400',
    ring: 'ring-emerald-400',
    icon: '📊',
  },
];

export default function Login() {
  const { login, isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [senha, setSenha]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn && user) {
      navigate(REDIRECT[user.tenant] || '/', { replace: true });
    }
  }, [isLoggedIn, user, navigate]);

  useEffect(() => {
    if (selected) {
      setSenha('');
      setError('');
      setTimeout(() => passwordRef.current?.focus(), 300);
    }
  }, [selected]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || !senha) return;
    setError('');
    setLoading(true);
    try {
      const userData = await login(selected, senha);
      navigate(REDIRECT[userData.tenant] || '/');
    } catch (err) {
      setError(err.message);
      setSenha('');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  const tenant = TENANTS.find(t => t.id === selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚡</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Sistema Postes</h1>
        <p className="text-gray-400 mt-1 text-sm">Selecione seu acesso</p>
      </div>

      <div className="w-full max-w-sm">
        {/* STEP 1 — Seleção de tenant */}
        <div
          className={`transition-all duration-300 ${selected ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}
        >
          <div className="space-y-3">
            {TENANTS.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl ${t.bg} ${t.bgHover} text-white shadow-lg transition-all duration-200 active:scale-95 hover:scale-[1.02] hover:shadow-xl`}
              >
                <span className="text-4xl">{t.icon}</span>
                <div className="text-left">
                  <p className="font-bold text-lg leading-tight">{t.label}</p>
                  <p className="text-white/70 text-sm">{t.sub}</p>
                </div>
                <div className="ml-auto text-white/60 text-xl">›</div>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2 — Senha */}
        <div
          className={`transition-all duration-300 ${selected ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden pointer-events-none'}`}
        >
          {tenant && (
            <div className={`rounded-2xl ${tenant.bg} p-5 shadow-xl`}>
              {/* Header do tenant */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => { setSelected(null); setError(''); }}
                  className="text-white/80 hover:text-white transition-colors p-1"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className="text-3xl">{tenant.icon}</span>
                <div>
                  <p className="text-white font-bold">{tenant.label}</p>
                  <p className="text-white/70 text-xs">{tenant.sub}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={passwordRef}
                    type={showPass ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/25"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/30 border border-red-300/50 text-white text-sm rounded-xl px-4 py-2 text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !senha}
                  className="w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 active:scale-95 text-base border border-white/30"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Entrando...
                    </span>
                  ) : 'Entrar'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
