const mongoose = require('mongoose');
const Product = require('../Models/Products');
const Category = require('../Models/Categories');
const Order = require('../Models/Order');

const ORDER_STATUSES = ['Processing', 'Confirmed', 'Shipped', 'Delivered'];
const LIGHT_COLORS = [
  'white',
  'ivory',
  'cream',
  'beige',
  'stone',
  'silver',
  'champagne',
  'yellow',
  'off white',
  'off-white',
  'pastel',
  'blush',
  'pink',
  'rose',
  'sage',
  'light green',
  'mint',
  'peach',
  'lavender',
  'baby blue',
  'sky blue',
  'light blue',
  'light pink',
  'light grey',
  'light gray',
  'grey',
  'gray'
];

const DARK_COLORS = [
  'black',
  'charcoal',
  'graphite',
  'navy',
  'dark blue',
  'midnight',
  'indigo',
  'maroon',
  'burgundy',
  'wine',
  'ruby',
  'plum',
  'dark green',
  'emerald',
  'teal',
  'olive',
  'brown',
  'red',
  'mustard',
  'coffee',
  'mocha',
  'slate'
];

const normalize = (text = '') => text.toString().toLowerCase().trim();

const LIGHT_COLOR_SET = new Set(LIGHT_COLORS.map((color) => normalize(color)));
const DARK_COLOR_SET = new Set(DARK_COLORS.map((color) => normalize(color)));

const escapeRegex = (text = '') => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const collectExplicitToneValues = (product) => [
  ...(product?.color ? [product.color] : []),
  ...(Array.isArray(product?.colors) ? product.colors : []),
  ...(Array.isArray(product?.images) ? product.images.map((image) => image?.color).filter(Boolean) : [])
]
  .map((value) => normalize(value))
  .filter(Boolean);

const toBaseColor = (value = '') => {
  const color = normalize(value).replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!color) return '';

  if (color.startsWith('light ')) return color;
  if (color.startsWith('dark ')) return color;

  if (color === 'offwhite') return 'off white';
  return color;
};

const hasMappedColor = (value = '', palette = []) => {
  const normalizedValue = toBaseColor(value);
  if (!normalizedValue) return false;

  return palette.some((keyword) => {
    const escapedKeyword = escapeRegex(normalize(keyword)).replace(/\s+/g, '\\s+');
    return new RegExp(`(^|[^a-z])${escapedKeyword}($|[^a-z])`, 'i').test(normalizedValue);
  });
};

const classifyColorTone = (value = '') => {
  const color = toBaseColor(value);
  if (!color) return null;

  const isLight = color.startsWith('light ') || LIGHT_COLOR_SET.has(color) || hasMappedColor(color, LIGHT_COLORS);
  const isDark = color.startsWith('dark ') || DARK_COLOR_SET.has(color) || hasMappedColor(color, DARK_COLORS);

  if (isLight && isDark) return 'both';
  if (isLight) return 'light';
  if (isDark) return 'dark';
  return null;
};

const getProductToneScore = (product) => {
  const toneValues = collectExplicitToneValues(product);

  return toneValues.reduce(
    (score, value) => {
      const tone = classifyColorTone(value);
      if (tone === 'light' || tone === 'both') score.lightScore += 1;
      if (tone === 'dark' || tone === 'both') score.darkScore += 1;
      return score;
    },
    { lightScore: 0, darkScore: 0 }
  );
};

const filterProductsByTone = (products = [], tone) => {
  if (!tone) return products;

  return products.filter((product) => {
    const shades = Array.isArray(product?.shadeCategories) ? product.shadeCategories : [];
    if (shades.length > 0) {
      return shades.includes(tone);
    }

    // Safety fallback for legacy records that do not yet have shadeCategories.
    const toneScore = getProductToneScore(product);
    return tone === 'light' ? toneScore.lightScore > 0 : toneScore.darkScore > 0;
  });
};

const buildProductProjection = () => ({
  name: 1,
  slug: 1,
  price: 1,
  discountPrice: 1,
  category: 1,
  fabricType: 1,
  colors: 1,
  shadeCategories: 1,
  images: 1,
  purchases: 1,
  views: 1,
  stock: 1
});

