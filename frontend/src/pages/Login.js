import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginUser({ email, password });
      if (res.data.success) {
        login(res.data.user);
        navigate('/');
      } else {
        setError(res.data.message || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="premium-glass premium-card">
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Login to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              className="premium-input"
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              className="premium-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" style={styles.button} className="premium-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    background:
      'radial-gradient(circle at 16% 18%, rgba(14,122,109,0.22), transparent 34%), radial-gradient(circle at 86% 8%, rgba(217,92,65,0.2), transparent 36%), linear-gradient(170deg, #fffdf7 0%, #f3ebde 55%, #efe4d3 100%)',
    padding: '20px'
  },
  card: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,250,242,0.9))',
    backdropFilter: 'blur(10px)',
    padding: '40px',
    borderRadius: '28px',
    boxShadow: '0 30px 60px rgba(35, 26, 19, 0.16)',
    border: '1px solid rgba(214, 190, 165, 0.5)',
    width: '100%',
    maxWidth: '430px'
  },
  title: {
    fontSize: 'clamp(30px, 4.2vw, 42px)',
    fontFamily: 'Playfair Display, serif',
    color: '#1b2b2f',
    marginBottom: '8px',
    textAlign: 'center'
  },
  subtitle: {
    color: '#67584d',
    textAlign: 'center',
    marginBottom: '30px'
  },
  error: {
    backgroundColor: '#ffe9e7',
    color: '#7c2e25',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #efc5bf',
    marginBottom: '20px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontWeight: 700,
    color: '#473d36',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  input: {
    padding: '13px 14px',
    border: '1px solid #dbc7b2',
    borderRadius: '14px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'rgba(255,255,255,0.9)',
    transition: 'border-color 0.3s, box-shadow 0.3s'
  },
  button: {
    background: 'linear-gradient(135deg, #0f8c7d, #0b6358 56%, #b86224)',
    color: 'white',
    border: 'none',
    padding: '13px',
    borderRadius: '999px',
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 16px 28px rgba(15, 88, 79, 0.26)'
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    color: '#66564b'
  },
  link: {
    color: '#0f6e62',
    fontWeight: 700,
    textDecoration: 'none'
  }
};

export default Login;