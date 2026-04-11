import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { assistantChat, assistantSuggest } from '../services/api';
import { useCart } from '../context/CartContext';
import { getRecentlyViewedProducts } from '../utils/behaviorTracker';
import { getProductImage } from '../utils/productImage';
import { getEffectivePrice } from '../utils/pricing';

const CART_UPDATED_AT_KEY = 'wf_cart_updated_at';
const SESSION_ID_KEY = 'wf_ai_session_id';
const COUPON_KEY = 'wf_applied_coupon';
const DEFAULT_CHAT_WIDTH = 430;
const DEFAULT_CHAT_HEIGHT = 720;
const MIN_CHAT_WIDTH = 320;
const MIN_CHAT_HEIGHT = 420;

const quickPrompts = [
  'Show me cotton bedsheets under 3000',
  'Recommend products for me',
  'Where is my order?',
  'Apply SAVE10'
];

const getSessionId = () => {
  const existing = localStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const created = `sess_${Date.now()}_${Math.round(Math.random() * 100000)}`;
  localStorage.setItem(SESSION_ID_KEY, created);
  return created;
};

const ProductRow = ({ title, products, maxItems = 4 }) => {
  if (!products?.length) return null;

  return (
    <div style={{ marginTop: '10px' }}>
      <div style={styles.sectionTitle}>{title}</div>
      <div style={styles.productGrid}>
        {products.slice(0, maxItems).map((p) => (
          <Link key={p._id} to={`/products/${p.slug || p._id}`} style={styles.productCard}>
            <div style={styles.productThumbWrap}>
              {getProductImage(p) ? (
                <img src={getProductImage(p)} alt={p.name} style={styles.productThumb} />
              ) : (
                <span style={{ fontSize: '20px' }}>🛍️</span>
              )}
            </div>
            <div style={styles.productName}>{p.name}</div>
            <div style={styles.productPrice}>Rs. {getEffectivePrice(p)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const MessageBubble = ({ message, onPromptClick }) => {
  const isAssistant = message.role === 'assistant';

  return (
    <div style={{ ...styles.message, ...(isAssistant ? styles.assistantMsg : styles.userMsg) }}>
      <p style={{ margin: 0, lineHeight: 1.45 }}>{message.text}</p>

      {message.order?.timeline?.length > 0 && (
        <div style={styles.timelineWrap}>
          {message.order.timeline.map((step) => (
            <div key={step.step} style={styles.timelineStep}>
              <span style={{ ...styles.timelineDot, ...(step.completed ? styles.timelineDone : {}) }} />
              <span style={{ color: step.current ? '#0e7a6d' : '#6e6257', fontWeight: step.current ? 700 : 500 }}>{step.step}</span>
            </div>
          ))}
        </div>
      )}

      <ProductRow title="Results" products={message.products} maxItems={12} />
      <ProductRow title="Trending" products={message.recommendations?.trending} />
      <ProductRow title="Personalized" products={message.recommendations?.personalized} />
      <ProductRow title="Customers Also Bought" products={message.recommendations?.alsoBought} />

      {message.suggestions?.length > 0 && (
        <div style={styles.suggestionWrap}>
          {message.suggestions.slice(0, 4).map((s) => (
            <button key={s} type="button" style={styles.suggestChip} className="chat-chip" onClick={() => onPromptClick(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatAssistant = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [autoSuggestions, setAutoSuggestions] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: DEFAULT_CHAT_WIDTH, height: DEFAULT_CHAT_HEIGHT });
  const resizeStartRef = useRef(null);
  const bodyRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi, I am your WF AI shopping assistant. I can find products, recommend items, track orders, apply coupons, and update your cart.',
      suggestions: quickPrompts
    }
  ]);

  const { cartItems, addToCart, removeFromCart } = useCart();
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || !bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => () => {
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResizing);
  }, []);

  const clampSize = (nextWidth, nextHeight) => {
    const maxWidth = Math.max(MIN_CHAT_WIDTH, window.innerWidth - 24);
    const maxHeight = Math.max(MIN_CHAT_HEIGHT, window.innerHeight - 24);
    return {
      width: Math.min(Math.max(nextWidth, MIN_CHAT_WIDTH), maxWidth),
      height: Math.min(Math.max(nextHeight, MIN_CHAT_HEIGHT), maxHeight)
    };
  };

  const handleResizeMove = (event) => {
    if (!resizeStartRef.current) return;
    const deltaX = event.clientX - resizeStartRef.current.startX;
    const next = clampSize(
      resizeStartRef.current.startWidth - deltaX,
      resizeStartRef.current.startHeight
    );
    setWindowSize(next);
  };

  const stopResizing = () => {
    resizeStartRef.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', stopResizing);
  };

  const startSideResizing = (event) => {
    event.preventDefault();
    resizeStartRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: windowSize.width,
      startHeight: windowSize.height
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', stopResizing);
  };

  const runAutocomplete = async (value) => {
    if (!value || value.length < 2) {
      setAutoSuggestions([]);
      return;
    }

    try {
      const res = await assistantSuggest(value);
      setAutoSuggestions(res.data.suggestions || []);
    } catch {
      setAutoSuggestions([]);
    }
  };

  const applyCartAction = (cartAction) => {
    if (!cartAction?.product) return;

    const product = cartAction.product;
    if (cartAction.type === 'add') {
      addToCart({
        ...product,
        quantity: cartAction.quantity || 1,
        selectedSize: product.sizes?.[0] || '',
        selectedColor: product.colors?.[0] || ''
      });
      return;
    }

    const variants = cartItems.filter((item) => item._id === product._id);
    if (!variants.length) return;

    variants.forEach((item) => {
      removeFromCart(item._id, item.selectedSize, item.selectedColor);
    });
  };

  const sendMessage = async (messageText) => {
    const prompt = (messageText || input).trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setInput('');
    setAutoSuggestions([]);
    setLoading(true);

    try {
      const payload = {
        message: prompt,
        sessionId,
        cartItems,
        recentlyViewed: getRecentlyViewedProducts(),
        lastCartActivityAt: localStorage.getItem(CART_UPDATED_AT_KEY)
      };

      const res = await assistantChat(payload);
      const data = res.data;

      if (data.cartAction) {
        applyCartAction(data.cartAction);
      }

      if (data.coupon) {
        localStorage.setItem(COUPON_KEY, JSON.stringify({
          ...data.coupon,
          appliedAt: new Date().toISOString()
        }));
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'I am here to help.',
          products: data.products,
          recommendations: data.recommendations,
          suggestions: data.suggestions,
          order: data.order
        }
      ]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: error.response?.data?.error || 'Assistant is temporarily unavailable.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <button style={styles.fab} className="hover-btn" onClick={() => setOpen(true)}>
          AI Help
        </button>
      )}

      {open && (
        <div style={styles.overlay} onClick={() => setOpen(false)}>
          <div style={{ ...styles.window, width: `min(${windowSize.width}px, calc(100vw - 24px))`, height: `min(${windowSize.height}px, calc(100vh - 24px))` }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.header}>
              <div>
                <div style={styles.headerTitle}>WF AI Concierge</div>
                <div style={styles.headerSub}>Product search, recommendations, order help</div>
              </div>
              <button style={styles.closeBtn} className="hover-btn" onClick={() => setOpen(false)} aria-label="Close AI Help">×</button>
            </div>

            <div style={styles.body} ref={bodyRef}>
              {messages.map((m, idx) => (
                <MessageBubble key={`${m.role}-${idx}`} message={m} onPromptClick={sendMessage} />
              ))}
              {loading && <div style={{ ...styles.message, ...styles.assistantMsg }}>Thinking...</div>}
            </div>

            <div style={styles.inputWrap}>
              <div style={styles.quickRow}>
                {quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" style={styles.quickChip} className="chat-chip" onClick={() => sendMessage(prompt)}>{prompt}</button>
                ))}
              </div>

              {autoSuggestions.length > 0 && (
                <div style={styles.autoBox}>
                  {autoSuggestions.slice(0, 5).map((s, i) => (
                    <button
                      key={`${s.value}-${i}`}
                      type="button"
                      style={styles.autoItem}
                      className="chat-chip"
                      onClick={() => {
                        setInput(s.value);
                        setAutoSuggestions([]);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div style={styles.inputRow}>
                <input
                  style={styles.input}
                  value={input}
                  onChange={(e) => {
                    const next = e.target.value;
                    setInput(next);
                    runAutocomplete(next);
                  }}
                  placeholder="Ask anything about products, orders, cart..."
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={styles.sendBtn} className="hover-btn" onClick={() => sendMessage()} disabled={loading}>Send</button>
              </div>
            </div>

            <div
              style={styles.resizeSide}
              onMouseDown={startSideResizing}
              aria-label="Resize chat width"
              title="Drag side to resize width"
            />
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  fab: {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    zIndex: 1100,
    border: 'none',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, #0e7a6d, #0a564d)',
    color: '#fff',
    padding: '14px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 14px 28px rgba(0,0,0,.25)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1099,
    backgroundColor: 'rgba(0, 0, 0, 0.14)'
  },
  window: {
    position: 'fixed',
    right: '18px',
    bottom: '18px',
    width: 'min(430px, calc(100vw - 24px))',
    height: 'min(78vh, 720px)',
    zIndex: 1100,
    backgroundColor: '#fffdfa',
    border: '1px solid #dfd2c1',
    borderRadius: '18px',
    overflow: 'hidden',
    resize: 'none',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    boxShadow: '0 22px 40px rgba(28,22,18,.22)'
  },
  header: {
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a6e64, #10524b)',
    color: '#fff'
  },
  headerTitle: { fontWeight: 800, fontSize: '15px' },
  headerSub: { opacity: 0.9, fontSize: '12px', marginTop: '2px' },
  closeBtn: {
    border: '1px solid rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    fontSize: '24px',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: { padding: '12px', overflowY: 'auto', backgroundColor: '#faf6ef', minWidth: 0 },
  message: {
    padding: '10px 12px',
    borderRadius: '12px',
    marginBottom: '10px',
    fontSize: '13px',
    wordBreak: 'break-word',
    minWidth: 0
  },
  assistantMsg: {
    backgroundColor: '#fff',
    border: '1px solid #eadfce',
    color: '#2c231d'
  },
  userMsg: {
    backgroundColor: '#d8efe9',
    border: '1px solid #b8ded5',
    color: '#18443f',
    marginLeft: '26px'
  },
  suggestionWrap: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' },
  suggestChip: {
    border: '1px solid #c9b8a6',
    backgroundColor: '#fff',
    borderRadius: '999px',
    fontSize: '11px',
    padding: '4px 8px',
    cursor: 'pointer'
  },
  sectionTitle: { margin: '6px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7c6d61' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', minWidth: 0 },
  productCard: { textDecoration: 'none', color: '#1f1a16', border: '1px solid #e5d8c9', borderRadius: '10px', backgroundColor: '#fff', padding: '7px', display: 'flex', flexDirection: 'column', minWidth: 0 },
  productThumbWrap: { height: '68px', borderRadius: '8px', backgroundColor: '#f2e7d9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', overflow: 'hidden' },
  productThumb: { width: '100%', height: '68px', objectFit: 'cover' },
  productName: { fontSize: '12px', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' },
  productPrice: { fontSize: '12px', color: '#0e7a6d', fontWeight: 700, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  timelineWrap: { marginTop: '8px', display: 'grid', gap: '4px' },
  timelineStep: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' },
  timelineDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#cbbcae' },
  timelineDone: { backgroundColor: '#0e7a6d' },
  inputWrap: { borderTop: '1px solid #e6d9ca', padding: '10px', backgroundColor: '#fffdfa' },
  quickRow: { display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' },
  quickChip: {
    border: '1px solid #d7c8b8',
    background: '#fff',
    borderRadius: '999px',
    fontSize: '11px',
    padding: '4px 9px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  autoBox: { border: '1px solid #dfd1bf', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' },
  autoItem: { display: 'block', width: '100%', textAlign: 'left', border: 'none', background: '#fff', padding: '8px', fontSize: '12px', cursor: 'pointer' },
  inputRow: { display: 'flex', gap: '8px' },
  input: { flex: 1, border: '1px solid #d6c8b7', borderRadius: '10px', padding: '10px', fontSize: '13px' },
  sendBtn: { border: 'none', borderRadius: '10px', backgroundColor: '#0e7a6d', color: '#fff', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  resizeSide: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '10px',
    height: '100%',
    background: 'linear-gradient(90deg, rgba(14,122,109,0.18), rgba(14,122,109,0.02))',
    cursor: 'ew-resize',
    zIndex: 4
  }
};

export default ChatAssistant;
