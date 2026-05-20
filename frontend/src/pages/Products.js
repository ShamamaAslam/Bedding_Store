import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { addToWishlist, getProducts, getCategories } from '../services/api';
import { getProductImage } from '../utils/productImage';
import { trackProductClick, trackSearchKeyword, trackWishlistEvent } from '../utils/behaviorTracker';
import { getEffectivePrice, getOriginalPrice, getSaleLabel } from '../utils/pricing';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Products.css';

const isObjectIdLike = (value = '') => /^[a-f\d]{24}$/i.test(String(value).trim());

const MotionLink = motion(Link);

const pageVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
  }
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const Products = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState([]);
  const [openSections, setOpenSections] = useState({
    search: true,
    category: true,
    fabric: true,
    shade: true,
    availability: true,
    pricing: true,
    sort: true
  });
  const [searchParams] = useSearchParams();
  const lastCategoryParamRef = useRef(null);
  const searchTrackingTimerRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    sort: 'newest', fabricType: '', shade: '', minPrice: '', maxPrice: '', availability: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');

  const clearFlash = () => {
    window.clearTimeout(window.__wfProductsFlashTimer);
    window.__wfProductsFlashTimer = window.setTimeout(() => setInfoMsg(''), 2500);
  };

  const setFlash = (text) => {
    setInfoMsg(text);
    clearFlash();
  };

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setFilterValue = (key, value) => {
    if (key === 'search') {
      // Update filter immediately for UI, but debounce the actual API call
      setFilters(prev => ({ ...prev, [key]: value }));
      
      // Clear existing debounce timer
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      
      // Set new debounce timer - only update debouncedSearch after 300ms of inactivity
      searchDebounceTimerRef.current = setTimeout(() => {
        setDebouncedSearch(value);
      }, 300);
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({ category: '', sort: 'newest', fabricType: '', shade: '', minPrice: '', maxPrice: '', availability: '', search: '' });
    setDebouncedSearch('');
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await getCategories();
        setCategories(res.data.categories || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load categories.');
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadTrendingProducts = async () => {
      try {
        const res = await getProducts({ sort: 'trending' });
        setTrending(res.data.products ? res.data.products.slice(0, 6) : []);
      } catch (err) {
        setTrending([]);
      }
    };

    loadTrendingProducts();
  }, []);

  useEffect(() => {
    const rawCategory = (searchParams.get('category') || '').trim();
    const shouldResolveFromName =
      Boolean(rawCategory) &&
      !isObjectIdLike(rawCategory) &&
      categories.length > 0 &&
      filters.category === rawCategory;

    if (!shouldResolveFromName && rawCategory === lastCategoryParamRef.current) {
      return;
    }

    lastCategoryParamRef.current = rawCategory;
    if (!rawCategory) return;

    const resolvedCategory = isObjectIdLike(rawCategory)
      ? rawCategory
      : (categories.find((cat) => cat?.name?.toLowerCase() === rawCategory.toLowerCase())?._id || rawCategory);

    setFilters((prev) => (prev.category === resolvedCategory ? prev : { ...prev, category: resolvedCategory }));
  }, [searchParams, categories, filters.category]);

  // Sync search parameter from URL
  useEffect(() => {
    const searchFromUrl = (searchParams.get('search') || '').trim();
    if (searchFromUrl && filters.search !== searchFromUrl) {
      setFilters((prev) => ({ ...prev, search: searchFromUrl }));
      setDebouncedSearch(searchFromUrl); // Immediately update debounced search from URL
    }
  }, [searchParams.get('search')]);

  useEffect(() => () => {
    window.clearTimeout(window.__wfProductsFlashTimer);
    window.clearTimeout(searchTrackingTimerRef.current);
    clearTimeout(searchDebounceTimerRef.current);
  }, []);

  useEffect(() => {
    const keyword = String(filters.search || '').trim();
    window.clearTimeout(searchTrackingTimerRef.current);

    if (!keyword || keyword.length < 2) return;

    searchTrackingTimerRef.current = window.setTimeout(() => {
      trackSearchKeyword(keyword, {
        source: 'products_page',
        resultsCount: products.length
      });
    }, 450);

    return () => window.clearTimeout(searchTrackingTimerRef.current);
  }, [filters.search, products.length]);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const params = {};
        if (filters.category) params.category = filters.category;
        // Keep backend query narrow and deterministic; apply pricing/sort filters locally
        // so behavior matches the exact values shown on product cards.
        if (debouncedSearch) params.search = debouncedSearch;
        if (filters.shade) params.shade = filters.shade;

        const res = await getProducts(params);
        setProducts(res.data.products || []);
      } catch (err) {
        setProducts([]);
        setError(err.response?.data?.message || 'Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [filters.category, filters.shade, debouncedSearch]);

  const hasValidMinPrice = filters.minPrice !== '' && Number.isFinite(Number(filters.minPrice));
  const hasValidMaxPrice = filters.maxPrice !== '' && Number.isFinite(Number(filters.maxPrice));
  const isInvalidPriceRange = hasValidMinPrice && hasValidMaxPrice && Number(filters.minPrice) > Number(filters.maxPrice);

  const filteredProducts = useMemo(() => {
    const normalizedFabric = String(filters.fabricType || '').trim().toLowerCase();
    const minValue = hasValidMinPrice ? Number(filters.minPrice) : null;
    const maxValue = hasValidMaxPrice ? Number(filters.maxPrice) : null;

    if (isInvalidPriceRange) {
      return [];
    }

    const list = products.filter((product) => {
      if (normalizedFabric) {
        const productFabric = String(product.fabricType || '').trim().toLowerCase();
        if (productFabric !== normalizedFabric) return false;
      }

      if (filters.shade) {
        const shadeValue = String(filters.shade).trim().toLowerCase();
        if (!product.shadeCategories || !product.shadeCategories.includes(shadeValue)) return false;
      }

      if (filters.availability === 'in_stock' && Number(product.stock || 0) <= 0) return false;
      if (filters.availability === 'out_of_stock' && Number(product.stock || 0) > 0) return false;

      const displayPrice = Number(getEffectivePrice(product));
      if (minValue !== null && displayPrice < minValue) return false;
      if (maxValue !== null && displayPrice > maxValue) return false;

      return true;
    });

    if (filters.sort === 'price_asc') {
      list.sort((a, b) => Number(getEffectivePrice(a)) - Number(getEffectivePrice(b)));
    } else if (filters.sort === 'price_desc') {
      list.sort((a, b) => Number(getEffectivePrice(b)) - Number(getEffectivePrice(a)));
    } else if (filters.sort === 'trending') {
      list.sort((a, b) => Number(b.purchases || 0) - Number(a.purchases || 0));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [products, filters.fabricType, filters.shade, filters.availability, filters.minPrice, filters.maxPrice, filters.sort, hasValidMinPrice, hasValidMaxPrice, isInvalidPriceRange]);

  const fabricOptions = useMemo(() => {
    const defaults = ['Cotton', 'Silk', 'Linen', 'Polyester', 'Wool', 'Blend', 'Other'];
    const discovered = products
      .map((item) => String(item?.fabricType || '').trim())
      .filter(Boolean);

    const selected = String(filters.fabricType || '').trim();
    return Array.from(new Set([...defaults, ...discovered, ...(selected ? [selected] : [])]));
  }, [products, filters.fabricType]);

  const handleAddToCart = (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    // Prevent adding out-of-stock products
    if (product.stock <= 0) {
      setFlash(`${product.name} is out of stock`);
      return;
    }

    addToCart({
      ...product,
      quantity: 1,
      selectedSize: product.sizes?.[0] || '',
      selectedColor: product.colors?.[0] || ''
    });

    setFlash(`Added ${product.name} to cart`);
  };

  const handleWishlist = async (event, product) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    if (wishlistedIds.includes(product._id)) {
      setFlash(`${product.name} is already in your wishlist`);
      return;
    }

    try {
      await addToWishlist(product._id);
      setWishlistedIds(prev => [...prev, product._id]);
      trackWishlistEvent({ action: 'wishlist_add', productId: product._id });
      setFlash(`Saved ${product.name} to wishlist`);
    } catch (err) {
      setFlash(err?.response?.data?.message || 'Unable to save to wishlist');
    }
  };

  const goShopNow = () => {
    const el = document.getElementById('products-grid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const skeletonItems = new Array(8).fill(null);

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

  return (
    <motion.div className="products-page-shell" initial="hidden" animate="visible" variants={pageVariants}>
      <section className="products-hero">
        <div className="products-hero-content">
          <p className="products-hero-kicker">Curated Home Collection</p>
          <h1 className="products-hero-title">Find Premium Textiles Crafted for Comfort</h1>
          <p className="products-hero-subtitle">
            Browse elevated fabrics, bedding, and decor essentials with modern finishes and artisan quality.
          </p>
          <div className="products-hero-actions">
            <button type="button" className="products-cta" onClick={goShopNow}>Shop Now</button>
            <span className="products-hero-meta">{filteredProducts.length} products available</span>
          </div>
        </div>
        <div className="products-hero-orb" />
      </section>

      <div className="products-controls-row">
        <button
          type="button"
          className="filter-toggle-button"
          aria-expanded={mobileFiltersOpen}
          aria-controls="products-filters"
          onClick={() => setMobileFiltersOpen(prev => !prev)}
          title={mobileFiltersOpen ? 'Hide filters' : 'Show filters'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sr-only">Toggle filters</span>
        </button>
      </div>

      <div className="products-layout">
        <aside id="products-filters" className={`products-sidebar ${mobileFiltersOpen ? 'open' : ''}`}>
          <div className="sidebar-glass">
            <h3 className="filter-title">Refine Collection</h3>
            <p className="filter-sub">Sharper filters. Faster browsing.</p>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('search')}>
                Search
                <span>{openSections.search ? '−' : '+'}</span>
              </button>
              {openSections.search && (
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Search products or fabrics"
                  value={filters.search}
                  onChange={e => setFilterValue('search', e.target.value)}
                />
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('category')}>
                Category
                <span>{openSections.category ? '−' : '+'}</span>
              </button>
              {openSections.category && (
                <select className="filter-select" value={filters.category} onChange={e => setFilterValue('category', e.target.value)}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('fabric')}>
                Fabric Type
                <span>{openSections.fabric ? '−' : '+'}</span>
              </button>
              {openSections.fabric && (
                <select className="filter-select" value={filters.fabricType} onChange={e => setFilterValue('fabricType', e.target.value)}>
                  <option value="">All Fabrics</option>
                  {fabricOptions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('shade')}>
                Shade
                <span>{openSections.shade ? '−' : '+'}</span>
              </button>
              {openSections.shade && (
                <select className="filter-select" value={filters.shade} onChange={e => setFilterValue('shade', e.target.value)}>
                  <option value="">All Shades</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('availability')}>
                Availability
                <span>{openSections.availability ? '−' : '+'}</span>
              </button>
              {openSections.availability && (
                <select className="filter-select" value={filters.availability} onChange={e => setFilterValue('availability', e.target.value)}>
                  <option value="">All Items</option>
                  <option value="in_stock">In Stock Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('pricing')}>
                Price Range
                <span>{openSections.pricing ? '−' : '+'}</span>
              </button>
              {openSections.pricing && (
                <>
                  <div className="price-inputs">
                    <input className="filter-input" type="number" placeholder="Min" value={filters.minPrice} onChange={e => setFilterValue('minPrice', e.target.value)} />
                    <input className="filter-input" type="number" placeholder="Max" value={filters.maxPrice} onChange={e => setFilterValue('maxPrice', e.target.value)} />
                  </div>
                  <div className="price-sliders">
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="500"
                      value={filters.minPrice || 0}
                      onChange={e => setFilterValue('minPrice', e.target.value)}
                    />
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="500"
                      value={filters.maxPrice || 50000}
                      onChange={e => setFilterValue('maxPrice', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="filter-group">
              <button type="button" className="filter-group-head" onClick={() => toggleSection('sort')}>
                Sort By
                <span>{openSections.sort ? '−' : '+'}</span>
              </button>
              {openSections.sort && (
                <select className="filter-select" value={filters.sort} onChange={e => setFilterValue('sort', e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="trending">Trending</option>
                </select>
              )}
            </div>

            <button type="button" className="clear-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </aside>

        <motion.main className="products-main" id="products-grid" initial="hidden" animate="visible" variants={pageVariants}>
          <div className="products-headline-row">
            <div>
              <h2 className="products-heading">All Products</h2>
              <p className="products-subheading">{filteredProducts.length} items in your current selection</p>
            </div>
            {infoMsg && <div className="products-toast">{infoMsg}</div>}
          </div>

          {error && <p className="products-error">{error}</p>}
          {isInvalidPriceRange && !error && (
            <p className="products-error">Invalid range: Min price cannot be greater than Max price.</p>
          )}

          {loading ? (
            <motion.div className="products-grid" variants={listVariants} initial="hidden" animate="visible">
              {skeletonItems.map((_, index) => (
                <motion.div key={index} className="product-card skeleton-card" variants={cardVariants}>
                  <div className="skeleton-img" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <>
              <motion.div className="products-grid" variants={listVariants} initial="hidden" animate="visible">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product, index) => (
                    <MotionLink
                      key={product._id}
                      to={`/products/${product._id}`}
                      className="product-card"
                      onClick={() => trackProductClick(product._id)}
                      style={{ animationDelay: `${index * 45}ms` }}
                      variants={cardVariants}
                      whileHover={{ y: -7, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="product-image-wrap">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)} alt={product.name} className="product-image" />
                        ) : (
                          <div className="product-image-fallback">{getCatIcon(product.category?.name)}</div>
                        )}

                        <div className="quick-actions">
                          <button
                            type="button"
                            className="quick-btn primary"
                            onClick={(event) => handleAddToCart(event, product)}
                            disabled={product.stock <= 0}
                            style={{ opacity: product.stock <= 0 ? 0.5 : 1, cursor: product.stock <= 0 ? 'not-allowed' : 'pointer' }}
                          >
                            Add to Cart
                          </button>
                          <button
                            type="button"
                            className="quick-btn"
                            onClick={(event) => handleWishlist(event, product)}
                          >
                            Wishlist
                          </button>
                        </div>

                        {getSaleLabel(product) > 0 && <span className="sale-badge">-{getSaleLabel(product)}%</span>}
                      </div>

                      <div className="product-body">
                        <div className="card-meta-row">
                          <span className="fabric-pill">{product.fabricType || 'Fabric'}</span>
                          <span className={`stock-pill ${product.stock > 0 ? 'ok' : 'out'}`}>
                            {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                          </span>
                        </div>

                        <h3 className="product-title">{product.name}</h3>
                        <p className="product-cat">{product.category?.name}</p>
                        <p className="product-desc">{(product.description || '').slice(0, 72)}...</p>

                        <div className="price-row">
                          {(product.discountPrice || getSaleLabel(product) > 0) && <span className="old-price">Rs. {getOriginalPrice(product)}</span>}
                          <span className="current-price">Rs. {getEffectivePrice(product)}</span>
                        </div>

                        {product.stock > 0 && product.stock < 10 && <span className="low-stock">Only {product.stock} left</span>}
                      </div>
                    </MotionLink>
                  ))
                ) : trending.length > 0 ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45 }}
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <div className="empty-state">
                        <div className="empty-emoji">🎯</div>
                        <h3>No products match your filters</h3>
                        <p>Check out our trending products instead:</p>
                      </div>
                    </motion.div>
                    {trending.map((product, index) => (
                      <MotionLink
                        key={product._id}
                        to={`/products/${product._id}`}
                        className="product-card"
                        onClick={() => trackProductClick(product._id)}
                        style={{ animationDelay: `${index * 45}ms` }}
                        variants={cardVariants}
                        whileHover={{ y: -7, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="product-image-wrap">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)} alt={product.name} className="product-image" />
                          ) : (
                            <div className="product-image-fallback">{getCatIcon(product.category?.name)}</div>
                          )}

                          <div className="quick-actions">
                            <button
                              type="button"
                              className="quick-btn primary"
                              onClick={(event) => handleAddToCart(event, product)}
                              disabled={product.stock <= 0}
                              style={{ opacity: product.stock <= 0 ? 0.5 : 1, cursor: product.stock <= 0 ? 'not-allowed' : 'pointer' }}
                            >
                              Add to Cart
                            </button>
                            <button
                              type="button"
                              className="quick-btn"
                              onClick={(event) => handleWishlist(event, product)}
                            >
                              Wishlist
                            </button>
                          </div>

                          {getSaleLabel(product) > 0 && <span className="sale-badge">-{getSaleLabel(product)}%</span>}
                        </div>

                        <div className="product-body">
                          <div className="card-meta-row">
                            <span className="fabric-pill">{product.fabricType || 'Fabric'}</span>
                            <span className={`stock-pill ${product.stock > 0 ? 'ok' : 'out'}`}>
                              {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                            </span>
                          </div>

                          <h3 className="product-title">{product.name}</h3>
                          <p className="product-cat">{product.category?.name}</p>
                          <p className="product-desc">{(product.description || '').slice(0, 72)}...</p>

                          <div className="price-row">
                            {(product.discountPrice || getSaleLabel(product) > 0) && <span className="old-price">Rs. {getOriginalPrice(product)}</span>}
                            <span className="current-price">Rs. {getEffectivePrice(product)}</span>
                          </div>

                          {product.stock > 0 && product.stock < 10 && <span className="low-stock">Only {product.stock} left</span>}
                        </div>
                      </MotionLink>
                    ))}
                  </>
                ) : (
                  <motion.div
                    className="empty-state"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <div className="empty-emoji">🧭</div>
                    <h3>No products found</h3>
                    <p>{isInvalidPriceRange ? 'Please enter a valid price range (Min must be less than or equal to Max).' : 'Try resetting filters or widening your price range.'}</p>
                  </motion.div>
                )}
              </motion.div>
            </>
          )}
        </motion.main>
      </div>
    </motion.div>
  );
};

export default Products;