const parsePriceFromMessage = (message) => {
  const text = normalize(message);

  // ✅ More robust regex patterns for price extraction
  const underMatch = text.match(/under\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i) 
    || text.match(/below\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/less than\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);
    
  const aboveMatch = text.match(/above\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i) 
    || text.match(/over\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/more than\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)\s*(?:above|onwards?)/i);
    
  const betweenMatch = text.match(/between\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);
  const exactMatch = text.match(/(?:of|for|at|priced(?:\s+at)?|price(?:d)?(?:\s+is)?|cost(?:ing)?|worth)\s*(?:rs\.?|₹|rupees?)?\s*(\d+(?:\.\d+)?)/i);

  let minPrice;
  let maxPrice;
  let exactPrice;

  if (betweenMatch) {
    minPrice = Number(betweenMatch[1]);
    maxPrice = Number(betweenMatch[2]);
  }

  if (underMatch) {
    maxPrice = Number(underMatch[1]);
  }

  if (aboveMatch) {
    minPrice = Number(aboveMatch[1]);
  }

  if (minPrice === undefined && maxPrice === undefined && exactMatch) {
    exactPrice = Number(exactMatch[1]);
  }

  return { minPrice, maxPrice, exactPrice };
};

const getSearchPrice = (product) => {
  if (!product) return 0;

  if (Array.isArray(product.sizePrices) && product.sizePrices.length > 0) {
    const sizePrices = product.sizePrices
      .map((entry) => {
        const hasPrice = entry?.price !== undefined && entry?.price !== null && entry?.price !== '';
        const price = Number(entry?.price);
        return hasPrice && Number.isFinite(price) && price >= 0 ? price : null;
      })
      .filter((price) => price !== null);

    if (sizePrices.length > 0) {
      return Math.min(...sizePrices);
    }
  }

  const hasDiscountPrice = product?.discountPrice !== undefined && product?.discountPrice !== null && product?.discountPrice !== '';
  const discountPrice = Number(product?.discountPrice);
  if (hasDiscountPrice && Number.isFinite(discountPrice) && discountPrice >= 0) {
    return discountPrice;
  }

  const basePrice = Number(product?.price);
  return Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0;
};

const filterProductsByPrice = (products = [], minPrice, maxPrice, exactPrice) => {
  if (minPrice === undefined && maxPrice === undefined && exactPrice === undefined) return products;

  return products.filter((product) => {
    const price = getSearchPrice(product);
    if (exactPrice !== undefined) return price === exactPrice;
    if (minPrice !== undefined && price < minPrice) return false;
    if (maxPrice !== undefined && price > maxPrice) return false;
    return true;
  });
};

