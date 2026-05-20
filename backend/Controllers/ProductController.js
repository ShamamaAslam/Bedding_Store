const mongoose = require('mongoose');
const Product = require('../Models/Products');
const Category = require('../Models/Categories');

const parseArrayField = (value, { preserveEmpty = false } = {}) => {
  if (Array.isArray(value)) {
    return preserveEmpty ? value : value.filter(Boolean);
  }
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return preserveEmpty ? parsed : parsed.filter(Boolean);
  } catch (_) {
    const pieces = trimmed.split(',').map(item => item.trim());
    return preserveEmpty ? pieces : pieces.filter(Boolean);
  }

  return [];
};

const normalizeColorValue = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const parseShadeCategories = (value) => {
  const allowed = new Set(['light', 'dark']);
  const values = parseArrayField(value)
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => allowed.has(item));

  return Array.from(new Set(values));
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseSizePricesField = (value) => {
  if (value === undefined) return undefined;

  let parsed = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      parsed = JSON.parse(trimmed);
    } catch (_) {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const size = typeof entry.size === 'string' ? entry.size.trim() : '';
      const price = Number(entry.price);

      if (!size || !Number.isFinite(price) || price < 0) return null;

      return { size, price };
    })
    .filter(Boolean);
};

const toSlug = (value = '') => {
  const normalized = String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `product-${Date.now()}`;
};

const ensureUniqueSlug = async (baseSlug, { excludeId } = {}) => {
  const safeBase = toSlug(baseSlug);
  let candidate = safeBase;
  let suffix = 2;

  while (true) {
    const existing = await Product.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }).select('_id');

    if (!existing) return candidate;

    candidate = `${safeBase}-${suffix}`;
    suffix += 1;
  }
};

const parseImageEntriesField = (value) => {
  if (value === undefined) return null;

  let parsed = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      parsed = JSON.parse(trimmed);
    } catch (_) {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const url = typeof entry.url === 'string' ? entry.url.trim() : '';
      if (!url) return null;

      const alt = typeof entry.alt === 'string' ? entry.alt.trim() : '';
      const color = normalizeColorValue(entry.color);

      return {
        url,
        ...(alt ? { alt } : {}),
        ...(color ? { color } : {})
      };
    })
    .filter(Boolean);
};

