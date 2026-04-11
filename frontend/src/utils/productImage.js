const API_BASE_URL = 'http://localhost:5000';

const makeAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  if (trimmed.startsWith('uploads/')) {
    return `${API_BASE_URL}/${trimmed}`;
  }

  return trimmed;
};

const normalizeColor = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

export const getProductImageEntries = (product) => {
  if (!product) return [];

  const entries = [];
  const seen = new Set();

  if (Array.isArray(product.images)) {
    for (const image of product.images) {
      if (typeof image === 'string') {
        const resolved = makeAbsoluteUrl(image);
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          entries.push({ url: resolved, alt: product?.name || 'Product image', color: '' });
        }
      }

      if (image && typeof image === 'object') {
        const resolved = makeAbsoluteUrl(image.url || image.path || image.src);
        if (resolved && !seen.has(resolved)) {
          seen.add(resolved);
          entries.push({
            url: resolved,
            alt: image.alt || product?.name || 'Product image',
            color: normalizeColor(image.color || image.variantColor)
          });
        }
      }
    }
  }

  const fallback = makeAbsoluteUrl(product.image || product.imageUrl || product.photo);
  if (fallback && !seen.has(fallback)) {
    entries.push({ url: fallback, alt: product?.name || 'Product image', color: '' });
  }

  return entries;
};

export const getProductImagesByColor = (product, color) => {
  const targetColor = normalizeColor(color).toLowerCase();
  if (!targetColor) return [];

  return getProductImageEntries(product)
    .filter((entry) => normalizeColor(entry.color).toLowerCase() === targetColor)
    .map((entry) => entry.url);
};

export const getProductImage = (product) => {
  const images = getProductImages(product);
  if (images.length > 0) return images[0];

  return makeAbsoluteUrl(product?.image || product?.imageUrl || product?.photo);
};

export const getProductImages = (product) => {
  return getProductImageEntries(product).map((entry) => entry.url);
};
