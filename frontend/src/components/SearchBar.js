import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../services/api';
import { getProductImage } from '../utils/productImage';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await getProducts({ search: query });
        setResults(response.data.products || []);
        setShowDropdown(true);
        setHighlightedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target) && !containerRef.current?.contains(e.target)) {
        setShowDropdown(false);
        if (!query.trim()) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      if (!query.trim()) {
        setIsExpanded(false);
      }
      return;
    }

    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < results.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          navigate(`/products/${results[highlightedIndex]._id}`);
          setShowDropdown(false);
          setQuery('');
          setIsExpanded(false);
        }
        break;
      default:
        break;
    }
  };

  const handleProductClick = (productId) => {
    navigate(`/products/${productId}`);
    setShowDropdown(false);
    setQuery('');
    setIsExpanded(false);
  };

  const handleImageError = (productId) => {
    setBrokenImageIds((prev) => {
      if (prev.has(productId)) return prev;

      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
      setShowDropdown(false);
      setIsExpanded(false);
    }
  };

  const toggleSearch = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded && !query.trim()) {
      setQuery('');
      setResults([]);
      setShowDropdown(false);
    }
  };

  const highlightMatch = (text, searchQuery) => {
    if (!text || !searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, idx) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={idx} style={{ backgroundColor: '#fff4e6', fontWeight: 600, borderRadius: '2px', padding: '0 2px' }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {!isExpanded ? (
        // Collapsed search button
        <button
          onClick={toggleSearch}
          style={styles.searchButton}
          aria-label="Open search"
          type="button"
        >
          🔍
        </button>
      ) : (
        // Expanded search form
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputWrapper}>
            <span style={styles.icon}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search bedsheets, fabrics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query && setShowDropdown(true)}
              style={styles.input}
              aria-label="Search products"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setShowDropdown(false);
                  inputRef.current?.focus();
                }}
                style={styles.clearBtn}
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleSearch}
                style={styles.closeBtn}
                aria-label="Close search"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      )}

      {isExpanded && showDropdown && (
        <div ref={dropdownRef} style={styles.dropdown}>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner}></div>
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <>
              <div style={styles.resultsHeader}>
                <span>{results.length} item{results.length !== 1 ? 's' : ''} found</span>
              </div>
              <div style={styles.resultsList}>
                {results.slice(0, 8).map((product, index) => (
                  <div
                    key={product._id}
                    style={{
                      ...styles.resultItem,
                      ...(highlightedIndex === index ? styles.resultItemHighlighted : {})
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleProductClick(product._id)}
                  >
                    <div style={styles.productImageWrapper}>
                      {!brokenImageIds.has(product._id) && getProductImage(product) ? (
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          style={styles.productImage}
                          onError={() => handleImageError(product._id)}
                        />
                      ) : (
                        <div style={styles.noImage}>
                          <span style={styles.noImageLabel}>No preview</span>
                        </div>
                      )}
                    </div>
                    <div style={styles.productDetails}>
                      <div style={styles.productName}>
                        {highlightMatch(product.name, query)}
                      </div>
                      <div style={styles.productPrice}>
                        Rs. {product.discountPrice || product.price}
                        {product.discountPrice && (
                          <>
                            {' '}
                            <strike style={styles.originalPrice}>
                              {product.price}
                            </strike>
                          </>
                        )}
                      </div>
                      {product.stock > 0 ? (
                        <div style={styles.inStock}>In Stock</div>
                      ) : (
                        <div style={styles.outOfStock}>Out of Stock</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {results.length > 8 && (
                <div style={styles.viewAll}>
                  <button
                    onClick={handleSubmit}
                    style={styles.viewAllBtn}
                  >
                    View all {results.length} results →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={styles.noResults}>
              <span>No products found for "{query}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    position: 'relative',
    width: 'auto',
    zIndex: 500
  },
  searchButton: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(250,245,240,0.85))',
    border: '1.5px solid rgba(196, 175, 155, 0.5)',
    borderRadius: '999px',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 260ms ease',
    boxShadow: '0 4px 16px rgba(31, 26, 22, 0.06)'
  },
  form: {
    width: 'auto'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(250,245,240,0.85))',
    border: '1.5px solid rgba(196, 175, 155, 0.5)',
    borderRadius: '999px',
    padding: '0 14px',
    transition: 'all 260ms ease',
    boxShadow: '0 4px 16px rgba(31, 26, 22, 0.06)',
    minWidth: '280px',
    animation: 'expandSearch 260ms ease'
  },
  icon: {
    fontSize: '16px',
    color: '#b8936d'
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '11px 0',
    fontSize: '14px',
    color: '#3c3530',
    outline: 'none',
    fontFamily: 'inherit'
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#b8936d',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    transition: 'color 200ms ease'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#b8936d',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: '4px',
    transition: 'color 200ms ease',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '14px',
    boxShadow: '0 16px 48px rgba(31, 26, 22, 0.15)',
    border: '1px solid rgba(200, 180, 160, 0.3)',
    maxHeight: '500px',
    overflowY: 'auto',
    zIndex: 1001,
    animation: 'slideDown 200ms ease'
  },
  resultsHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(200, 180, 160, 0.2)',
    fontSize: '12px',
    color: '#8f7f77',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  resultsList: {
    maxHeight: '400px',
    overflowY: 'auto'
  },
  resultItem: {
    display: 'flex',
    gap: '12px',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'background-color 140ms ease',
    borderBottom: '1px solid rgba(200, 180, 160, 0.15)'
  },
  resultItemHighlighted: {
    backgroundColor: 'rgba(206, 122, 54, 0.08)',
    borderLeft: '3px solid #ce7a36'
  },
  productImageWrapper: {
    width: '56px',
    height: '56px',
    flexShrink: 0,
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f5f1ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  productImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  noImage: {
    fontSize: '11px',
    color: '#b8936d',
    textAlign: 'center',
    padding: '8px'
  },
  productDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0
  },
  productName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3c3530',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  productPrice: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#ce7a36'
  },
  originalPrice: {
    color: '#b8936d',
    fontSize: '11px',
    fontWeight: 500
  },
  inStock: {
    fontSize: '11px',
    color: '#0e7a6d',
    fontWeight: 600
  },
  outOfStock: {
    fontSize: '11px',
    color: '#c74444',
    fontWeight: 600
  },
  loadingState: {
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: '#8f7f77'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(206, 122, 54, 0.2)',
    borderTop: '2px solid #ce7a36',
    borderRadius: '50%',
    animation: 'spin 800ms linear infinite'
  },
  noResults: {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#8f7f77',
    fontSize: '14px'
  },
  viewAll: {
    padding: '12px 12px',
    borderTop: '1px solid rgba(200, 180, 160, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)'
  },
  viewAllBtn: {
    width: '100%',
    padding: '10px 12px',
    background: 'linear-gradient(135deg, rgba(206, 122, 54, 0.08), rgba(176, 95, 34, 0.06))',
    border: '1px solid rgba(206, 122, 54, 0.2)',
    borderRadius: '8px',
    color: '#ce7a36',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 200ms ease'
  }
};

// Add keyframe animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes expandSearch {
    from {
      opacity: 0.8;
      transform: scaleX(0.95);
    }
    to {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  div[style*="maxHeight: 500px"]::-webkit-scrollbar {
    width: 6px;
  }

  div[style*="maxHeight: 500px"]::-webkit-scrollbar-track {
    background-color: rgba(200, 180, 160, 0.1);
  }

  div[style*="maxHeight: 500px"]::-webkit-scrollbar-thumb {
    background-color: rgba(206, 122, 54, 0.3);
    border-radius: 3px;
  }

  div[style*="maxHeight: 500px"]::-webkit-scrollbar-thumb:hover {
    background-color: rgba(206, 122, 54, 0.5);
  }

  div[style*="maxHeight: 400px"]::-webkit-scrollbar {
    width: 6px;
  }

  div[style*="maxHeight: 400px"]::-webkit-scrollbar-track {
    background-color: rgba(200, 180, 160, 0.1);
  }

  div[style*="maxHeight: 400px"]::-webkit-scrollbar-thumb {
    background-color: rgba(206, 122, 54, 0.3);
    border-radius: 3px;
  }

  div[style*="maxHeight: 400px"]::-webkit-scrollbar-thumb:hover {
    background-color: rgba(206, 122, 54, 0.5);
  }
`;
document.head.appendChild(styleSheet);

export default SearchBar;
