const VIEW_KEY = 'wf_recently_viewed_products';
const SESSION_KEY = 'wf_session_id';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBase();

const persist = (ids) => {
  localStorage.setItem(VIEW_KEY, JSON.stringify(ids.slice(0, 15)));
};

const read = () => {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const pushUnique = (productId) => {
  if (!productId) return;
  const current = read();
  const next = [productId, ...current.filter((id) => id !== productId)];
  persist(next);
};

const getSessionId = () => {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const created = `wf_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return `wf_fallback_${Date.now()}`;
  }
};

const getAuthToken = () => {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token || '';
  } catch {
    return '';
  }
};

const sendEvent = async (payload) => {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await fetch(`${API_BASE}/analytics/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        sessionId: getSessionId(),
        page: window.location.pathname
      }),
      keepalive: true
    });
  } catch {
    // Do not block UI on analytics failures.
  }
};

export const trackViewedProduct = (productId) => {
  pushUnique(productId);
  sendEvent({ eventType: 'product_view', productId });
};

export const trackProductClick = (productId) => {
  pushUnique(productId);
  sendEvent({ eventType: 'product_click', productId });
};

export const trackSearchKeyword = (keyword, metadata = {}) => {
  const normalized = String(keyword || '').trim().toLowerCase();
  if (!normalized) return;

  sendEvent({
    eventType: 'search_query',
    keyword: normalized,
    source: metadata?.source || 'catalog',
    metadata
  });
};

export const trackCartEvent = ({ action = 'add_to_cart', productId, quantity = 1, metadata = {} }) => {
  if (!productId) return;

  sendEvent({
    eventType: action,
    productId,
    metadata: {
      quantity,
      ...metadata
    }
  });
};

export const trackWishlistEvent = ({ action = 'wishlist_add', productId }) => {
  if (!productId) return;
  sendEvent({ eventType: action, productId });
};

export const trackCheckoutEvent = ({ step, metadata = {} }) => {
  const eventType = step || '';
  if (!eventType) return;
  sendEvent({ eventType, step: eventType, source: 'checkout', metadata });
};

export const trackSessionSource = (source) => {
  if (!source) return;
  sendEvent({ eventType: 'session_source', source, metadata: { source } });
};

export const getRecentlyViewedProducts = () => read();
export const getBehaviorSessionId = () => getSessionId();
