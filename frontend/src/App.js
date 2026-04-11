import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import AdminPanel from './pages/AdminPanel';
import Checkout from './pages/Checkout';
import ThankYou from './pages/ThankYou';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';

import Navbar from './components/Navbar';
import ChatAssistant from './components/ChatAssistant';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem('wf_intro_seen') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!showIntro) return;

    const timer = window.setTimeout(() => {
      setShowIntro(false);
      try {
        sessionStorage.setItem('wf_intro_seen', '1');
      } catch {
        // ignore storage failures
      }
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [showIntro]);

  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          <Router>
            {showIntro && (
              <div style={introStyles.overlay}>
                <div style={introStyles.glowA} />
                <div style={introStyles.glowB} />
                <div style={introStyles.panel}>
                  <div style={introStyles.logoShell}>
                    <img src="/brand-logo.png" alt="Wajahat Fabrics" style={introStyles.logo} />
                  </div>
                  <div style={introStyles.textBlock}>
                    <div style={introStyles.kicker}>Luxury Bedding & Home Textiles</div>
                    <div style={introStyles.title}>Wajahat Fabrics and bedding store</div>
                    <div style={introStyles.sub}>Curated comfort. Elevated style. Premium shopping.</div>
                  </div>
                  <div style={introStyles.loaderRow}>
                    <span style={introStyles.loaderDot} />
                    <span style={introStyles.loaderDot} />
                    <span style={introStyles.loaderDot} />
                  </div>
                </div>
              </div>
            )}
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/cart" element={<Cart />} />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/thank-you"
                element={
                  <ProtectedRoute>
                    <ThankYou />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
            </Routes>
            <ChatAssistant />
          </Router>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

const introStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 4000,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.96), rgba(247,240,229,0.98) 42%, rgba(236,226,210,0.98) 100%)',
    animation: 'wfIntroFadeOut 1.7s ease forwards'
  },
  glowA: {
    position: 'absolute',
    width: '520px',
    height: '520px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(14,122,109,0.22), transparent 65%)',
    top: '-120px',
    left: '-120px',
    animation: 'wfFloatA 5s ease-in-out infinite'
  },
  glowB: {
    position: 'absolute',
    width: '420px',
    height: '420px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(206,122,54,0.24), transparent 62%)',
    right: '-100px',
    bottom: '-120px',
    animation: 'wfFloatB 6s ease-in-out infinite'
  },
  panel: {
    position: 'relative',
    width: 'min(720px, calc(100vw - 32px))',
    padding: '26px 22px 22px',
    borderRadius: '28px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,249,241,0.92))',
    border: '1px solid rgba(138,112,89,0.16)',
    boxShadow: '0 30px 80px rgba(46, 35, 25, 0.16)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transform: 'translateY(0)',
    animation: 'wfIntroRise 1.7s ease forwards'
  },
  logoShell: {
    width: '128px',
    height: '128px',
    borderRadius: '26px',
    background: 'linear-gradient(180deg, #fffefb, #f4ebdf)',
    border: '1px solid rgba(138,112,89,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 32px rgba(0,0,0,0.08)',
    marginBottom: '18px',
    overflow: 'hidden'
  },
  logo: { width: '100%', height: '100%', objectFit: 'contain' },
  textBlock: { display: 'grid', gap: '8px' },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: '3px',
    fontSize: '11px',
    color: '#0e7a6d',
    fontWeight: 800
  },
  title: {
    fontFamily: 'Playfair Display, serif',
    fontSize: 'clamp(28px, 4.5vw, 54px)',
    lineHeight: 1.03,
    fontWeight: 800,
    color: '#172c31'
  },
  sub: {
    fontSize: 'clamp(14px, 2vw, 19px)',
    color: '#6e6056'
  },
  loaderRow: { display: 'flex', gap: '8px', marginTop: '18px' },
  loaderDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0e7a6d, #c66f2f)',
    animation: 'wfDotPulse 0.9s ease-in-out infinite'
  }
};

export default App;