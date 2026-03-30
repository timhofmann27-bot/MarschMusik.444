import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

function formatApiError(detail) {
  if (detail == null) return 'Etwas ist schiefgelaufen.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hf-bg relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-hf-bg via-hf-surface to-hf-bg" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url('https://images.pexels.com/photos/12197169/pexels-photo-12197169.jpeg')`,
        backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)',
      }} />
      <div className="absolute inset-0 bg-hf-bg/70" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="444HF" className="w-20 h-20 mx-auto rounded-2xl mb-4 shadow-lg shadow-hf-gold/20" />
          <h1 className="text-3xl font-bold text-white tracking-tight">444.HEIMAT-FUNK</h1>
          <p className="text-hf-text-muted text-sm mt-1">Deine private Musikwelt</p>
        </div>

        {/* Form Card */}
        <div className="bg-hf-surface/80 backdrop-blur-xl border border-hf-border rounded-2xl p-8">
          {/* Toggle */}
          <div className="flex mb-6 bg-hf-bg rounded-full p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                isLogin ? 'bg-hf-gold text-hf-bg' : 'text-hf-text-muted hover:text-white'
              }`}
              data-testid="auth-tab-login"
            >
              Anmelden
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                !isLogin ? 'bg-hf-gold text-hf-bg' : 'text-hf-text-muted hover:text-white'
              }`}
              data-testid="auth-tab-register"
            >
              Registrieren
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm" data-testid="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-hf-text-muted mb-2">Benutzername</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none transition-all"
                  placeholder="Dein Benutzername"
                  required={!isLogin}
                  data-testid="auth-username-input"
                />
              </div>
            )}
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-hf-text-muted mb-2">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none transition-all"
                placeholder="deine@email.de"
                required
                data-testid="auth-email-input"
              />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-hf-text-muted mb-2">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-hf-bg border border-hf-border rounded-xl px-4 py-3 text-white placeholder-hf-text-muted/50 focus:border-hf-gold focus:ring-1 focus:ring-hf-gold outline-none transition-all"
                placeholder="Mindestens 6 Zeichen"
                required
                data-testid="auth-password-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-hf-gold hover:bg-hf-gold-hover text-hf-bg font-bold py-3 rounded-full transition-all duration-300 disabled:opacity-50 mt-2"
              data-testid="auth-submit-button"
            >
              {loading ? 'Laden...' : isLogin ? 'Anmelden' : 'Registrieren'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
