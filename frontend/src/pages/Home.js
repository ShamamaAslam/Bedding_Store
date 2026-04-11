import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategories, getProducts } from '../services/api';
import { getProductImage } from '../utils/productImage';
import { trackProductClick } from '../utils/behaviorTracker';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';
import HeroSlider from '../components/HeroSlider';

const MotionLink = motion(Link);

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [categoriesRes, productsRes] = await Promise.all([
          getCategories(),
          getProducts({ sort: 'trending' })
        ]);

        setCategories(categoriesRes.data.categories || []);
        setTrending((productsRes.data.products || []).slice(0, 4));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load products. Please refresh.');
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <motion.div style={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <HeroSlider />

      <motion.div style={styles.section} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <h2 style={styles.sectionTitle}>Shop by Category</h2>
        {error && <p style={styles.errorText}>{error}</p>}
        {loading && <p style={styles.loadingText}>Loading categories...</p>}
        <div style={styles.grid}>
          {categories.map(cat => (
            <MotionLink
              key={cat._id}
              to={`/products?category=${cat._id}`}
              style={styles.catCard}
              className="premium-card"
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <span style={styles.catIcon}>{getCatIcon(cat.name)}</span>
              <h3 style={styles.catName}>{cat.name}</h3>
              <p style={styles.catDesc}>{cat.description}</p>
            </MotionLink>
          ))}
        </div>
      </motion.div>

      <motion.div style={{ ...styles.section, ...styles.trendingSection }} variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
        <h2 style={styles.sectionTitle}>Trending Now</h2>
        {loading && <p style={styles.loadingText}>Loading trending products...</p>}
        <div style={styles.productGrid}>
          {trending.map(product => (
            <MotionLink
              key={product._id}
              to={`/products/${product._id}`}
              style={styles.productCard}
              className="premium-card"
              onClick={() => trackProductClick(product._id)}
              variants={cardVariants}
              whileHover={{ y: -7, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div style={styles.productImg}>
                {getProductImage(product) ? (
                  <div style={styles.zoomWrap} className="zoom-image-wrap">
                    <img src={getProductImage(product)} alt={product.name} style={styles.productImageTag} className="zoom-target" />
                    <span style={styles.zoomPlus} className="zoom-plus-icon">+</span>
                    <span className="zoom-caption">{product.name}</span>
                  </div>
                ) : (
                  getCatIcon(product.category?.name)
                )}
              </div>
              <div style={styles.productInfo}>
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productCat}>{product.category?.name}</p>
                <div style={{ ...styles.stockBadge, ...(product.stock > 0 ? styles.inStock : styles.outOfStock) }}>
                  {product.stock > 0 ? `In Stock (${product.stock})` : 'OUT OF STOCK'}
                </div>
                <p style={styles.productDesc}>{product.description?.slice(0, 65)}...</p>
                {getSaleLabel(product) > 0 && (
                  <div style={styles.saleBadge}>-{getSaleLabel(product)}% OFF</div>
                )}
                <div style={styles.priceRow}>
                  {(product.discountPrice || getSaleLabel(product) > 0) && (
                    <span style={styles.oldPrice}>Rs. {getOriginalPrice(product)}</span>
                  )}
                  <span style={styles.price}>Rs. {getEffectivePrice(product)}</span>
                </div>
              </div>
            </MotionLink>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <Link to="/products" style={styles.heroBtnPrimary} className="premium-button">View All Products</Link>
        </div>
      </motion.div>

      <footer style={styles.footer}>
        <div style={styles.footerTag}>WF BEDDING ATELIER</div>
        <p>Curated bedding, drapery and home textiles crafted for modern homes.</p>
      </footer>
    </motion.div>
  );
};

const getCatIcon = (name) => {
  const icons = {
    'Unstitched Fabric': '🧵',
    'Semi-Stitched Clothes': '👗',
    'Strollers': '🍼',
    'Prayer Mats': '🕌',
    'Bedsheets': '🛏️',
    'Blankets & Quilts': '🧣',
    'Comforters': '🧺',
    'Curtains': '🪟',
    'Sofa Covers': '🪑',
    'Pillows & Cushions': '🛋️'
  };
  return icons[name] || '🛍️';
};

const styles = {
  page: { paddingBottom: '28px' },
  heroWrap: {
    position: 'relative',
    margin: '20px clamp(14px, 3vw, 38px) 12px',
    borderRadius: '28px',
    overflow: 'hidden',
    background: 'linear-gradient(120deg, #0d5a52 0%, #1f8d7f 52%, #c66f2f 100%)',
    minHeight: '430px',
    boxShadow: '0 18px 45px rgba(12, 72, 65, 0.3)'
  },
  heroGlowLeft: {
    position: 'absolute',
    width: '380px',
    height: '380px',
    borderRadius: '50%',
    filter: 'blur(4px)',
    background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 65%)',
    left: '-80px',
    top: '-70px'
  },
  heroGlowRight: {
    position: 'absolute',
    width: '340px',
    height: '340px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,224,200,0.35), transparent 62%)',
    right: '-90px',
    bottom: '-110px'
  },
  heroContent: {
    maxWidth: '860px',
    position: 'relative',
    zIndex: 1,
    color: 'white',
    padding: '58px clamp(20px, 5vw, 60px)',
    animation: 'riseIn 0.6s ease-out both'
  },
  kicker: {
    margin: '0 0 12px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    fontWeight: 600,
    fontSize: '12px',
    opacity: 0.95
  },
  heroTitle: {
    margin: '0 0 14px',
    fontFamily: 'Playfair Display, serif',
    fontSize: 'clamp(34px, 6vw, 64px)',
    lineHeight: 1.06,
    maxWidth: '750px'
  },
  heroSub: {
    maxWidth: '640px',
    margin: '0 0 24px',
    fontSize: 'clamp(15px, 2.2vw, 20px)',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 1.5
  },
  heroCtas: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '26px'
  },
  heroBtnPrimary: {
    backgroundColor: '#f4bf89',
    color: '#2e1f14',
    padding: '12px 24px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 700,
    boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
  },
  heroBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#fff',
    padding: '12px 22px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.35)'
  },
  metrics: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '8px'
  },
  section: { padding: '42px clamp(14px, 3.2vw, 48px)' },
  sectionTitle: {
    textAlign: 'left',
    fontSize: 'clamp(28px, 4.4vw, 42px)',
    margin: '0 0 24px',
    color: '#1d1814',
    fontFamily: 'Playfair Display, serif'
  },
  loadingText: { textAlign: 'center', color: '#666', marginBottom: '16px' },
  errorText: { textAlign: 'center', color: '#b00020', marginBottom: '16px', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' },
  catCard: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    border: '1px solid rgba(232,223,213,0.55)',
    borderRadius: '22px',
    padding: '24px 18px',
    textAlign: 'center',
    textDecoration: 'none',
    color: '#362d28',
    transition: 'transform .22s ease, box-shadow .22s ease',
    cursor: 'pointer',
    display: 'block',
    boxShadow: '0 14px 30px rgba(53, 41, 32, 0.07)',
    backdropFilter: 'blur(10px)'
  },
  catIcon: { fontSize: '44px', display: 'block', marginBottom: '10px' },
  catName: { fontSize: '18px', fontWeight: 'bold', color: '#1f1a16', margin: '8px 0' },
  catDesc: { fontSize: '13px', color: '#6f6259', lineHeight: 1.35 },
  trendingSection: { background: 'linear-gradient(180deg, #f8f3eb 0%, #f2ece3 100%)', borderRadius: '28px', margin: '0 clamp(14px, 3.2vw, 42px)' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
  productCard: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderRadius: '22px',
    overflow: 'hidden',
    textDecoration: 'none',
    color: '#333',
    boxShadow: '0 16px 40px rgba(28, 22, 18, 0.1)',
    border: '1px solid rgba(138, 112, 89, 0.14)',
    backdropFilter: 'blur(12px)'
  },
  productImg: {
    backgroundColor: '#efe7dc',
    fontSize: '64px',
    textAlign: 'center',
    padding: '18px',
    minHeight: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomWrap: { width: '100%', height: '180px', borderRadius: '10px' },
  zoomPlus: { border: '1px solid rgba(143, 78, 20, 0.2)', boxShadow: '0 8px 18px rgba(0,0,0,0.15)' },
  productImageTag: { width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px' },
  productInfo: { padding: '16px 16px 18px' },
  productName: { fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px', color: '#1f1a16' },
  productCat: { color: '#8a7768', fontSize: '12px', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.8px' },
  productDesc: { fontSize: '13px', color: '#6e6056', lineHeight: 1.4, margin: '0 0 12px' },
  saleBadge: { display: 'inline-block', marginBottom: '10px', backgroundColor: '#fff1de', color: '#b35d00', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, letterSpacing: '0.4px' },
  stockBadge: {
    display: 'inline-block',
    marginBottom: '10px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.5px'
  },
  inStock: { backgroundColor: '#d8efe9', color: '#0e7a6d' },
  outOfStock: { backgroundColor: '#fde2e4', color: '#b00020' },
  priceRow: { display: 'flex', gap: '10px', alignItems: 'center' },
  oldPrice: { color: '#aaa', textDecoration: 'line-through', fontSize: '14px' },
  price: { color: '#0d655a', fontWeight: 'bold', fontSize: '20px' },
  footer: {
    margin: '26px clamp(14px, 3vw, 38px) 12px',
    borderRadius: '24px',
    background: '#1f1a16',
    color: '#ddd2c8',
    textAlign: 'center',
    padding: '26px 18px'
  },
  footerTag: {
    fontSize: '11px',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: '#f2b88a',
    marginBottom: '8px'
  }
};

export default Home;