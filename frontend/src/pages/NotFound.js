import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>Page Not Found</h1>
        <p style={styles.subtitle}>
          Oops! The page you're looking for doesn't exist or may have been moved.
        </p>
        <div style={styles.actions}>
          <Link to="/" style={styles.primaryBtn}>🏠 Go to Home</Link>
          <Link to="/products" style={styles.secondaryBtn}>🛍️ Browse Products</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf6ef',
    padding: '40px 20px'
  },
  card: {
    textAlign: 'center',
    backgroundColor: 'white',
    borderRadius: '24px',
    padding: '60px 48px',
    boxShadow: '0 20px 60px rgba(34,24,17,0.1)',
    border: '1px solid #efe0d1',
    maxWidth: '480px',
    width: '100%'
  },
  code: {
    fontSize: '96px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #0e7a6d, #c66f2f)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1,
    marginBottom: '16px'
  },
  title: {
    fontSize: '28px',
    color: '#1a1a2e',
    fontFamily: 'Playfair Display, serif',
    margin: '0 0 12px'
  },
  subtitle: {
    fontSize: '15px',
    color: '#777',
    lineHeight: 1.6,
    margin: '0 0 32px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryBtn: {
    backgroundColor: '#0e7a6d',
    color: 'white',
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 8px 20px rgba(14,122,109,0.25)',
    transition: 'transform 0.2s'
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    color: '#0e7a6d',
    textDecoration: 'none',
    padding: '12px 24px',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: '2px solid #0e7a6d',
    transition: 'transform 0.2s'
  }
};

export default NotFound;
