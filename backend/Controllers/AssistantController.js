const mongoose = require('mongoose');
const Product = require('../Models/Products');
const Category = require('../Models/Categories');
const Order = require('../Models/Order');
const { executeChatAgent, executeSimpleChat } = require('../Services/aiService');

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

const serializeProducts = (products = []) =>
  products.map((p) => ({
    _id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.discountPrice || p.price,
    category: p.category,
    fabricType: p.fabricType,
    colors: p.colors,
    shadeCategories: p.shadeCategories,
    images: p.images,
    stock: p.stock
  }));

const dbFunctions = {
  searchProducts: async ({ keyword, category, minPrice, maxPrice, color }) => {
    const query = { isActive: true };

    if (category) {
      const catMatch = await Category.findOne({ name: { $regex: new RegExp(category, 'i') } }).lean();
      if (catMatch) {
        query.category = catMatch._id;
      }
    }

    if (keyword) {
      // Split keyword into individual words, strip trailing 's' (plural)
      const words = keyword.toLowerCase()
        .replace(/s\b/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && w !== 'and' && w !== 'for' && w !== 'the');

      if (words.length > 0) {
        query.$and = words.map(word => ({
          $or: [
            { name: { $regex: new RegExp(word, 'i') } },
            { description: { $regex: new RegExp(word, 'i') } }
          ]
        }));
      }
    }

    if (color) {
      const colorQuery = color.toLowerCase();
      if (colorQuery.includes('light')) {
        query.shadeCategories = 'light';
      } else if (colorQuery.includes('dark')) {
        query.shadeCategories = 'dark';
      } else {
        query.shadeCategories = { $regex: new RegExp(color, 'i') };
      }
    }

    let products = await Product.find(query, buildProductProjection())
      .populate('category', 'name')
      .sort({ purchases: -1, createdAt: -1 })
      .limit(12)
      .lean();

    if (minPrice !== undefined || maxPrice !== undefined) {
      products = products.filter(p => {
        const pPrice = p.discountPrice || p.price || 0;
        if (minPrice !== undefined && pPrice < minPrice) return false;
        if (maxPrice !== undefined && pPrice > maxPrice) return false;
        return true;
      });
    }

    return { products: serializeProducts(products) };
  },

  trackOrder: async ({ orderId }) => {
    if (!orderId || typeof orderId !== 'string') return { status: "Not Found", message: "Invalid Order ID." };
    
    let order = null;
    const cleanId = orderId.replace('#', '').trim();

    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      order = await Order.findById(cleanId).lean();
    } else if (cleanId.length >= 6) {
      // Find order whose ObjectId ends with the short ID
      order = await Order.findOne({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: cleanId + "$",
            options: "i"
          }
        }
      }).lean();
    }

    if (!order) return { status: "Not Found", message: "Order not found." };
    
    const currentStatus = order.orderStatus || 'Processing';
    return {
      status: currentStatus,
      timeline: [
        { step: 'Processing', completed: true, current: currentStatus === 'Processing' },
        { step: 'Confirmed', completed: ['Confirmed', 'Shipped', 'Delivered'].includes(currentStatus), current: currentStatus === 'Confirmed' },
        { step: 'Shipped', completed: ['Shipped', 'Delivered'].includes(currentStatus), current: currentStatus === 'Shipped' },
        { step: 'Delivered', completed: currentStatus === 'Delivered', current: currentStatus === 'Delivered' }
      ]
    };
  },

  getRecommendations: async ({ type }) => {
    const trending = await Product.find({ isActive: true }, buildProductProjection())
      .sort({ purchases: -1, views: -1 })
      .limit(8)
      .populate('category', 'name')
      .lean();
    
    return { trending: serializeProducts(trending) };
  }
};

// Keywords that indicate a store-related product/order query
const STORE_KEYWORDS = [
  'bedsheet', 'curtain', 'blanket', 'quilt', 'sofa', 'pillow', 'cushion',
  'comforter', 'fabric', 'product', 'show me', 'do you have', 'price',
  'buy', 'order', 'track', 'delivery', 'shipping', 'return', 'refund',
  'in stock', 'available', 'trending', 'recommend'
];

