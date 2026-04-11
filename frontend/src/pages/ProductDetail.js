import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getProduct, getProducts, addToWishlist, removeFromWishlist } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getProductImage, getProductImages, getProductImageEntries, getProductImagesByColor } from '../utils/productImage';
import { trackViewedProduct } from '../utils/behaviorTracker';
import { getRecentlyViewedProducts, trackProductClick } from '../utils/behaviorTracker';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';

const normalizeColor = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartMsg, setCartMsg] = useState('');
  const [activeImage, setActiveImage] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const touchStartXRef = useRef(null);
  const mouseStartXRef = useRef(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const res = await getProduct(id);
        const p = res.data.product;
        setProduct(p);
        const firstImage = getProductImages(p)[0] || getProductImage(p) || '';
        setActiveImage(firstImage);
        trackViewedProduct(p._id);
        if (p.sizes?.length) setSelectedSize(p.sizes[0]);
        if (p.colors?.length) setSelectedColor(p.colors[0]);
      } catch {
        // product not found
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    if (!product) return;

    const colorMatchedImages = getProductImagesByColor(product, selectedColor);
    const fallbackImages = getProductImages(product);
    const visibleImages = colorMatchedImages.length > 0 ? colorMatchedImages : fallbackImages;
    const firstVisibleImage = visibleImages[0] || getProductImage(product) || '';

    setActiveImage((prev) => {
      if (!firstVisibleImage) return '';
      if (!prev) return firstVisibleImage;
      if (visibleImages.length > 0 && !visibleImages.includes(prev)) return firstVisibleImage;
      return prev;
    });
  }, [product, selectedColor]);

  useEffect(() => {
    if (!product?._id) return;

    const loadSuggestions = async () => {
      try {
        const recentIds = getRecentlyViewedProducts().filter((itemId) => itemId && itemId !== product._id);
        const res = await getProducts();
        const allProducts = Array.isArray(res.data.products) ? res.data.products : [];

        const recentItems = recentIds
          .map((itemId) => allProducts.find((item) => item._id === itemId))
          .filter(Boolean)
          .slice(0, 8);

        const primaryRelated = allProducts
          .filter((item) => {
            if (!item || item._id === product._id) return false;
            const sameCategory = item.category?._id && product.category?._id && item.category._id === product.category._id;
            return sameCategory;
          })
          .slice(0, 10);

        const fallbackRelated = allProducts
          .filter((item) => {
            if (!item || item._id === product._id) return false;
            return !primaryRelated.some((related) => related._id === item._id);
          })
          .slice(0, 10);

        const relatedItems = [...primaryRelated, ...fallbackRelated].slice(0, 10);

        setRecentlyViewedProducts(recentItems);
        setRelatedProducts(relatedItems);
      } catch {
        setRecentlyViewedProducts([]);
        setRelatedProducts([]);
      }
    };

    loadSuggestions();
  }, [product?._id, product?.category?._id]);

  const handleAddToCart = () => {
    addToCart({ ...product, quantity, selectedSize, selectedColor });
    setCartMsg('✅ Added to cart!');
    setTimeout(() => setCartMsg(''), 2500);
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const colorMatchedImages = getProductImagesByColor(product, color);
    if (colorMatchedImages.length > 0) {
      setActiveImage(colorMatchedImages[0]);
    }
  };

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await removeFromWishlist(product._id);
        setWishlisted(false);
      } else {
        await addToWishlist(product._id);
        setWishlisted(true);
      }
    } catch (err) {
      console.error('Wishlist error:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const imageEntries = getProductImageEntries(product);
  const allImageUrls = imageEntries.map((entry) => entry.url);
  const colorMatchedImageEntries = selectedColor
    ? imageEntries.filter((entry) => {
        const entryColor = normalizeColor(entry.color);
        return entryColor && entryColor === normalizeColor(selectedColor);
      })
    : [];
  const visibleImageEntries = colorMatchedImageEntries.length > 0 ? colorMatchedImageEntries : imageEntries;
  const visibleImageUrls = visibleImageEntries.map((entry) => entry.url);
  const currentImageIndex = allImageUrls.findIndex((url) => url === activeImage);
  const currentImageNumber = currentImageIndex >= 0 ? currentImageIndex + 1 : (allImageUrls.length > 0 ? 1 : 0);
  const productImageUrl = activeImage || getProductImage(product);

  const showPrevImage = () => {
    if (allImageUrls.length <= 1) return;
    const safeIndex = currentImageIndex >= 0 ? currentImageIndex : 0;
    const prevIndex = (safeIndex - 1 + allImageUrls.length) % allImageUrls.length;
    setActiveImage(allImageUrls[prevIndex]);
  };

  const showNextImage = () => {
    if (allImageUrls.length <= 1) return;
    const safeIndex = currentImageIndex >= 0 ? currentImageIndex : 0;
    const nextIndex = (safeIndex + 1) % allImageUrls.length;
    setActiveImage(allImageUrls[nextIndex]);
  };

  const handleImageTouchStart = (event) => {
    const firstTouch = event.touches?.[0];
    touchStartXRef.current = firstTouch ? firstTouch.clientX : null;
  };

  const handleImageTouchEnd = (event) => {
    if (allImageUrls.length <= 1) return;

    const startX = touchStartXRef.current;
    const firstTouch = event.changedTouches?.[0];
    const endX = firstTouch ? firstTouch.clientX : null;
    touchStartXRef.current = null;

    if (startX === null || endX === null) return;

    const swipeDistance = endX - startX;
    const SWIPE_THRESHOLD = 40;

    if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

    if (swipeDistance > 0) {
      showPrevImage();
      return;
    }

    showNextImage();
  };

  const handleImageMouseDown = (event) => {
    mouseStartXRef.current = event.clientX;
  };

  const handleImageMouseUp = (event) => {
    if (allImageUrls.length <= 1) return;

    const startX = mouseStartXRef.current;
    const endX = event.clientX;
    mouseStartXRef.current = null;

    if (startX === null || endX === null) return;

    const swipeDistance = endX - startX;
    const SWIPE_THRESHOLD = 50;

    if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) return;

    if (swipeDistance > 0) {
      showPrevImage();
      return;
    }

    showNextImage();
  };

  const handleImageMouseLeave = () => {
    mouseStartXRef.current = null;
  };

  const handleImageKeyDown = (event) => {
    if (allImageUrls.length <= 1) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPrevImage();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextImage();
    }
  };

  const openLightbox = () => {
    const index = allImageUrls.findIndex((url) => url === productImageUrl);
    setLightboxIndex(index >= 0 ? index : 0);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const showLightboxPrev = () => {
    if (allImageUrls.length <= 1) return;
    setLightboxIndex((prev) => (prev - 1 + allImageUrls.length) % allImageUrls.length);
  };

  const showLightboxNext = () => {
    if (allImageUrls.length <= 1) return;
    setLightboxIndex((prev) => (prev + 1) % allImageUrls.length);
  };

  useEffect(() => {
    if (!isLightboxOpen) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showLightboxPrev();
      if (event.key === 'ArrowRight') showLightboxNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen, allImageUrls.length]);

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!product) return <div style={styles.loading}>Product not found</div>;

  const finalPrice = getEffectivePrice(product, selectedSize);
  const discountPercent = getSaleLabel(product, selectedSize);

  const openSuggestedProduct = (productId) => {
    if (!productId) return;
    trackProductClick(productId);
    navigate(`/products/${productId}`);
  };

  const SuggestedSection = ({ title, items }) => {
    if (!Array.isArray(items) || items.length === 0) return null;

    return (
      <section style={styles.suggestedSection}>
        <h3 style={styles.suggestedTitle}>{title}</h3>
        <div style={styles.suggestedRow}>
          {items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => openSuggestedProduct(item._id)}
              style={styles.suggestedCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 14px 24px rgba(34, 24, 17, 0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(34, 24, 17, 0.08)';
                }}
            >
              <div style={styles.suggestedImageWrap}>
                {getProductImage(item)
                  ? <img src={getProductImage(item)} alt={item.name} style={styles.suggestedImage} />
                  : <div style={styles.suggestedPlaceholder}>🛍️</div>}
              </div>
              <div style={styles.suggestedMeta}>
                <div style={styles.suggestedName}>{item.name}</div>
                <div style={styles.suggestedPrice}>Rs.{getEffectivePrice(item)}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  };

  // ── SEO meta values ──────────────────────────────────────────────────────
  const seoTitle = product.metaTitle || `${product.name} | WF Bedding Store`;
  const seoDesc = product.metaDescription || product.description?.substring(0, 155);
  const seoKeywords = product.metaKeywords?.join(', ') || product.name;
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta name="keywords" content={seoKeywords} />
        {/* Open Graph */}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:type" content="product" />
        {productImageUrl && <meta property="og:image" content={productImageUrl} />}
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {/* Canonical slug URL */}
        {product.slug && <link rel="canonical" href={`${window.location.origin}/products/${product.slug}`} />}
      </Helmet>

      <div style={styles.container}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>

        <div style={styles.productContainer}>
          {/* Image */}
          <div style={styles.imageSection}>
            {productImageUrl ? (
              <div
                style={styles.mainImageWrap}
                className="zoom-image-wrap"
                onTouchStart={handleImageTouchStart}
                onTouchEnd={handleImageTouchEnd}
                onMouseDown={handleImageMouseDown}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseLeave}
                onKeyDown={handleImageKeyDown}
                tabIndex={0}
                aria-label="Swipe image gallery"
              >
                {allImageUrls.length > 1 && (
                  <>
                    <button type="button" style={{ ...styles.imageNavBtn, ...styles.imageNavLeft }} onClick={showPrevImage} aria-label="Show previous image">
                      &lt;
                    </button>
                    <button type="button" style={{ ...styles.imageNavBtn, ...styles.imageNavRight }} onClick={showNextImage} aria-label="Show next image">
                      &gt;
                    </button>
                    <div style={styles.imageCounter} aria-live="polite">
                      {currentImageNumber} / {allImageUrls.length}
                    </div>
                  </>
                )}
                <button type="button" style={styles.zoomOpenBtn} onClick={openLightbox} aria-label="Open image in full screen">
                  ⤢
                </button>
                <img
                  src={productImageUrl}
                  alt={product.name}
                  style={styles.productImg}
                  className="zoom-target"
                  onClick={openLightbox}
                />
                <span style={styles.zoomPlus} className="zoom-plus-icon">+</span>
              </div>
            ) : (
              <div style={styles.productImage}>🛍️</div>
            )}

            {imageEntries.length > 1 && (
              <div style={styles.thumbRow}>
                {imageEntries.map((imageEntry, index) => (
                  <button
                    key={`${imageEntry.url}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(imageEntry.url)}
                    style={{
                      ...styles.thumbBtn,
                      border: activeImage === imageEntry.url ? '2px solid #0e7a6d' : '2px solid transparent',
                      opacity: activeImage === imageEntry.url ? 1 : 0.45,
                      transform: activeImage === imageEntry.url ? 'scale(1)' : 'scale(0.96)'
                    }}
                    title={`View image ${index + 1}`}
                  >
                    <img src={imageEntry.url} alt={imageEntry.alt || `${product.name} ${index + 1}`} style={styles.thumbImg} />
                    {imageEntry.color && <span style={styles.thumbColor}>{imageEntry.color}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={styles.infoSection}>
            <h1 style={styles.title}>{product.name}</h1>
            <p style={styles.category}>{product.category?.name}</p>

            <div style={styles.priceSection}>
              {discountPercent > 0 ? (
                <>
                  <span style={styles.originalPrice}>Rs.{getOriginalPrice(product, selectedSize)}</span>
                  <span style={styles.price}>Rs.{finalPrice}</span>
                  <span style={styles.discountBadge}>-{discountPercent}%</span>
                </>
              ) : (
                <span style={styles.price}>Rs.{finalPrice}</span>
              )}
            </div>

            {/* Stock */}
            <div style={{ margin: '12px 0' }}>
              {product.stock > 0
                ? <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ In Stock ({product.stock} left)</span>
                : <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>✗ OUT OF STOCK</span>}
            </div>

            {/* Color picker */}
            {product.colors?.length > 0 && (
              <div style={{ margin: '16px 0' }}>
                <p style={styles.optionLabel}>Color: <b>{selectedColor}</b></p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {product.colors.map(c => (
                    <button key={c} style={{ ...styles.optionBtn, border: selectedColor === c ? '2px solid #e94560' : '2px solid #ddd' }} onClick={() => handleColorSelect(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size picker */}
            {product.sizes?.length > 0 && (
              <div style={{ margin: '16px 0' }}>
                <p style={styles.optionLabel}>Size: <b>{selectedSize}</b></p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {product.sizes.map(sz => (
                    <button key={sz} style={{ ...styles.optionBtn, border: selectedSize === sz ? '2px solid #e94560' : '2px solid #ddd' }} onClick={() => setSelectedSize(sz)}>
                      {sz} - Rs.{getEffectivePrice(product, sz)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={styles.optionLabel}>Quantity:</span>
              <button style={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
              <span style={{ fontSize: '18px', minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
              <button style={styles.qtyBtn} onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>+</button>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                style={{ ...styles.addToCartBtn, opacity: product.stock === 0 ? 0.5 : 1 }}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                🛒 Add to Cart
              </button>
              <button style={styles.wishlistBtn} onClick={handleWishlist} disabled={wishlistLoading}>
                {wishlisted ? '❤️ Wishlisted' : '♡ Wishlist'}
              </button>
            </div>

            {cartMsg && <div style={styles.cartMsg}>{cartMsg}</div>}

            {/* Description */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ color: '#1a1a2e', marginBottom: '10px' }}>Description</h3>
              <p style={{ color: '#555', lineHeight: '1.7' }}>{product.description}</p>
            </div>

            {/* Product details */}
            {product.fabricType && (
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}><span style={styles.detailLabel}>Fabric</span><span>{product.fabricType}</span></div>
                {product.sizes?.length > 0 && <div style={styles.detailItem}><span style={styles.detailLabel}>Sizes</span><span>{product.sizes.join(', ')}</span></div>}
                {product.colors?.length > 0 && <div style={styles.detailItem}><span style={styles.detailLabel}>Colors</span><span>{product.colors.join(', ')}</span></div>}
              </div>
            )}

          </div>
        </div>

        <SuggestedSection title="RECENTLY VIEWED" items={recentlyViewedProducts} />
        <SuggestedSection title="Related Products" items={relatedProducts} />
      </div>

      {isLightboxOpen && allImageUrls.length > 0 && (
        <div style={styles.lightboxOverlay} onClick={closeLightbox}>
          <div style={styles.lightboxPanel} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.lightboxCloseBtn} onClick={closeLightbox} aria-label="Close full screen image">✕</button>

            {allImageUrls.length > 1 && (
              <button type="button" style={{ ...styles.lightboxNavBtn, ...styles.lightboxNavLeft }} onClick={showLightboxPrev} aria-label="Previous image">‹</button>
            )}

            <img
              src={allImageUrls[lightboxIndex]}
              alt={`${product.name} ${lightboxIndex + 1}`}
              style={styles.lightboxImage}
            />

            {allImageUrls.length > 1 && (
              <button type="button" style={{ ...styles.lightboxNavBtn, ...styles.lightboxNavRight }} onClick={showLightboxNext} aria-label="Next image">›</button>
            )}

            {allImageUrls.length > 1 && (
              <div style={styles.lightboxThumbRail}>
                {allImageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    style={{
                      ...styles.lightboxThumbBtn,
                      border: index === lightboxIndex ? '2px solid #ffffff' : '2px solid transparent',
                      opacity: index === lightboxIndex ? 1 : 0.62
                    }}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={url} alt={`${product.name} thumbnail ${index + 1}`} style={styles.lightboxThumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  container: { maxWidth: '1240px', margin: '0 auto', padding: '18px 18px 36px', minHeight: '100vh' },
  loading: { textAlign: 'center', padding: '80px', fontSize: '20px' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', border: '1px solid #e2d5c6', padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', marginBottom: '22px', color: '#4e443d', boxShadow: '0 8px 20px rgba(0,0,0,0.06)' },
  productContainer: { display: 'grid', gridTemplateColumns: '1.03fr 0.97fr', gap: '28px', backgroundColor: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(14px)', borderRadius: '26px', padding: '24px', boxShadow: '0 24px 60px rgba(34, 24, 17, 0.12)', border: '1px solid rgba(227, 214, 200, 0.72)', alignItems: 'start' },
  imageSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: 'linear-gradient(180deg, #f8f0e6 0%, #efe0d1 100%)', borderRadius: '20px', padding: '18px' },
  mainImageWrap: { width: '100%', borderRadius: '18px', overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none', position: 'relative', outline: 'none' },
  imageNavBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '34px',
    height: '34px',
    padding: 0,
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(20, 15, 11, 0.72)',
    color: '#fff',
    fontSize: '18px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 7,
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
    fontWeight: 800,
    letterSpacing: '0.2px'
  },
  imageNavLeft: { left: '12px' },
  imageNavRight: { right: '12px' },
  imageCounter: {
    position: 'absolute',
    left: '50%',
    bottom: '12px',
    transform: 'translateX(-50%)',
    padding: '6px 10px',
    borderRadius: '999px',
    backgroundColor: 'rgba(20, 15, 11, 0.7)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    zIndex: 7,
    boxShadow: '0 8px 18px rgba(0,0,0,0.24)'
  },
  galleryControlsRow: {
    marginTop: '14px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    flexWrap: 'wrap'
  },
  galleryControlBtn: {
    border: '1px solid #d8c6b0',
    backgroundColor: '#fff',
    color: '#4e443d',
    borderRadius: '999px',
    padding: '10px 16px',
    fontSize: '18px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
  },
  galleryControlCounter: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#6f6157',
    backgroundColor: 'rgba(255,255,255,0.7)',
    border: '1px solid #eadfce',
    borderRadius: '999px',
    padding: '8px 12px'
  },
  zoomPlus: { border: '1px solid rgba(143, 78, 20, 0.2)', boxShadow: '0 8px 18px rgba(0,0,0,0.15)' },
  zoomOpenBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(20, 15, 11, 0.72)',
    color: '#fff',
    fontSize: '17px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 8,
    boxShadow: '0 8px 18px rgba(0,0,0,0.24)'
  },
  productImage: { fontSize: '120px' },
  productImg: { width: '100%', height: '100%', minHeight: '384px', objectFit: 'cover', borderRadius: '18px', boxShadow: '0 18px 36px rgba(0,0,0,0.14)' },
  thumbRow: { marginTop: '14px', width: '100%', display: 'flex', gap: '12px', flexWrap: 'nowrap', justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: '2px' },
  thumbBtn: { width: '104px', height: '78px', padding: '0', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', flex: '0 0 auto', transition: 'opacity .2s ease, transform .2s ease, border-color .2s ease' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbColor: { position: 'absolute', left: '4px', right: '4px', bottom: '4px', backgroundColor: 'rgba(0,0,0,0.58)', color: 'white', borderRadius: '7px', fontSize: '10px', fontWeight: 700, padding: '2px 4px', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  infoSection: { padding: '8px 0' },
  title: { fontSize: 'clamp(30px, 4vw, 46px)', color: '#171310', marginBottom: '8px', lineHeight: '1.08', fontFamily: 'Playfair Display, serif' },
  category: { color: '#0e7a6d', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: '16px' },
  priceSection: { display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' },
  price: { fontSize: '30px', fontWeight: '800', color: '#b35d00' },
  originalPrice: { fontSize: '20px', textDecoration: 'line-through', color: '#aaa' },
  discountBadge: { backgroundColor: '#f6b26b', color: '#2e1f14', padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 },
  optionLabel: { fontSize: '14px', color: '#555', marginBottom: '8px' },
  optionBtn: { padding: '10px 16px', borderRadius: '999px', cursor: 'pointer', backgroundColor: 'white', fontSize: '13px', transition: 'transform .2s ease, border-color .2s ease, box-shadow .2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' },
  qtyBtn: { width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #dccfbe', cursor: 'pointer', backgroundColor: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' },
  addToCartBtn: { background: 'linear-gradient(135deg, #0e7a6d, #0a564d)', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', flex: 1, boxShadow: '0 16px 28px rgba(10,86,77,0.22)' },
  wishlistBtn: { backgroundColor: 'white', color: '#8f4e14', border: '1px solid #e2c6aa', padding: '12px 20px', borderRadius: '14px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 8px 18px rgba(0,0,0,0.05)' },
  cartMsg: { marginTop: '12px', padding: '10px 16px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '10px', fontWeight: 'bold' },
  detailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px', padding: '18px', background: 'linear-gradient(180deg, #fbf8f4, #f3ebe1)', borderRadius: '16px', border: '1px solid #eadfcc' },
  detailItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  detailLabel: { fontSize: '12px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' },
  suggestedSection: {
    marginTop: '18px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.7))',
    border: '1px solid rgba(227, 214, 200, 0.72)',
    borderRadius: '20px',
    padding: '18px'
  },
  suggestedTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 800,
    color: '#1f1a16',
    letterSpacing: '0.4px'
  },
  suggestedRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '12px'
  },
  suggestedCard: {
    border: '1px solid #eadfce',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
    boxShadow: '0 8px 20px rgba(34, 24, 17, 0.08)',
    transition: 'transform .2s ease, box-shadow .2s ease'
  },
  suggestedImageWrap: {
    height: '118px',
    background: 'linear-gradient(180deg, #f2e9dc, #ebddcc)'
  },
  suggestedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  suggestedPlaceholder: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '34px'
  },
  suggestedMeta: {
    padding: '10px 10px 12px'
  },
  suggestedName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1f1a16',
    lineHeight: 1.3,
    marginBottom: '4px',
    minHeight: '34px'
  },
  suggestedPrice: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#0e7a6d'
  },
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.88)',
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px'
  },
  lightboxPanel: {
    position: 'relative',
    width: 'min(1200px, 96vw)',
    height: 'min(92vh, 900px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '10px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.35)'
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: '8px',
    right: '6px',
    width: '42px',
    height: '42px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.46)',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    zIndex: 3
  },
  lightboxNavBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '34px',
    lineHeight: 1,
    cursor: 'pointer',
    zIndex: 3
  },
  lightboxNavLeft: { left: '10px' },
  lightboxNavRight: { right: '10px' },
  lightboxThumbRail: {
    position: 'absolute',
    left: '12px',
    top: '52px',
    bottom: '12px',
    width: '82px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px'
  },
  lightboxThumbBtn: {
    width: '72px',
    height: '72px',
    borderRadius: '10px',
    padding: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
    cursor: 'pointer',
    flex: '0 0 auto'
  },
  lightboxThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
};

export default ProductDetail;