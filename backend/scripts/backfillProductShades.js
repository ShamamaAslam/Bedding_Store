require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../Models/Products');

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

const deriveShadeCategories = (product) => {
  const values = [
    ...(product?.color ? [product.color] : []),
    ...(Array.isArray(product?.colors) ? product.colors : []),
    ...(Array.isArray(product?.images) ? product.images.map((img) => img?.color).filter(Boolean) : [])
  ];

  const shades = new Set();
  values.forEach((value) => {
    const tone = classifyTone(value);
    if (tone === 'light' || tone === 'both') shades.add('light');
    if (tone === 'dark' || tone === 'both') shades.add('dark');
  });

  return Array.from(shades);
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const products = await Product.find({}, { _id: 1, color: 1, colors: 1, images: 1, shadeCategories: 1 }).lean();
    const productsWithNames = await Product.find({}, { _id: 1, name: 1, color: 1, colors: 1, images: 1, shadeCategories: 1 }).lean();
    const inferredByName = new Map();

    productsWithNames.forEach((product) => {
      const key = normalize(product?.name || '');
      if (!key) return;

      const derived = deriveShadeCategories(product);
      if (!derived.length) return;

      const existing = inferredByName.get(key) || new Set();
      derived.forEach((shade) => existing.add(shade));
      inferredByName.set(key, existing);
    });

    const ops = [];

    productsWithNames.forEach((product) => {
      const nextShadeCategories = deriveShadeCategories(product);
      if (!nextShadeCategories.length) {
        const inferred = inferredByName.get(normalize(product?.name || ''));
        if (inferred && inferred.size) {
          inferred.forEach((shade) => nextShadeCategories.push(shade));
        }
      }

      const current = Array.isArray(product.shadeCategories) ? product.shadeCategories.slice().sort() : [];
      const next = nextShadeCategories.slice().sort();

      if (JSON.stringify(current) !== JSON.stringify(next)) {
        ops.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: { shadeCategories: nextShadeCategories } }
          }
        });
      }
    });

    if (ops.length > 0) {
      const result = await Product.bulkWrite(ops, { ordered: false });
      console.log(`Updated shadeCategories for ${result.modifiedCount || 0} products.`);
    } else {
      console.log('No products required shadeCategories update.');
    }
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
