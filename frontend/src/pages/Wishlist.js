import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getWishlist, removeFromWishlist } from '../services/api';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadWishlist();
  }, [user, navigate]);

  const loadWishlist = async () => {
    try {
      const res = await getWishlist();
      setWishlist(res.data.wishlist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setWishlist(prev => prev.filter(p => p._id !== productId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveToCart = (product) => {
    addToCart({ ...product, quantity: 1, selectedSize: product.sizes?.[0] || '', selectedColor: product.colors?.[0] || '' });
    handleRemove(product._id);
    setMsg('✅ Moved to cart!');
    setTimeout(() => setMsg(''), 2500);
  };

  if (loading) return <div style={styles.center}>Loading wishlist...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>❤️ My Wishlist</h1>

      {msg && <div style={styles.toast}>{msg}</div>}

      {wishlist.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>♡</div>
          <h2 style={{ color: '#1a1a2e', marginBottom: '8px' }}>Your wishlist is empty</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>Save products you love to buy them later.</p>
          <Link to="/products" style={styles.shopBtn}>Browse Products →</Link>
        </div>
      ) : (
        <>
          <p style={{ color: '#888', marginBottom: '24px' }}>{wishlist.length} saved item(s)</p>
          <div style={styles.grid}>
            {wishlist.map(product => {
              const finalPrice = getEffectivePrice(product);
              const discount = getSaleLabel(product);

              return (
                <div key={product._id} style={styles.card}>
                  {/* Product image */}
                  <Link to={`/products/${product._id}`}>
                    <div style={styles.imgBox}>
                      {product.images?.[0]?.url
                        ? <img src={product.images[0].url} alt={product.name} style={styles.img} />
                        : <span style={{ fontSize: '60px' }}>🛍️</span>}
                    </div>
                  </Link>

                  <div style={styles.info}>
                    <Link to={`/products/${product._id}`} style={{ textDecoration: 'none' }}>
                      <h3 style={styles.name}>{product.name}</h3>
                    </Link>
                    <p style={styles.cat}>{product.category?.name}</p>

                    <div style={styles.price}>
                      {discount > 0 && (
                        <>
                          <s style={{ color: '#aaa', fontSize: '14px' }}>Rs.{getOriginalPrice(product)}</s>
                          <span style={styles.disc}>-{discount}%</span>
                        </>
                      )}
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#e94560' }}>Rs.{finalPrice}</span>
                    </div>

                    <div style={{ fontSize: '13px', color: product.stock > 0 ? '#2ecc71' : '#e74c3c', marginBottom: '12px' }}>
                      {product.stock > 0 ? `✓ In Stock (${product.stock})` : '✗ Out of Stock'}
                    </div>

                    <div style={styles.actions}>
                      <button
                        style={{ ...styles.cartBtn, opacity: product.stock === 0 ? 0.5 : 1 }}
                        onClick={() => handleMoveToCart(product)}
                        disabled={product.stock === 0}
                      >
                        🛒 Move to Cart
                      </button>
                      <button style={styles.removeBtn} onClick={() => handleRemove(product._id)}>
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1160px', margin: '0 auto', padding: '26px 18px 44px', minHeight: '100vh' },
  title: { fontSize: 'clamp(30px, 4vw, 42px)', color: '#171310', marginBottom: '24px', fontFamily: 'Playfair Display, serif' },
  center: { textAlign: 'center', padding: '80px', fontSize: '18px' },
  toast: { backgroundColor: '#d4edda', color: '#155724', padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', fontWeight: 'bold' },
  empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', borderRadius: '22px', border: '1px solid rgba(227, 214, 200, 0.8)', boxShadow: '0 18px 40px rgba(34,24,17,0.08)' },
  shopBtn: { background: 'linear-gradient(135deg, #0e7a6d, #0a564d)', color: 'white', textDecoration: 'none', padding: '12px 28px', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 16px 28px rgba(10,86,77,0.22)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 18px 40px rgba(34,24,17,0.08)', transition: 'transform .2s', border: '1px solid rgba(227, 214, 200, 0.8)' },
  imgBox: { height: '210px', background: 'linear-gradient(180deg, #f8f0e6, #ebdfd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  info: { padding: '16px' },
  name: { fontSize: '16px', color: '#1a1a2e', marginBottom: '4px', lineHeight: '1.4' },
  cat: { fontSize: '12px', color: '#0e7a6d', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.8px' },
  price: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' },
  disc: { backgroundColor: '#e94560', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  actions: { display: 'flex', gap: '8px', flexDirection: 'column' },
  cartBtn: { background: 'linear-gradient(135deg, #0e7a6d, #0a564d)', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  removeBtn: { backgroundColor: '#fff5f1', color: '#8f4e14', border: '1px solid #e7cdb8', padding: '8px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' },
};

export default Wishlist;