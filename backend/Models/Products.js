const mongoose = require('mongoose');

const LIGHT_COLORS = new Set([
  'white', 'ivory', 'cream', 'beige', 'stone', 'silver', 'champagne', 'yellow',
  'off white', 'off-white', 'pastel', 'blush', 'pink', 'rose', 'sage', 'light green',
  'mint', 'peach', 'lavender', 'baby blue', 'sky blue', 'light blue', 'light pink',
  'light grey', 'light gray', 'grey', 'gray'
]);

const DARK_COLORS = new Set([
  'black', 'charcoal', 'graphite', 'navy', 'dark blue', 'midnight', 'indigo',
  'maroon', 'burgundy', 'wine', 'ruby', 'plum', 'dark green', 'emerald', 'teal',
  'olive', 'brown', 'red', 'mustard', 'coffee', 'mocha', 'slate'
]);

const normalize = (value = '') => value.toString().toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

const classifyTone = (value = '') => {
  const color = normalize(value);
  if (!color) return null;

  const isLight = color.startsWith('light ') || LIGHT_COLORS.has(color);
  const isDark = color.startsWith('dark ') || DARK_COLORS.has(color);

  if (isLight && isDark) return 'both';
  if (isLight) return 'light';
  if (isDark) return 'dark';
  return null;
};

const deriveShadeCategories = (doc) => {
  const values = [
    ...(doc?.color ? [doc.color] : []),
    ...(Array.isArray(doc?.colors) ? doc.colors : []),
    ...(Array.isArray(doc?.images) ? doc.images.map((img) => img?.color).filter(Boolean) : [])
  ];

  const shades = new Set();
  values.forEach((value) => {
    const tone = classifyTone(value);
    if (tone === 'light' || tone === 'both') shades.add('light');
    if (tone === 'dark' || tone === 'both') shades.add('dark');
  });

  return Array.from(shades);
};

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories', required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0, default: 0 },
  shippingCost: { type: Number, min: 0, default: 0 },
  marketingCost: { type: Number, min: 0, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  images: [{ url: String, alt: String, color: String }],
  fabricType: { type: String, trim: true },
  supplier: {
    name: { type: String, trim: true, default: '' },
    avgDeliveryDays: { type: Number, min: 0, default: 0 },
    qualityScore: { type: Number, min: 0, max: 5, default: 0 }
  },
  sizes: [{ type: String }],
  sizePrices: [{
    size: { type: String, trim: true },
    price: { type: Number, min: 0 }
  }],
  colors: [String],
  shadeCategories: [{ type: String, enum: ['light', 'dark'] }],
  views: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  // ── SEO Fields ──────────────────────────────────────────
  slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  metaTitle: { type: String, trim: true, maxlength: 70 },
  metaDescription: { type: String, trim: true, maxlength: 160 },
  metaKeywords: [{ type: String, trim: true }],
  // ────────────────────────────────────────────────────────

  createdAt: { type: Date, default: Date.now }
});

// Auto-generate slug from name if not provided
productSchema.pre('save', function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const derivedShades = deriveShadeCategories(this);
  const selectedShades = Array.isArray(this.shadeCategories)
    ? this.shadeCategories.map((shade) => normalize(shade)).filter((shade) => shade === 'light' || shade === 'dark')
    : [];

  this.shadeCategories = Array.from(new Set([...selectedShades, ...derivedShades]));
});

module.exports = mongoose.model('Products', productSchema);