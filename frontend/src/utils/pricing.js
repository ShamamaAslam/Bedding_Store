const STORE_SALE_KEY = 'wf_store_sale_percent';

const normalizeSizeName = (value = '') => String(value).trim().toLowerCase();

export const getSizePrice = (product, selectedSize) => {
  if (!product) return null;

  const targetSize = normalizeSizeName(selectedSize);
  if (!targetSize || !Array.isArray(product.sizePrices) || product.sizePrices.length === 0) {
    return null;
  }

  const match = product.sizePrices.find((entry) => normalizeSizeName(entry?.size) === targetSize);
  const price = Number(match?.price);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

const getBasePrice = (product, selectedSize) => {
  const sizePrice = getSizePrice(product, selectedSize);
  if (sizePrice !== null) return sizePrice;

  if (Array.isArray(product?.sizePrices) && product.sizePrices.length > 0) {
    const numericPrices = product.sizePrices
      .map((entry) => Number(entry?.price))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (numericPrices.length > 0) {
      return Math.min(...numericPrices);
    }
  }

  return Number(product?.price || 0);
};

export const getStoreSalePercent = () => {
  try {
    const expires = localStorage.getItem('wf_store_sale_expires');
    if (expires) {
      const expireTime = new Date(expires).getTime();
      if (Date.now() > expireTime) {
        localStorage.removeItem(STORE_SALE_KEY);
        localStorage.removeItem('wf_store_sale_expires');
        return 0;
      }
    }
    const value = Number(localStorage.getItem(STORE_SALE_KEY) || 0);
    return Number.isFinite(value) && value > 0 ? Math.min(90, value) : 0;
  } catch {
    return 0;
  }
};

export const getEffectivePrice = (product, selectedSize = product?.selectedSize) => {
  if (!product) return 0;

  const basePrice = getBasePrice(product, selectedSize);
  
  // Check if product-level discount has expired
  let hasValidProductDiscount = false;
  let productDiscount = 0;
  
  if (!(Array.isArray(product.sizePrices) && product.sizePrices.length > 0)) {
    const discountVal = Number(product.discountPrice || 0);
    if (discountVal > 0) {
      const expires = product.discountExpires;
      if (expires) {
        const expireTime = new Date(expires).getTime();
        if (Date.now() <= expireTime) {
          hasValidProductDiscount = true;
          productDiscount = discountVal;
        }
      } else {
        hasValidProductDiscount = true;
        productDiscount = discountVal;
      }
    }
  }

  const storeSale = getStoreSalePercent();

  if (hasValidProductDiscount && productDiscount > 0) {
    return productDiscount;
  }

  if (storeSale > 0) {
    return Math.max(0, Math.round(basePrice - (basePrice * storeSale) / 100));
  }

  return basePrice;
};

export const getSaleLabel = (product, selectedSize = product?.selectedSize) => {
  if (!product) return '';

  let hasValidProductDiscount = false;
  let discounted = 0;

  if (product.discountPrice && !(Array.isArray(product.sizePrices) && product.sizePrices.length > 0)) {
    const discountVal = Number(product.discountPrice || 0);
    if (discountVal > 0) {
      const expires = product.discountExpires;
      if (expires) {
        const expireTime = new Date(expires).getTime();
        if (Date.now() <= expireTime) {
          hasValidProductDiscount = true;
          discounted = discountVal;
        }
      } else {
        hasValidProductDiscount = true;
        discounted = discountVal;
      }
    }
  }

  if (hasValidProductDiscount && discounted > 0) {
    const original = getBasePrice(product, selectedSize);
    if (original > 0 && discounted < original) {
      return Math.round(((original - discounted) / original) * 100);
    }
    return 0;
  }

  const sale = getStoreSalePercent();
  return sale > 0 ? sale : 0;
};

export const getOriginalPrice = (product, selectedSize = product?.selectedSize) => {
  if (!product) return 0;
  return getBasePrice(product, selectedSize);
};

export const setStoreSalePercent = (percent, expiresAt = null) => {
  try {
    const value = Number(percent);
    if (!Number.isFinite(value) || value <= 0) {
      localStorage.removeItem(STORE_SALE_KEY);
      localStorage.removeItem('wf_store_sale_expires');
      window.dispatchEvent(new StorageEvent('storage', { key: STORE_SALE_KEY, newValue: null }));
      return 0;
    }

    const normalized = Math.min(90, Math.max(0, Math.round(value)));
    localStorage.setItem(STORE_SALE_KEY, String(normalized));
    if (expiresAt) {
      localStorage.setItem('wf_store_sale_expires', new Date(expiresAt).toISOString());
    } else {
      localStorage.removeItem('wf_store_sale_expires');
    }
    window.dispatchEvent(new StorageEvent('storage', { key: STORE_SALE_KEY, newValue: String(normalized) }));
    return normalized;
  } catch {
    return 0;
  }
};

export const clearStoreSale = () => {
  localStorage.removeItem('wf_store_sale_expires');
  setStoreSalePercent(0);
};