const parseRatingFromMessage = (message) => {
  const text = normalize(message);
  const match = text.match(/(?:rating|rated|stars?)\s*(?:above|over|at least|>=)?\s*(\d(?:\.\d)?)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return undefined;
  return Math.min(5, Math.max(1, value));
};

const parseQuantity = (message) => {
  const match = normalize(message).match(/(?:add|remove)\s+(\d+)\s+/);
  if (!match) return 1;
  const quantity = Number(match[1]);
  return Number.isNaN(quantity) || quantity <= 0 ? 1 : quantity;
};

const normalizeCategoryText = (value = '') => normalize(value)
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toCategoryKeywords = (value = '') => normalizeCategoryText(value)
  .split(' ')
  .map((part) => part.trim())
  .filter((part) => part.length > 2 && part !== 'and');

const findCategoryInMessage = async (message) => {
  const categories = await Category.find({}, { name: 1 }).lean();
  const text = normalizeCategoryText(message);

  const exact = categories.find((category) => {
    const categoryText = normalizeCategoryText(category?.name || '');
    return categoryText && text.includes(categoryText);
  });

  if (exact) return exact;

  // Fallback: match by category keywords (e.g. "quilts" should match "Blankets & Quilts").
  let bestMatch = null;
  let bestScore = 0;

  categories.forEach((category) => {
    const keywords = toCategoryKeywords(category?.name || '');
    if (!keywords.length) return;

    const score = keywords.reduce((acc, keyword) => (text.includes(keyword) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  });

  return bestScore > 0 ? bestMatch : undefined;
};

const findFabricInMessage = (message) => {
  const text = normalize(message);
  const fabrics = ['cotton', 'silk', 'linen', 'polyester', 'wool', 'blend', 'other'];
  const found = fabrics.find((f) => text.includes(f));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : undefined;
};

const wantsLightColors = (message) => {
  const text = normalize(message);
  // match: "light colour", "light colours", "light color", "light colors", "light-colored", "light coloured", etc.
  return /(?:\blight(?:\s+|[-])(?:colou?r?s?|colou?r-?ed|colored?)\b)|\blight\s+colou?r\b/.test(text);
};

const wantsDarkColors = (message) => {
  const text = normalize(message);
  // match: "dark colour", "dark colours", "dark color", "dark colors", "dark-colored", "dark coloured", etc.
  return /(?:\bdark(?:\s+|[-])(?:colou?r?s?|colou?r-?ed|colored?)\b)|\bdark\s+colou?r\b/.test(text);
};

const mentionsBedsheets = (message) => {
  const text = normalize(message);
  return /bedsheet|bedsheets|bed sheet|bed sheets|bedhseet|bedhseets|nedsheet|nedsheets/.test(text);
};

const matchesToneStrictly = (product, tone, options = {}) => {
  const includeUnknown = Boolean(options.includeUnknown);
  const shades = Array.isArray(product?.shadeCategories) ? product.shadeCategories : [];
  if (shades.length > 0) return shades.includes(tone);
  if (includeUnknown && collectExplicitToneValues(product).length === 0) return true;

  const { lightScore, darkScore } = getProductToneScore(product);
  if (tone === 'light') return lightScore > 0;
  if (tone === 'dark') return darkScore > 0;
  return true;
};

const rankByTone = (products, tone) =>
  products.sort((left, right) => {
    const leftTone = getProductToneScore(left);
    const rightTone = getProductToneScore(right);

    const leftPrimary = tone === 'dark' ? leftTone.darkScore : leftTone.lightScore;
    const rightPrimary = tone === 'dark' ? rightTone.darkScore : rightTone.lightScore;

    if (leftPrimary !== rightPrimary) return rightPrimary - leftPrimary;

    const leftPopularity = (left.purchases || 0) * 2 + (left.views || 0);
    const rightPopularity = (right.purchases || 0) * 2 + (right.views || 0);
    return rightPopularity - leftPopularity;
  });

const buildSearchQuery = async (message) => {
  const text = normalize(message);
  const category = await findCategoryInMessage(text);
  const fabricType = findFabricInMessage(text);
  const { minPrice, maxPrice, exactPrice } = parsePriceFromMessage(text);
  const minRating = parseRatingFromMessage(text);
  const searchHint = extractSearchHint(text);
  const lightColorOnly = wantsLightColors(text);
  const darkColorOnly = wantsDarkColors(text);
  const bedsheetRequest = mentionsBedsheets(text);
  const requestedTone = lightColorOnly ? 'light' : (darkColorOnly ? 'dark' : null);
  const useToneBedsheetSearch = bedsheetRequest && Boolean(requestedTone);
  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined || exactPrice !== undefined;
  const priceFocusedSearch = isPriceFocusedSearch(text, { category, fabricType, requestedTone, bedsheetRequest });

  const query = { isActive: true };
  const queryConditions = [];

  // ✅ Handle bedsheet + tone search with price filter
  if (useToneBedsheetSearch) {
    const bedsheetCategories = await Category.find({
      name: { $regex: /bedsheet|bed\s*sheet/i }
    }).select('_id').lean();
    const bedsheetCategoryIds = bedsheetCategories.map((item) => item._id);

    if (bedsheetCategoryIds.length > 0) {
      query.category = { $in: bedsheetCategoryIds };
    }
  } else if (category) {
    query.category = category._id;
  }

  // ✅ ALWAYS apply fabric filter if detected
  if (fabricType) {
    query.fabricType = fabricType;
  }

  if (!priceFocusedSearch && searchHint && searchHint.length >= 2) {
    queryConditions.push({
      $or: [
        { name: { $regex: escapeRegex(searchHint), $options: 'i' } },
        { description: { $regex: escapeRegex(searchHint), $options: 'i' } }
      ]
    });
  }

  // Primary shade filter: use persisted admin-managed tone categories.
  if (requestedTone) {
    query.shadeCategories = requestedTone;
  }

  // ✅ Combine all conditions if tone search is active
  if (queryConditions.length > 0) {
    query.$and = queryConditions;
  }

  return {
    query,
    filters: {
      category: category?.name,
      fabricType,
      minPrice,
      maxPrice,
      exactPrice,
      hasPriceFilter,
      minRating,
      lightColorOnly,
      darkColorOnly,
      requestedTone,
      bedsheetRequest,
      useToneBedsheetSearch,
      candidateLimit: hasPriceFilter ? 1000 : (requestedTone ? 500 : (lightColorOnly || bedsheetRequest ? 60 : 12))
    }
  };
};

const rankLightColorMatches = (products) =>
  products.sort((left, right) => {
    const leftLightScore = getProductToneScore(left).lightScore;
    const rightLightScore = getProductToneScore(right).lightScore;

    if (leftLightScore !== rightLightScore) return rightLightScore - leftLightScore;

    const leftPopularity = (left.purchases || 0) * 2 + (left.views || 0);
    const rightPopularity = (right.purchases || 0) * 2 + (right.views || 0);

    return rightPopularity - leftPopularity;
  });

const estimateRating = (product) => {
  const popularityScore = (product.purchases || 0) * 0.02 + (product.views || 0) * 0.005;
  const base = 3.8 + Math.min(1.1, popularityScore);
  return Number(Math.min(5, base).toFixed(1));
};

const serializeProducts = (products = []) =>
  products.map((p) => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    discountPrice: p.discountPrice,
    category: p.category,
    fabricType: p.fabricType,
    colors: p.colors,
    shadeCategories: p.shadeCategories,
    images: p.images,
    stock: p.stock,
    rating: estimateRating(p)
  }));

const dedupeProducts = (products = []) => {
  const seen = new Set();

  return products.filter((product) => {
    const key = product?._id ? product._id.toString() : '';

    if (!key) return true;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

const extractProductNameHint = (message) => {
  const text = normalize(message)
    .replace(/please|kindly|for me|can you|could you|would you|to cart|from cart|cart/g, '')
    .replace(/add|remove|delete|buy|find|show|track|order|coupon|apply|products?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};

const extractSearchHint = (message) => {
  const text = normalize(message)
    .replace(/please|kindly|can you|could you|would you|show me|show|find|search|looking for|i want|need|give me|tell me|available|recommend|suggest|products?|items?/g, ' ')
    .replace(/\b(?:under|below|less than|above|over|more than|between|and|to|rs\.?|rupees?|₹|price|rating|rated|stars?)\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
};

const isPriceFocusedSearch = (message, filters = {}) => {
  const text = normalize(message);
  const hasPriceLanguage = /\b(under|below|less than|above|over|more than|between|price|priced|cost|worth|rs\.?|rupees?|₹|onwards?)\b/.test(text);
  const hasProductTopic = Boolean(filters.category || filters.fabricType || filters.requestedTone || filters.bedsheetRequest);

  return hasPriceLanguage && !hasProductTopic;
};

const detectIntent = (message) => {
  const text = normalize(message);

  if (/where is my order|track|tracking|order status|order update/.test(text)) return 'order_tracking';
  if (/recommend|suggest|similar|also bought|for me|best for/.test(text)) return 'recommendation';
  if (/add .*cart|remove .*cart|delete .*cart|apply coupon|coupon|checkout/.test(text)) return 'cart_checkout';
  if (/shipping|return policy|refund|payment method|delivery|faq|how long/.test(text)) return 'faq';
  if (/search|find|show|show me|looking for|under|below|above|price|category|brand|rating|bedsheet|bedsheets|bed sheet|bed sheets|colour|color|light/.test(text)) return 'product_search';

  return 'general';
};

const buildOrderTimeline = (status) => {
  const currentIndex = Math.max(0, ORDER_STATUSES.indexOf(status));
  return ORDER_STATUSES.map((step, idx) => ({
    step,
    completed: idx <= currentIndex,
    current: idx === currentIndex
  }));
};

const getAlsoBoughtProducts = async (productIds = []) => {
  if (!productIds.length) return [];

  const objectIds = productIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!objectIds.length) return [];

  const rows = await Order.aggregate([
    { $match: { 'items.product': { $in: objectIds } } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $nin: objectIds } } },
    { $group: { _id: '$items.product', score: { $sum: '$items.quantity' } } },
    { $sort: { score: -1 } },
    { $limit: 6 }
  ]);

  const ids = rows.map((r) => r._id);
  const products = await Product.find({ _id: { $in: ids }, isActive: true }, buildProductProjection())
    .populate('category', 'name')
    .lean();

  return serializeProducts(products);
};

const getRecommendations = async ({ userId, recentlyViewed = [], cartItems = [] }) => {
  const candidateIds = new Set();

  if (Array.isArray(recentlyViewed)) {
    recentlyViewed.forEach((id) => candidateIds.add(id));
  }

  if (Array.isArray(cartItems)) {
    cartItems.forEach((item) => {
      if (item?._id) candidateIds.add(item._id);
    });
  }

  let historyCategoryIds = [];
  if (userId) {
    const orders = await Order.find({ user: userId }, { items: 1 }).populate('items.product', 'category').lean();
    historyCategoryIds = orders
      .flatMap((o) => o.items || [])
      .map((i) => i.product?.category)
      .filter(Boolean)
      .map((id) => id.toString());
  }

  const personalized = historyCategoryIds.length
    ? await Product.find({ category: { $in: historyCategoryIds }, isActive: true }, buildProductProjection())
        .sort({ purchases: -1, views: -1 })
        .limit(6)
        .populate('category', 'name')
        .lean()
    : [];

  const trending = await Product.find({ isActive: true }, buildProductProjection())
    .sort({ purchases: -1, views: -1 })
    .limit(8)
    .populate('category', 'name')
    .lean();

  const alsoBought = await getAlsoBoughtProducts(Array.from(candidateIds));

  return {
    personalized: serializeProducts(personalized),
    trending: serializeProducts(trending),
    alsoBought
  };
};

const faqAnswer = (message) => {
  const text = normalize(message);

  if (/shipping|delivery|how long|eta/.test(text)) {
    return {
      title: 'Shipping Information',
      answer: 'Orders are processed in 24 hours. Delivery usually takes 2-5 business days in major cities and 4-7 business days for other areas.'
    };
  }

  if (/return|refund|exchange/.test(text)) {
    return {
      title: 'Return Policy',
      answer: 'You can request a return or exchange within 7 days of delivery for unused items in original packaging. Refunds are processed within 3-5 business days after inspection.'
    };
  }

  if (/payment|card|cod|upi/.test(text)) {
    return {
      title: 'Payment Methods',
      answer: 'We support Cash on Delivery, Card payments, and UPI. Card transactions are secured and encrypted.'
    };
  }

  return {
    title: 'Support',
    answer: 'I can help with shipping times, return policy, payment methods, product search, and order tracking. Ask anything in natural language.'
  };
};

const assistantSuggest = async (req, res) => {
  try {
    const query = normalize(req.query.q || '');
    if (!query || query.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const categories = await Category.find({ name: { $regex: query, $options: 'i' } }, { name: 1 }).limit(5).lean();
    const products = await Product.find({ name: { $regex: query, $options: 'i' }, isActive: true }, { name: 1, slug: 1 })
      .limit(7)
      .lean();

    const suggestions = [
      ...products.map((p) => ({ type: 'product', label: p.name, value: p.name, slug: p.slug })),
      ...categories.map((c) => ({ type: 'category', label: c.name, value: c.name }))
    ];

    res.json({ success: true, suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

  const assistantSeo = async (req, res) => {
    try {
      const { productId, name, description, category, fabricType, colors } = req.body || {};

      let product = null;
      if (productId) {
        if (mongoose.Types.ObjectId.isValid(productId)) {
          product = await Product.findById(productId).populate('category', 'name').lean();
        }
      }

      const src = product || { name, description, category: { name: category }, fabricType, colors };

      const prodName = (src.name || '').toString().trim();
      const catName = (src.category && src.category.name) ? src.category.name : (category || '');
      const fabric = src.fabricType || fabricType || '';
      const colorList = Array.isArray(src.colors) ? src.colors : (Array.isArray(colors) ? colors : []);

      const titleCandidate = prodName
        ? `${prodName}${catName ? ` — ${catName}` : ''} | Wajahat Fabrics`
        : `Wajahat Fabrics — Premium Bedding`;

      const descSource = (src.description || description || '').toString().trim();
      const descCandidate = descSource
        ? (descSource.length > 150 ? `${descSource.slice(0, 150).trim()}...` : descSource)
        : `${prodName || 'Premium bedding'}${fabric ? ` in ${fabric}` : ''}${catName ? ` — ${catName}` : ''}. Shop premium home textiles at Wajahat Fabrics.`;

      const nameParts = prodName.split(/[^a-zA-Z0-9]+/).map(p => p.toLowerCase().trim()).filter(p => p && p.length > 2);
      const keywordSet = new Set([...(nameParts || []), ...(catName ? [catName.toLowerCase()] : []), ...(fabric ? [fabric.toLowerCase()] : []), ...colorList.map(c => c.toLowerCase()), 'bedding', 'home textiles', 'Wajahat Fabrics']);
      const keywords = Array.from(keywordSet).slice(0, 20);

      res.json({ success: true, suggestions: { metaTitle: titleCandidate, metaDescription: descCandidate, metaKeywords: keywords } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

const assistantChat = async (req, res) => {
  try {
    const message = (req.body.message || '').toString().trim();
    const intent = detectIntent(message);
    const cartItems = Array.isArray(req.body.cartItems) ? req.body.cartItems : [];
    const recentlyViewed = Array.isArray(req.body.recentlyViewed) ? req.body.recentlyViewed : [];
    const lastCartActivityAt = req.body.lastCartActivityAt ? new Date(req.body.lastCartActivityAt) : null;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (intent === 'product_search') {
      const { query, filters } = await buildSearchQuery(message);
      let products = await Product.find(query, buildProductProjection())
        .populate('category', 'name')
        .sort({ purchases: -1, createdAt: -1 })
        .limit(filters.candidateLimit)
        .lean();

      if (filters.minRating) {
        products = products.filter((p) => estimateRating(p) >= filters.minRating);
      }

      if (filters.lightColorOnly && !filters.useToneBedsheetSearch) {
        products = filterProductsByTone(products, 'light');
        products = rankLightColorMatches(products);
      }

      if (filters.darkColorOnly && !filters.useToneBedsheetSearch) {
        products = filterProductsByTone(products, 'dark');
      }

      if (filters.useToneBedsheetSearch) {
        products = products.filter((p) => matchesToneStrictly(p, filters.requestedTone));
        products = rankByTone(products, filters.requestedTone);
      }

      products = dedupeProducts(products);
      products = filterProductsByPrice(products, filters.minPrice, filters.maxPrice, filters.exactPrice);

      // ✅ Fallback for bedsheet requests with no results (including tone-based searches)
      if (!products.length && filters.bedsheetRequest) {
        const fallbackQuery = {
          isActive: true,
          name: { $regex: 'bedsheet|bed sheet', $options: 'i' }
        };

        // ✅ Re-apply fabric filter in fallback
        if (filters.fabricType) {
          fallbackQuery.fabricType = filters.fabricType;
        }

        products = await Product.find(fallbackQuery, buildProductProjection())
          .populate('category', 'name')
          .sort({ purchases: -1, createdAt: -1 })
          .limit(20)
          .lean();

        // ✅ Apply tone filtering in fallback, even for tone-based searches
        if (filters.lightColorOnly) {
          products = filterProductsByTone(products, 'light');
          products = rankLightColorMatches(products);
        }

        if (filters.darkColorOnly) {
          products = filterProductsByTone(products, 'dark');
        }

        products = filterProductsByPrice(products, filters.minPrice, filters.maxPrice, filters.exactPrice);
      }

      const unavailable = products.length === 0;
      const pricePhrase = filters.exactPrice !== undefined
        ? `at Rs. ${filters.exactPrice}`
        : filters.minPrice !== undefined && filters.maxPrice !== undefined
        ? `between Rs. ${filters.minPrice} and Rs. ${filters.maxPrice}`
        : filters.minPrice !== undefined
          ? `above Rs. ${filters.minPrice}`
          : filters.maxPrice !== undefined
            ? `under Rs. ${filters.maxPrice}`
            : '';

      return res.json({
        success: true,
        intent,
        reply: products.length
          ? `I found ${products.length} products matching your search.`
          : `No products are available${pricePhrase ? ` ${pricePhrase}` : ''} right now.`,
        filters,
        unavailable,
        products: serializeProducts(products),
        suggestions: ['Show trending products', 'Recommend for me', 'Add first item to cart']
      });
    }

    if (intent === 'recommendation') {
      const recs = await getRecommendations({ userId: req.user?._id, recentlyViewed, cartItems });
      return res.json({
        success: true,
        intent,
        reply: 'Here are personalized recommendations based on trends and your activity.',
        recommendations: recs,
        suggestions: ['Show also bought', 'Show trending under 3000', 'Track my order']
      });
    }

    if (intent === 'order_tracking') {
      if (!req.user) {
        return res.json({
          success: true,
          intent,
          reply: 'Please log in to track your order. Once logged in, ask: Where is my order?',
          requiresAuth: true
        });
      }

      const explicitId = message.match(/[a-f0-9]{24}/i)?.[0];
      const orderQuery = explicitId ? { _id: explicitId, user: req.user._id } : { user: req.user._id };

      const order = await Order.findOne(orderQuery)
        .sort({ createdAt: -1 })
        .populate('items.product', 'name images')
        .lean();

      if (!order) {
        return res.json({
          success: true,
          intent,
          reply: 'I could not find any order for your account yet.'
        });
      }

      return res.json({
        success: true,
        intent,
        reply: `Order #${order._id.toString().slice(-8)} is currently ${order.orderStatus}.`,
        order: {
          id: order._id,
          status: order.orderStatus,
          trackingNumber: order.trackingNumber || null,
          createdAt: order.createdAt,
          totalAmount: order.totalAmount,
          timeline: buildOrderTimeline(order.orderStatus)
        },
        suggestions: ['Show my latest orders', 'How long for delivery?', 'Return policy']
      });
    }

    if (intent === 'cart_checkout') {
      const text = normalize(message);

      if (/coupon|apply/.test(text)) {
        const couponMatch = text.match(/\b(save10|welcome15|bedding20)\b/i);
        const code = couponMatch ? couponMatch[1].toUpperCase() : null;

        if (!code) {
          return res.json({
            success: true,
            intent,
            reply: 'Try one of these coupons: SAVE10, WELCOME15, BEDDING20',
            coupon: null,
            suggestions: ['Apply SAVE10', 'Apply WELCOME15']
          });
        }

        const discountMap = { SAVE10: 10, WELCOME15: 15, BEDDING20: 20 };
        return res.json({
          success: true,
          intent,
          reply: `${code} applied. You get ${discountMap[code]}% off eligible items.`,
          coupon: { code, discountPercent: discountMap[code] }
        });
      }

      if (/add/.test(text) || /remove|delete/.test(text)) {
        const nameHint = extractProductNameHint(message);
        const quantity = parseQuantity(message);

        if (!nameHint) {
          return res.json({ success: true, intent, reply: 'Tell me product name to update cart, for example: add 2 silk bedsheet.' });
        }

        const product = await Product.findOne(
          { name: { $regex: nameHint, $options: 'i' }, isActive: true },
          buildProductProjection()
        )
          .populate('category', 'name')
          .lean();

        if (!product) {
          return res.json({
            success: true,
            intent,
            reply: `I could not find a product matching "${nameHint}".`
          });
        }

        const actionType = /remove|delete/.test(text) ? 'remove' : 'add';

        return res.json({
          success: true,
          intent,
          reply: actionType === 'add'
            ? `${product.name} added to cart.`
            : `${product.name} removed from cart.`,
          cartAction: {
            type: actionType,
            quantity,
            product: serializeProducts([product])[0]
          }
        });
      }

      const reminderNeeded =
        Array.isArray(cartItems) &&
        cartItems.length > 0 &&
        lastCartActivityAt instanceof Date &&
        Date.now() - lastCartActivityAt.getTime() > 2 * 60 * 60 * 1000;

      return res.json({
        success: true,
        intent,
        reply: reminderNeeded
          ? 'You have items waiting in cart. Would you like me to help with checkout or apply a coupon?'
          : 'I can help add/remove items, apply coupons, and speed up checkout.'
      });
    }

    if (intent === 'faq') {
      const faq = faqAnswer(message);
      return res.json({
        success: true,
        intent,
        reply: faq.answer,
        faq,
        suggestions: ['Where is my order?', 'Show trending products', 'Apply SAVE10']
      });
    }

    const recs = await getRecommendations({ userId: req.user?._id, recentlyViewed, cartItems });

    return res.json({
      success: true,
      intent: 'general',
      reply: 'I can help discover products, recommend items, track orders, update cart, apply coupons, and answer FAQs.',
      recommendations: {
        trending: recs.trending.slice(0, 4)
      },
      suggestions: [
        'Show me cotton bedsheets under 3000',
        'Recommend products for me',
        'Where is my order?',
        'Apply SAVE10'
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { assistantChat, assistantSuggest, assistantSeo };