const buildProductPayload = (req, { forUpdate = false } = {}) => {
  const body = req.body || {};
  const payload = {};

  const setString = (key, { allowEmpty = false } = {}) => {
    if (typeof body[key] === 'string') {
      const trimmed = body[key].trim();

      if (allowEmpty || trimmed) {
        payload[key] = trimmed;
      }
    }
  };

  ['name', 'description', 'category', 'fabricType'].forEach(key => setString(key, { allowEmpty: false }));
  ['slug', 'metaTitle', 'metaDescription'].forEach(key => setString(key, { allowEmpty: false }));

  if (body.price !== undefined && body.price !== '') payload.price = Number(body.price);
  if (body.stock !== undefined && body.stock !== '') payload.stock = Number(body.stock);
  if (body.costPrice !== undefined && body.costPrice !== '') payload.costPrice = Number(body.costPrice);
  if (body.shippingCost !== undefined && body.shippingCost !== '') payload.shippingCost = Number(body.shippingCost);
  if (body.marketingCost !== undefined && body.marketingCost !== '') payload.marketingCost = Number(body.marketingCost);

  const supplierName = typeof body.supplierName === 'string' ? body.supplierName.trim() : '';
  const supplierAvgDeliveryDays = body.supplierAvgDeliveryDays !== undefined && body.supplierAvgDeliveryDays !== ''
    ? Number(body.supplierAvgDeliveryDays)
    : undefined;
  const supplierQualityScore = body.supplierQualityScore !== undefined && body.supplierQualityScore !== ''
    ? Number(body.supplierQualityScore)
    : undefined;

  if (supplierName || supplierAvgDeliveryDays !== undefined || supplierQualityScore !== undefined) {
    payload.supplier = {
      name: supplierName,
      ...(supplierAvgDeliveryDays !== undefined ? { avgDeliveryDays: supplierAvgDeliveryDays } : {}),
      ...(supplierQualityScore !== undefined ? { qualityScore: supplierQualityScore } : {})
    };
  }

  if (body.discountPrice === '') {
    payload.discountPrice = undefined;
  } else if (body.discountPrice !== undefined) {
    payload.discountPrice = Number(body.discountPrice);
  }

  if (body.discountExpires === '') {
    payload.discountExpires = null;
  } else if (body.discountExpires !== undefined) {
    payload.discountExpires = body.discountExpires ? new Date(body.discountExpires) : null;
  }

  if (body.colors !== undefined) payload.colors = parseArrayField(body.colors);
  if (body.shadeCategories !== undefined) payload.shadeCategories = parseShadeCategories(body.shadeCategories);
  if (body.sizes !== undefined) payload.sizes = parseArrayField(body.sizes);
  if (body.sizePrices !== undefined) payload.sizePrices = parseSizePricesField(body.sizePrices);
  if (body.metaKeywords !== undefined) payload.metaKeywords = parseArrayField(body.metaKeywords);
  const imageColorVariants = parseArrayField(body.imageColors, { preserveEmpty: true }).map(normalizeColorValue);
  const existingImages = parseImageEntriesField(body.existingImages);

  const uploadedFiles = [];

  if (Array.isArray(req.files)) {
    uploadedFiles.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    if (Array.isArray(req.files.images)) uploadedFiles.push(...req.files.images);
    if (Array.isArray(req.files.image)) uploadedFiles.push(...req.files.image);
  }

  if (req.file) {
    uploadedFiles.push(req.file);
  }

  if (uploadedFiles.length > 0) {
    const altText = payload.name || (typeof body.name === 'string' ? body.name.trim() : '') || 'Product image';
    const uploadedImageEntries = uploadedFiles.map((file, index) => {
      const variantColor = imageColorVariants[index] || '';
      return {
        url: `/uploads/${file.filename}`,
        alt: altText,
        ...(variantColor ? { color: variantColor } : {})
      };
    });

    if (Array.isArray(existingImages)) {
      payload.images = [...existingImages, ...uploadedImageEntries];
    } else {
      payload.images = uploadedImageEntries;
    }
  } else if (Array.isArray(existingImages)) {
    payload.images = existingImages;
  } else if (forUpdate && body.imageColors !== undefined && imageColorVariants.length > 0) {
    payload.__imageColorVariants = imageColorVariants;
  }

  if (!forUpdate) {
    if (payload.price === undefined) payload.price = Number(body.price);
    if (payload.stock === undefined) payload.stock = Number(body.stock);
  }

  return payload;
};

const validateNonNegativeNumbers = (payload) => {
  const numericFields = ['price', 'stock', 'discountPrice', 'costPrice', 'shippingCost', 'marketingCost'];

  for (const field of numericFields) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] < 0) {
      return `${field} cannot be less than 0`;
    }
  }

  if (payload?.supplier?.qualityScore !== undefined && payload.supplier.qualityScore !== null) {
    if (payload.supplier.qualityScore < 0 || payload.supplier.qualityScore > 5) {
      return 'supplier quality score must be between 0 and 5';
    }
  }

  return null;
};

