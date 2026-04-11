const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Categories', required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true, default: 0 },
  images: [{ url: String, alt: String, color: String }],
  fabricType: { type: String, trim: true },
  sizes: [{ type: String }],
  sizePrices: [{
    size: { type: String, trim: true },
    price: { type: Number, min: 0 }
  }],
  colors: [String],
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
});

module.exports = mongoose.model('Products', productSchema);