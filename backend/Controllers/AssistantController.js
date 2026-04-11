const mongoose = require('mongoose');
const Product = require('../Models/Products');
const Category = require('../Models/Categories');
const Order = require('../Models/Order');

const ORDER_STATUSES = ['Processing', 'Confirmed', 'Shipped', 'Delivered'];
const LIGHT_COLOR_KEYWORDS = [
  'white',
  'ivory',
  'cream',
  'beige',
  'off white',
  'off-white',
  'blush',
  'sage',
  'mint',
  'peach',
  'lavender',
  'sky blue',
  'light blue',
  'light pink',
  'light grey',
  'light gray',
  'grey',
  'gray'
];

const DARK_COLOR_KEYWORDS = [
  'black',
  'charcoal',
  'graphite',
  'navy',
  'midnight',
  'indigo',
  'maroon',
  'burgundy',
  'wine',
  'ruby',
  'plum',
  'emerald',
  'teal',
  'olive',
  'brown',
  'coffee',
  'mocha',
  'slate'
];

const normalize = (text = '') => text.toString().toLowerCase().trim();

const escapeRegex = (text = '') => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWord = (value, word) => new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(value);

const buildKeywordRegex = (keyword) => new RegExp(escapeRegex(keyword), 'i');

const LIGHT_COLOR_REGEXES = LIGHT_COLOR_KEYWORDS.map(buildKeywordRegex);
const DARK_COLOR_REGEXES = DARK_COLOR_KEYWORDS.map(buildKeywordRegex);

const collectExplicitToneValues = (product) => [
  ...(Array.isArray(product?.colors) ? product.colors : []),
  ...(Array.isArray(product?.images) ? product.images.map((image) => image?.color).filter(Boolean) : [])
]
  .map((value) => normalize(value))
  .filter(Boolean);

const collectFallbackToneValues = (product) => [product?.name, product?.description]
  .map((value) => normalize(value))
  .filter(Boolean);

const scoreToneValues = (values = []) => {
  const lightScore = values.reduce((score, value) => score + (isLightColorName(value) ? 1 : 0), 0);
  const darkScore = values.reduce((score, value) => score + (isDarkColorName(value) ? 1 : 0), 0);

  return { lightScore, darkScore };
};

const buildProductProjection = () => ({
  name: 1,
  slug: 1,
  price: 1,
  discountPrice: 1,
  category: 1,
  fabricType: 1,
  colors: 1,
  images: 1,
  purchases: 1,
  views: 1,
  stock: 1
});

