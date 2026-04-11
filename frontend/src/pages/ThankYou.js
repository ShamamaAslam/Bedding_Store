import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const ThankYou = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state || {};

  const orderLabel = order.shortOrderId || 'Pending';
  const customerName = order.customerName || 'Valued Customer';
  const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount : null;
  const paymentMethod = order.paymentMethod || 'COD';

  return (
    <div style={styles.page}>
      <div style={styles.glowA} />
      <div style={styles.glowB} />

      <div style={styles.card}>
        <div style={styles.badge}>ORDER CONFIRMED</div>
        <h1 style={styles.title}>Thank You For Shopping</h1>
        <h2 style={styles.brand}>Wajahat Fabrics and Bedding Store</h2>

        <p style={styles.message}>
          Thank you, {customerName}. Your order has been placed successfully and is now being prepared.
        </p>

        <div style={styles.summary}>
          <div style={styles.row}><span>Order ID</span><strong>#{orderLabel}</strong></div>
          <div style={styles.row}><span>Payment Method</span><strong>{paymentMethod}</strong></div>
          <div style={styles.row}><span>Total</span><strong>{totalAmount !== null ? `Rs. ${totalAmount}` : 'Will be confirmed'}</strong></div>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.primaryBtn} onClick={() => navigate('/profile')}>Track My Order</button>
          <Link to="/products" style={styles.secondaryBtn}>Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    padding: '34px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, #fffaf2 0%, #f6ede2 54%, #efe2d3 100%)'
  },
  glowA: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,122,109,0.2), transparent 66%)',
    top: '-110px',
    left: '-80px'
  },
  glowB: {
    position: 'absolute',
    width: '360px',
    height: '360px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(198,111,47,0.24), transparent 62%)',
    bottom: '-100px',
    right: '-70px'
  },
  card: {
    width: 'min(720px, 100%)',
    position: 'relative',
    zIndex: 1,
    borderRadius: '26px',
    border: '1px solid rgba(170, 137, 108, 0.26)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,248,238,0.92))',
    boxShadow: '0 32px 70px rgba(58, 44, 32, 0.14)',
    padding: '28px 24px',
    textAlign: 'center'
  },
  badge: {
    display: 'inline-block',
    marginBottom: '14px',
    padding: '6px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1.2px',
    color: '#0d655a',
    backgroundColor: '#d6efe9'
  },
  title: {
    margin: '0 0 6px',
    fontFamily: 'Playfair Display, serif',
    color: '#1d1713',
    fontSize: 'clamp(32px, 5vw, 52px)',
    lineHeight: 1.05
  },
  brand: {
    margin: '0 0 12px',
    color: '#8f4e14',
    fontSize: 'clamp(20px, 3vw, 30px)',
    fontFamily: 'Cormorant Garamond, serif'
  },
  message: {
    margin: '0 auto 20px',
    color: '#5f5248',
    fontSize: '16px',
    maxWidth: '520px',
    lineHeight: 1.5
  },
  summary: {
    textAlign: 'left',
    borderRadius: '14px',
    border: '1px solid #e8d7c5',
    background: 'linear-gradient(180deg, #fffdf9, #f8efe4)',
    padding: '14px 14px',
    marginBottom: '18px'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    color: '#4d4138',
    borderBottom: '1px solid #f0e5d8'
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '10px'
  },
  primaryBtn: {
    border: 'none',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 14px 24px rgba(10,86,77,0.22)'
  },
  secondaryBtn: {
    textDecoration: 'none',
    border: '1px solid #e0c9b0',
    backgroundColor: '#fff7ed',
    color: '#8f4e14',
    padding: '12px 20px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '15px'
  }
};

export default ThankYou;
