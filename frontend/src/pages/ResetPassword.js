import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { resettoken } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.put(`http://localhost:5000/api/auth/resetpassword/${resettoken}`, { password });
      setMessage(data.message || 'Password reset successful!');
      
      // Save the new token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Redirect to home/login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link might be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="premium-glass premium-card">
        <h2 style={styles.title}>Reset Password</h2>
        <p style={styles.subtitle}>
          Please enter your new password below.
        </p>

        {message && <div style={{...styles.error, backgroundColor: '#e7f7e7', color: '#135c13', borderColor: '#bfeac0'}}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              style={styles.input}
              className="premium-input"
              required
              minLength="6"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={styles.input}
              className="premium-input"
              required
              minLength="6"
            />
          </div>

          <button type="submit" style={styles.button} className="premium-button" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
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
  }
};

export default ResetPassword;