const isStoreQuery = (text) => {
  const lower = text.toLowerCase();
  return STORE_KEYWORDS.some(kw => lower.includes(kw));
};

const PRODUCT_KEYWORDS = [
  'bedsheet', 'curtain', 'blanket', 'quilt', 'sofa', 'pillow', 'cushion',
  'comforter', 'fabric', 'product', 'show me', 'do you have', 'buy', 'in stock', 'available', 'search'
];

const isProductQuery = (text) => {
  const lower = text.toLowerCase();
  return PRODUCT_KEYWORDS.some(kw => lower.includes(kw));
};

const runLocalFallback = async (text, messages) => {
  try {
    const cleanText = text.toLowerCase();

    // 1. Order tracking — always handle locally
    if (cleanText.includes('order') || cleanText.includes('track')) {
      const match = text.match(/#?([0-9a-fA-F]{6,24})\b/);
      if (match) {
        const orderIdQuery = match[1];
        const orderRes = await dbFunctions.trackOrder({ orderId: orderIdQuery });
        if (orderRes.status === 'Not Found') {
          return { reply: `I couldn't find an order with ID "${orderIdQuery}". Please double-check your Order ID and try again!`, order: null };
        }
        return { reply: `Your order #${orderIdQuery} is currently in the **${orderRes.status}** stage!`, order: orderRes };
      }
      return { reply: "I'd be happy to track your order! Please share your Order ID (e.g. 'Track order fcdbbb8b').", order: null };
    }

    // 2. Direct Product Queries — search MongoDB first, then write a custom AI intro
    if (isProductQuery(cleanText)) {
      let category = null;
      if (cleanText.includes('bedsheet')) category = 'Bedsheets';
      else if (cleanText.includes('curtain')) category = 'Curtains';
      else if (cleanText.includes('blanket') || cleanText.includes('quilt')) category = 'Blankets & Quilts';
      else if (cleanText.includes('sofa')) category = 'Sofa Covers';
      else if (cleanText.includes('pillow') || cleanText.includes('cushion')) category = 'Pillows & Cushions';
      else if (cleanText.includes('comforter')) category = 'Comforters';

      let color = null;
      if (cleanText.includes('light')) color = 'light';
      else if (cleanText.includes('dark')) color = 'dark';

      let maxPrice = undefined;
      const priceMatch = cleanText.match(/(?:under|below|less than)?\s*(?:rs\.?|pkr)?\s*(\d+)/i);
      if (priceMatch && (cleanText.includes('under') || cleanText.includes('pkr') || cleanText.includes('rs') || cleanText.includes('below') || cleanText.includes('less'))) {
        maxPrice = parseInt(priceMatch[1], 10);
      }

      // Clean keyword of generic words and category names
      let keyword = text.toLowerCase();
      
      const categoryKeywords = ['bedsheets', 'bedsheet', 'curtains', 'curtain', 'blankets', 'blanket', 'quilt', 'quilts', 'sofa covers', 'sofa cover', 'pillows', 'pillow', 'cushions', 'cushion', 'comforters', 'comforter', 'fabrics', 'fabric'];
      categoryKeywords.forEach(kw => {
        keyword = keyword.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
      });

      const genericPhrases = ['show me all', 'show me', 'do you have any', 'do you have', 'i want to buy', 'i want', 'looking for', 'please show', 'please find', 'please search', 'available', 'in stock', 'buy', 'all', 'any', 'find', 'search', 'display'];
      genericPhrases.forEach(phrase => {
        keyword = keyword.replace(new RegExp(`\\b${phrase}\\b`, 'gi'), '');
      });

      keyword = keyword.replace(/under|below|above|pkr|rs|\d+/gi, '').replace(/\s+/g, ' ').trim();

      const searchRes = await dbFunctions.searchProducts({ keyword: keyword || undefined, category, color, maxPrice });

      if (searchRes.products && searchRes.products.length > 0) {
        try {
          const productListString = searchRes.products.slice(0, 8).map(p => `- ${p.name} (PKR ${p.price})`).join('\n');
          const customPrompt = `The customer asked: "${text}". I have successfully found these matching products in our database:\n${productListString}\n\nWrite a short, extremely warm, professional bedding expert greeting to introduce these products to the customer. DO NOT include any bulleted, numbered, or text list of the products in your final response under any circumstances, since the system will automatically display interactive cards for them right below your message. Just write a beautiful greeting inviting them to check out the cards shown below! Keep your response under 3 sentences. Do not mention any other fictitious products.`;
          
          const aiIntroduction = await executeSimpleChat({ 
            messages: [
              ...messages.slice(0, -1),
              { role: 'user', content: customPrompt }
            ] 
          });
          return { reply: aiIntroduction, products: searchRes.products };
        } catch (aiErr) {
          console.warn('AI prompt presentation failed, returning default text:', aiErr.message);
          return { reply: `I found ${searchRes.products.length} premium products matching your request! Take a look at them below:`, products: searchRes.products };
        }
      }

      // No matching products — pull trending recommendations
      const trending = await dbFunctions.getRecommendations({ type: 'trending' });
      try {
        const trendingListString = (trending.trending || []).slice(0, 5).map(p => `- ${p.name} (PKR ${p.price})`).join('\n');
        const customPrompt = `The customer asked: "${text}". We don't have exactly matching products in stock right now. However, we have these gorgeous trending products in stock:\n${trendingListString}\n\nWrite a short, highly polite customer service response explaining that we don't have exact matches but inviting them to explore our popular trending products shown below instead. DO NOT write any bulleted or numbered list of the products, since they will automatically show up as cards. Keep it under 3 sentences.`;
        
        const aiIntroduction = await executeSimpleChat({
          messages: [
            ...messages.slice(0, -1),
            { role: 'user', content: customPrompt }
          ]
        });
        return { reply: aiIntroduction, recommendations: trending, products: [] };
      } catch (aiErr) {
        return {
          reply: "I couldn't find specific matching products in our inventory right now. Would you like to check out our trending items shown below instead?",
          recommendations: trending,
          products: []
        };
      }
    }

    // 3. General Chat & Store Policies — direct Simple Chat AI
    try {
      const simpleReply = await executeSimpleChat({ messages });
      return { reply: simpleReply };
    } catch (simpleErr) {
      console.warn('All AI providers failed, returning fallback text:', simpleErr.message);
      return { reply: "I'm having a small connection issue right now. Product search and order tracking still work — try 'Show me bedsheets' or 'Track my order'!" };
    }

  } catch (err) {
    console.error('runLocalFallback error:', err.message);
    return { reply: "I'm having a small technical issue right now. Please try again in a moment! You can ask me to show products or track your order." };
  }
};

const assistantChat = async (req, res) => {
  try {
    const messageText = (req.body.message || '').toString().trim();
    // Allow frontend to send full message history for context
    const messages = Array.isArray(req.body.messages) && req.body.messages.length > 0
      ? req.body.messages
      : [{ role: 'user', content: messageText }];

    if (!messageText && messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    let aiResult;
    try {
      aiResult = await executeChatAgent({ messages, dbFunctions });
    } catch (aiError) {
      console.warn('AI Chat Agent failed, launching smart fallback engine:', aiError.message);
      const fallback = await runLocalFallback(messageText, messages);
      aiResult = {
        reply: fallback.reply,
        products: fallback.products || [],
        recommendations: fallback.recommendations || null,
        order: fallback.order || null,
        suggestions: ['Show trending products', 'Track my order', 'Show me bedsheets']
      };
    }

    res.json({
      success: true,
      reply: aiResult.reply,
      products: aiResult.products,
      recommendations: aiResult.recommendations,
      order: aiResult.order,
      suggestions: aiResult.suggestions
    });
  } catch (error) {
    console.error('Assistant top-level error:', error.message);
    // Never return a 500 — always respond with success:true so frontend shows a message not an error
    return res.json({
      success: true,
      reply: "I'm having a small connection issue right now. Product search and order tracking still work — try 'Show me bedsheets' or 'Track my order'!",
      products: [],
      recommendations: null,
      order: null,
      suggestions: ['Show trending products', 'Track my order', 'Show me bedsheets']
    });
  }
};

const assistantSuggest = async (req, res) => {
  try {
    const query = (req.query.q || '').toString().trim();
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
    if (productId && mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId).populate('category', 'name').lean();
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

module.exports = { assistantChat, assistantSuggest, assistantSeo };