const getProducts = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, fabricType, sort, search, availability, shade } = req.query;
    let filter = { isActive: true };

    if (category) {
      const trimmedCategory = String(category).trim();

      if (mongoose.Types.ObjectId.isValid(trimmedCategory)) {
        filter.category = trimmedCategory;
      } else {
        const matchingCategories = await Category.find({
          name: { $regex: `^${escapeRegex(trimmedCategory)}$`, $options: 'i' }
        }).select('_id');

        const categoryIds = matchingCategories.map((item) => item._id);
        filter.category = categoryIds.length > 0 ? { $in: categoryIds } : null;
      }
    }
    if (fabricType) {
      filter.fabricType = { $regex: `^${escapeRegex(String(fabricType).trim())}$`, $options: 'i' };
    }
    if (shade) {
      const shadeValue = String(shade).trim().toLowerCase();
      if (shadeValue === 'light' || shadeValue === 'dark') {
        filter.shadeCategories = shadeValue;
      }
    }
    if (availability === 'in_stock') filter.stock = { $gt: 0 };
    if (availability === 'out_of_stock') filter.stock = 0;
    if (search) {
      const keyword = String(search).trim();
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { slug: { $regex: escaped, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let query = Product.find(filter).populate('category', 'name');

    if (sort === 'price_asc') query = query.sort({ price: 1 });
    else if (sort === 'price_desc') query = query.sort({ price: -1 });
    else if (sort === 'newest') query = query.sort({ createdAt: -1 });
    else if (sort === 'trending') query = query.sort({ purchases: -1 });

    const products = await query;
    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] }
      : { slug: req.params.id };

    const product = await Product.findOneAndUpdate(
      query,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('category', 'name');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req);

    if (payload.category && !mongoose.Types.ObjectId.isValid(payload.category)) {
      return res.status(400).json({ success: false, error: 'Invalid category selected' });
    }

    if (!payload.slug && payload.name) {
      payload.slug = toSlug(payload.name);
    }

    if (payload.slug) {
      payload.slug = await ensureUniqueSlug(payload.slug);
    }

    const validationError = validateNonNegativeNumbers(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const product = await Product.create(payload);
    res.status(201).json({ success: true, product });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({ success: false, error: firstError?.message || error.message });
    }

    if (error?.code === 11000) {
      return res.status(400).json({ success: false, error: 'A product with a similar slug already exists. Try another name.' });
    }

    res.status(500).json({ success: false, error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const payload = buildProductPayload(req, { forUpdate: true });
    const shouldUnsetDiscountPrice = payload.discountPrice === undefined && Object.prototype.hasOwnProperty.call(req.body || {}, 'discountPrice');

    if (payload.category && !mongoose.Types.ObjectId.isValid(payload.category)) {
      return res.status(400).json({ success: false, error: 'Invalid category selected' });
    }

    if (payload.slug) {
      payload.slug = await ensureUniqueSlug(payload.slug, { excludeId: req.params.id });
    }

    const imageColorVariants = Array.isArray(payload.__imageColorVariants) ? payload.__imageColorVariants : null;
    if (imageColorVariants) {
      delete payload.__imageColorVariants;
      const existingProduct = await Product.findById(req.params.id).lean();
      if (existingProduct && Array.isArray(existingProduct.images)) {
        payload.images = existingProduct.images.map((image, index) => {
          const variantColor = imageColorVariants[index] || '';
          return {
            ...image,
            ...(variantColor ? { color: variantColor } : { color: undefined })
          };
        });
      }
    }
    const validationError = validateNonNegativeNumbers(payload);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    if (shouldUnsetDiscountPrice) {
      delete payload.discountPrice;
      delete payload.discountExpires;
    }

    const updateDoc = shouldUnsetDiscountPrice
      ? { $set: payload, $unset: { discountPrice: 1, discountExpires: 1 } }
      : payload;

    const product = await Product.findByIdAndUpdate(req.params.id, updateDoc, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({ success: false, error: firstError?.message || error.message });
    }

    if (error?.code === 11000) {
      return res.status(400).json({ success: false, error: 'Slug is already in use by another product' });
    }

    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product de-activated successfully (soft-deleted)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit or update a product review
const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5.' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a review comment.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Check if user already reviewed the product
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user.id.toString()
    );

    if (alreadyReviewed) {
      // Update existing review
      alreadyReviewed.rating = Number(rating);
      alreadyReviewed.comment = comment.trim();
      alreadyReviewed.createdAt = new Date();
    } else {
      // Add new review
      const review = {
        user: req.user.id,
        userName: req.user.name,
        rating: Number(rating),
        comment: comment.trim()
      };
      product.reviews.push(review);
    }

    product.numOfReviews = product.reviews.length;
    
    // Calculate average rating
    const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
    product.averageRating = product.reviews.length > 0 ? (totalRating / product.reviews.length) : 0;

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, createProductReview };