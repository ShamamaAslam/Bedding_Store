import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      const res = await registerUser(userData);
      if (res.data.success) {
        login(res.data.user);
        navigate('/');
      } else {
        setError(res.data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="premium-glass premium-card">
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Join Wajahat Fabrics</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              className="premium-input"
              placeholder="Your Name"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              className="premium-input"
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
              className="premium-input"
              placeholder="0300-1234567"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              className="premium-input"
              placeholder="••••••••"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              style={styles.input}
              className="premium-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" style={styles.button} className="premium-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
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
      'radial-gradient(circle at 18% 14%, rgba(14,122,109,0.2), transparent 34%), radial-gradient(circle at 88% 8%, rgba(217,92,65,0.18), transparent 36%), linear-gradient(170deg, #fffdf7 0%, #f3ebde 55%, #efe4d3 100%)',
    padding: '20px'
  },
  card: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,250,242,0.9))',
    backdropFilter: 'blur(10px)',
    padding: '40px',
    borderRadius: '28px',
    boxShadow: '0 30px 60px rgba(35, 26, 19, 0.16)',
    border: '1px solid rgba(214, 190, 165, 0.5)',
    width: '100%',
    maxWidth: '470px'
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
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
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
    backgroundColor: 'rgba(255,255,255,0.9)'
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

export default Register;
