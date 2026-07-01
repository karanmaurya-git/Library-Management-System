import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-icon-badge"><Library size={22} strokeWidth={1.8} /></div>
        <p className="login-brand">Stacks</p>
        <p className="login-tagline">Library management for your campus</p>

        {error && <div className="login-error"><AlertCircle size={15} strokeWidth={2} /> {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-hint" style={{ fontFamily: 'inherit', letterSpacing: 0, marginBottom: 14 }}>
          New here? <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Create a member account</Link>
        </div>

        <div className="login-hint">
          DEMO LOGINS<br />
          Librarian — admin@library.edu / admin123<br />
          Member — asha@student.edu / member123
        </div>
      </div>
    </div>
  );
}
