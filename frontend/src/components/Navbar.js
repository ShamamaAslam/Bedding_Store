import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SearchBar from './SearchBar';

const Navbar = () => {
  const publicUrl = process.env.PUBLIC_URL || '';
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 18);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  const overlayMode = location.pathname === '/' && !scrolled;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navStyle = {
    ...styles.nav,
    ...(overlayMode ? styles.navOverlay : styles.navSolid)
  };

  return (
    <nav style={navStyle}>
      <Link to="/" style={styles.brand} className="premium-link" aria-label="Wajahat Fabrics Home">
        <div style={styles.brandLogoShell}>
          <img src={`${publicUrl}/brand-logo.png`} alt="Wajahat Fabrics" style={styles.brandLogo} />
        </div>
        <div style={styles.brandTextWrap}>
          <span style={styles.brandTitle}>Wajahat Fabrics</span>
          <span style={styles.brandSub}>And Bedding Store</span>
        </div>
      </Link>

      <SearchBar />

      <div style={styles.links}>
        <Link to="/products" style={styles.link} className="premium-link">Products</Link>

        {user && (
          <>
            <Link to="/wishlist" style={styles.link} className="premium-link">♡ Wishlist</Link>
            <Link to="/profile" style={styles.link} className="premium-link">My Orders</Link>
          </>
        )}

        {/* Cart */}
        <Link to="/cart" style={styles.cartBtn} className="premium-button">
          Cart
          {totalItems > 0 && <span style={styles.badge}>{totalItems}</span>}
        </Link>

        {user ? (
          <>
            <span style={styles.username}>Hi, {user.name?.split(' ')[0]}</span>
            {user.role === 'admin' && (
              <Link to="/admin" style={styles.adminBtn} className="premium-button">⚙️ Admin</Link>
            )}
            <button style={styles.logoutBtn} className="premium-button" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link} className="premium-link">Login</Link>
            <Link to="/register" style={styles.registerBtn} className="premium-button">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '18px',
    padding: '12px clamp(14px, 3.5vw, 34px)',
    minHeight: '92px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    transition: 'background-color 260ms ease, box-shadow 260ms ease, border-color 260ms ease',
    flexWrap: 'wrap'
  },
  navOverlay: {
    background: 'rgba(255, 252, 247, 0.18)',
    backdropFilter: 'blur(18px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: 'none'
  },
  navSolid: {
    background: 'rgba(255, 253, 248, 0.86)',
    backdropFilter: 'blur(18px)',
    borderBottom: '1px solid rgba(31, 26, 22, 0.08)',
    boxShadow: '0 12px 30px rgba(31, 26, 22, 0.08)'
  },
  brand: {
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.82), rgba(250,242,230,0.58))',
    border: '1px solid rgba(228, 215, 200, 0.7)',
    borderRadius: '18px',
    padding: '7px 12px 7px 8px',
    boxShadow: '0 10px 24px rgba(45, 33, 24, 0.08)'
  },
  brandLogoShell: {
    width: '66px',
    height: '66px',
    borderRadius: '12px',
    background: 'linear-gradient(160deg, #fffefb, #f4ebdf)',
    border: '1px solid #e7d8c6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center'
  },
  brandTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
    minWidth: 'max-content'
  },
  brandTitle: {
    fontFamily: 'Playfair Display, serif',
    fontSize: 'clamp(18px, 2.1vw, 28px)',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: '#16282d'
  },
  brandSub: {
    marginTop: '3px',
    fontSize: 'clamp(9px, 0.95vw, 12px)',
    textTransform: 'uppercase',
    letterSpacing: '3px',
    color: '#b27b3d',
    fontWeight: 700
  },
  links: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-end',
    marginLeft: 'auto'
  },
  link: { color: '#554a43', textDecoration: 'none', fontSize: '14px', padding: '7px 10px', borderRadius: '8px' },
  username: { color: '#74675f', fontSize: '13px', padding: '0 4px' },
  cartBtn: {
    position: 'relative',
    color: 'white',
    textDecoration: 'none',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    padding: '9px 16px',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 600
  },
  badge: {
    position: 'absolute', top: '-6px', right: '-6px',
    backgroundColor: '#f5bd7e', color: '#2c231d', borderRadius: '50%',
    width: '18px', height: '18px', fontSize: '11px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  adminBtn: {
    color: '#8f4e14',
    textDecoration: 'none',
    fontSize: '13px',
    padding: '8px 12px',
    border: '1px solid #d9a36f',
    borderRadius: '999px',
    backgroundColor: '#fff3e6'
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    color: '#675a52',
    border: '1px solid #c9b7aa',
    padding: '8px 14px',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '13px'
  },
  registerBtn: {
    background: 'linear-gradient(135deg, #ce7a36, #b05f22)',
    color: 'white',
    textDecoration: 'none',
    padding: '9px 16px',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 600
  }
};

export default Navbar;