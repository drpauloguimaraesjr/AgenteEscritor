import { useState } from 'react';
import { useStore } from '../store/index.js';

export default function Login() {
  const login = useStore(s => s.login);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const result = login(user, pass);
      if (!result.ok) setError(result.error || 'Credenciais inválidas');
      setLoading(false);
    }, 300);
  }

  return (
    <div className="login-root">
      <div className="login-bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <form className="login-card glass" onSubmit={handleSubmit}>
        <div className="login-icon">✍️</div>
        <h1>Creative Studio</h1>
        <p className="login-sub">Assistente IA para conteúdo médico</p>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label>Usuário</label>
          <input value={user} onChange={e => setUser(e.target.value)} placeholder="dr.paulo" autoComplete="username" required />
        </div>
        <div className="login-field">
          <label>Senha</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        </div>
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
