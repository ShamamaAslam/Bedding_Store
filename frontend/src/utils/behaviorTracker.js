const VIEW_KEY = 'wf_recently_viewed_products';

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

export const trackViewedProduct = (productId) => {
  pushUnique(productId);
};

export const trackProductClick = (productId) => {
  pushUnique(productId);
};

export const getRecentlyViewedProducts = () => read();