const parsePriceFromMessage = (message) => {
  const text = normalize(message);

  const underMatch = text.match(/under\s*\$?\s*(\d+(?:\.\d+)?)/i) || text.match(/below\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const aboveMatch = text.match(/above\s*\$?\s*(\d+(?:\.\d+)?)/i) || text.match(/over\s*\$?\s*(\d+(?:\.\d+)?)/i);
  const betweenMatch = text.match(/between\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?\s*(\d+(?:\.\d+)?)/i);

  let minPrice;
  let maxPrice;

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

  return { minPrice, maxPrice };
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

const findCategoryInMessage = async (message) => {
  const categories = await Category.find({}, { name: 1 }).lean();
  const text = normalize(message);
  return categories.find((c) => text.includes(normalize(c.name)));
};

const findFabricInMessage = (message) => {
  const text = normalize(message);
  const fabrics = ['cotton', 'silk', 'linen', 'polyester', 'wool', 'blend', 'other'];
  const found = fabrics.find((f) => text.includes(f));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : undefined;
};

const hasLightColorVariant = (product) => {
  const explicitToneValues = collectExplicitToneValues(product);
  const valuesToCheck = explicitToneValues.length > 0 ? explicitToneValues : collectFallbackToneValues(product);

  if (valuesToCheck.length === 0) return false;

  return scoreToneValues(valuesToCheck).lightScore > 0;
};

const hasDarkColorVariant = (product) => {
  const explicitToneValues = collectExplicitToneValues(product);
  const valuesToCheck = explicitToneValues.length > 0 ? explicitToneValues : collectFallbackToneValues(product);

  if (valuesToCheck.length === 0) return false;

  return scoreToneValues(valuesToCheck).darkScore > 0;
};

const wantsLightColors = (message) => {
  const text = normalize(message);
  return /(light\s+(?:colour|color)|light-colored|light colored|light bedsheet|light bedsheets|light bedding|pastel|soft shades|white\s+bedsheet|white\s+bedsheets|ivory\s+bedsheet|ivory\s+bedsheets|beige\s+bedsheet|beige\s+bedsheets)/.test(text);
};

const wantsDarkColors = (message) => {
  const text = normalize(message);
  return /(dark\s+(?:colour|color)|dark-colored|dark colored|drak\s+(?:colour|color)|drak\s+bedsheet|drak\s+bedsheets|dark\s+bedsheet|dark\s+bedsheets|dark\s+bedding|deep shades|black\s+bedsheet|black\s+bedsheets|navy\s+bedsheet|navy\s+bedsheets)/.test(text);
};

const mentionsBedsheets = (message) => {
  const text = normalize(message);
  return /bedsheet|bedsheets|bed sheet|bed sheets/.test(text);
};

const isLightColorName = (value) => {
  const colorValue = normalize(value);
  if (!colorValue) return false;

  if (/(?:\blight\b|\bpastel\b|\bsoft\b|\boff[-\s]?white\b)/i.test(colorValue)) return true;
  if (/\b(?:sky|baby|powder|ice)\s*blue\b/i.test(colorValue)) return true;

  return LIGHT_COLOR_KEYWORDS.some((keyword) => {
    return hasWord(colorValue, normalize(keyword));
  });
};

const isDarkColorName = (value) => {
  const colorValue = normalize(value);
  if (!colorValue) return false;

  if (/(?:\bdark\b|\bdeep\b|\brich\b|\bmidnight\b)/i.test(colorValue)) return true;
  if (/\bblue\b/i.test(colorValue) && !/\b(?:sky|baby|powder|ice|light)\s*blue\b/i.test(colorValue)) return true;

  return DARK_COLOR_KEYWORDS.some((keyword) => {
    return hasWord(colorValue, normalize(keyword));
  });
};

const getProductToneScore = (product) => {
  const explicitToneValues = collectExplicitToneValues(product);

  if (explicitToneValues.length > 0) {
    return scoreToneValues(explicitToneValues);
  }

  return scoreToneValues(collectFallbackToneValues(product));
};

const matchesToneStrictly = (product, tone) => {
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
  const { minPrice, maxPrice } = parsePriceFromMessage(text);
  const minRating = parseRatingFromMessage(text);
  const lightColorOnly = wantsLightColors(text);
  const darkColorOnly = wantsDarkColors(text);
  const bedsheetRequest = mentionsBedsheets(text);
  const requestedTone = lightColorOnly ? 'light' : (darkColorOnly ? 'dark' : null);
  const useToneBedsheetSearch = bedsheetRequest && Boolean(requestedTone);

  const query = { isActive: true };

  if (useToneBedsheetSearch) {
    const bedsheetCategories = await Category.find({
      name: { $regex: /bedsheet|bed\s*sheet/i }
    }).select('_id').lean();
    const bedsheetCategoryIds = bedsheetCategories.map((item) => item._id);

    query.$and = [
      {
        $or: [
          ...(bedsheetCategoryIds.length > 0 ? [{ category: { $in: bedsheetCategoryIds } }] : []),
          { name: /bedsheet|bed sheet/i },
          { description: /bedsheet|bed sheet/i }
        ]
      }
    ];
  } else if (category) {
    query.category = category._id;
  }

  if (fabricType) query.fabricType = fabricType;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }

  return {
    query,
    filters: {
      category: category?.name,
      fabricType,
      minPrice,
      maxPrice,
      minRating,
      lightColorOnly,
      darkColorOnly,
      requestedTone,
      bedsheetRequest,
      useToneBedsheetSearch,
      candidateLimit: lightColorOnly || bedsheetRequest ? 60 : 12
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
    images: p.images,
    stock: p.stock,
    rating: estimateRating(p)
  }));

const dedupeProducts = (products = []) => {
  const seen = new Set();

  return products.filter((product) => {
    const nameKey = normalize(product?.name || '');
    const slugKey = normalize(product?.slug || '');
    const key = nameKey || slugKey;

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
        products = products.filter((p) => hasLightColorVariant(p));
        products = rankLightColorMatches(products);
      }

      if (filters.darkColorOnly && !filters.useToneBedsheetSearch) {
        products = products.filter((p) => hasDarkColorVariant(p));
      }

      if (filters.useToneBedsheetSearch) {
        products = products.filter((p) => matchesToneStrictly(p, filters.requestedTone));
        products = rankByTone(products, filters.requestedTone);
      }

      products = dedupeProducts(products);

      if (!products.length && filters.bedsheetRequest && !filters.useToneBedsheetSearch) {
        const fallbackQuery = {
          isActive: true,
          name: { $regex: 'bedsheet|bed sheet', $options: 'i' }
        };

        products = await Product.find(fallbackQuery, buildProductProjection())
          .populate('category', 'name')
          .sort({ purchases: -1, createdAt: -1 })
          .limit(20)
          .lean();

        if (filters.lightColorOnly) {
          products = products.filter((p) => hasLightColorVariant(p));
          products = rankLightColorMatches(products);
        }
      }

      return res.json({
        success: true,
        intent,
        reply: products.length
          ? `I found ${products.length} products matching your search.`
          : 'I could not find an exact match. Try relaxing price/rating filters.',
        filters,
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

module.exports = { assistantChat, assistantSuggest };
