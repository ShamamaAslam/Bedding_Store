const mongoose = require('mongoose');
const Order = require('../Models/Order');
const Product = require('../Models/Products');
const User = require('../Models/User');
const AnalyticsEvent = require('../Models/AnalyticsEvent');

const CHECKOUT_STEPS = [
  'checkout_start',
  'checkout_shipping_filled',
  'checkout_payment_selected',
  'checkout_submit_attempt',
  'checkout_payment_success',
  'checkout_order_success'
];

const ALLOWED_EVENT_TYPES = new Set([
  'session_source',
  'product_view',
  'product_click',
  'add_to_cart',
  'wishlist_add',
  'wishlist_remove',
  'search_query',
  ...CHECKOUT_STEPS,
  'checkout_payment_failed'
]);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const normalizeKeyword = (value = '') => String(value).trim().toLowerCase();

const safeObjectId = (value) => {
  if (!value) return null;
  const str = String(value);
  return mongoose.Types.ObjectId.isValid(str) ? new mongoose.Types.ObjectId(str) : null;
};

const aggregateSalesByProduct = async () => {
  const rows = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        soldQty: { $sum: '$items.quantity' },
        soldRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        avgSellingPrice: { $avg: '$items.price' },
        lastSoldAt: { $max: '$createdAt' }
      }
    }
  ]);

  const map = new Map();
  rows.forEach((row) => {
    if (!row?._id) return;
    map.set(String(row._id), row);
  });
  return map;
};

const buildBehaviorAnalytics = async (salesByProductMap) => {
  const [topClickedRows, topViewedRows, cartRows] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'product_click', product: { $ne: null } } },
      { $group: { _id: '$product', clicks: { $sum: 1 }, lastClickAt: { $max: '$createdAt' } } },
      { $sort: { clicks: -1 } },
      { $limit: 20 }
    ]),
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'product_view', product: { $ne: null } } },
      { $group: { _id: '$product', views: { $sum: 1 }, lastViewedAt: { $max: '$createdAt' } } },
      { $sort: { views: -1 } },
      { $limit: 40 }
    ]),
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'add_to_cart', product: { $ne: null } } },
      {
        $group: {
          _id: '$product',
          addToCartCount: { $sum: 1 },
          addedQty: { $sum: { $ifNull: ['$metadata.quantity', 1] } },
          lastAddedAt: { $max: '$createdAt' }
        }
      },
      { $sort: { addToCartCount: -1 } },
      { $limit: 40 }
    ])
  ]);

  const allProductIds = Array.from(new Set([
    ...topClickedRows.map((r) => String(r._id)),
    ...topViewedRows.map((r) => String(r._id)),
    ...cartRows.map((r) => String(r._id))
  ]));

  const products = await Product.find({ _id: { $in: allProductIds.map((id) => safeObjectId(id)).filter(Boolean) } })
    .select('name stock price purchases')
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const topClickedProducts = topClickedRows.map((row) => {
    const product = productMap.get(String(row._id));
    return {
      productId: String(row._id),
      productName: product?.name || 'Unknown Product',
      clicks: row.clicks,
      stock: toNumber(product?.stock),
      purchases: toNumber(product?.purchases),
      lastClickAt: row.lastClickAt
    };
  });

  const viewedNotBoughtProducts = topViewedRows
    .map((row) => {
      const product = productMap.get(String(row._id));
      const sale = salesByProductMap.get(String(row._id));
      const soldQty = toNumber(sale?.soldQty);
      const conversionRate = row.views > 0 ? Number(((soldQty / row.views) * 100).toFixed(2)) : 0;
      return {
        productId: String(row._id),
        productName: product?.name || sale?.productName || 'Unknown Product',
        views: row.views,
        soldQty,
        conversionRate,
        lastViewedAt: row.lastViewedAt
      };
    })
    .filter((row) => row.views > row.soldQty)
    .sort((a, b) => (b.views - b.soldQty) - (a.views - a.soldQty))
    .slice(0, 20);

  const cartAbandonmentProducts = cartRows
    .map((row) => {
      const product = productMap.get(String(row._id));
      const sale = salesByProductMap.get(String(row._id));
      const purchasedQty = toNumber(sale?.soldQty);
      const abandonedQty = Math.max(0, toNumber(row.addedQty) - purchasedQty);
      const abandonmentRate = row.addToCartCount > 0
        ? Number(((abandonedQty / row.addToCartCount) * 100).toFixed(2))
        : 0;

      return {
        productId: String(row._id),
        productName: product?.name || sale?.productName || 'Unknown Product',
        addToCartCount: row.addToCartCount,
        addedQty: toNumber(row.addedQty),
        purchasedQty,
        abandonedQty,
        abandonmentRate,
        lastAddedAt: row.lastAddedAt
      };
    })
    .filter((row) => row.abandonedQty > 0)
    .sort((a, b) => b.abandonedQty - a.abandonedQty)
    .slice(0, 20);

  const checkoutCounts = await AnalyticsEvent.aggregate([
    { $match: { eventType: { $in: CHECKOUT_STEPS } } },
    { $group: { _id: '$eventType', count: { $sum: 1 } } }
  ]);

  const checkoutMap = new Map(checkoutCounts.map((r) => [r._id, r.count]));
  const checkoutDropoff = CHECKOUT_STEPS.map((step, index) => {
    const current = toNumber(checkoutMap.get(step));
    if (index === 0) {
      return { step, count: current, dropOff: 0, dropOffRate: 0 };
    }

    const prev = toNumber(checkoutMap.get(CHECKOUT_STEPS[index - 1]));
    const dropOff = Math.max(0, prev - current);
    const dropOffRate = prev > 0 ? Number(((dropOff / prev) * 100).toFixed(2)) : 0;
    return { step, count: current, dropOff, dropOffRate };
  });

  return {
    topClickedProducts,
    viewedNotBoughtProducts,
    cartAbandonmentProducts,
    checkoutDropoff
  };
};

const buildSearchIntelligence = async () => {
  const sevenDaysAgo = daysAgo(7);

  const [topKeywords, noResultSearches, misspelledSearches, trendingSearches] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: { eventType: 'search_query', keyword: { $nin: ['', null] } } },
      { $group: { _id: '$keyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search_query',
          keyword: { $nin: ['', null] },
          'metadata.resultsCount': { $eq: 0 }
        }
      },
      { $group: { _id: '$keyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search_query',
          keyword: { $nin: ['', null] },
          'metadata.correctedKeyword': { $nin: ['', null] }
        }
      },
      {
        $group: {
          _id: {
            original: '$keyword',
            corrected: '$metadata.correctedKeyword'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'search_query',
          keyword: { $nin: ['', null] },
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      { $group: { _id: '$keyword', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ])
  ]);

  return {
    topKeywords: topKeywords.map((row) => ({ keyword: row._id, count: row.count })),
    noResultSearches: noResultSearches.map((row) => ({ keyword: row._id, count: row.count })),
    misspelledSearches: misspelledSearches.map((row) => ({
      originalKeyword: row._id?.original,
      correctedKeyword: row._id?.corrected,
      count: row.count
    })),
    trendingSearches: trendingSearches.map((row) => ({ keyword: row._id, count: row.count }))
  };
};

const buildProfitDashboard = async (salesByProductMap) => {
  const soldProductIds = Array.from(salesByProductMap.keys());
  const products = await Product.find({ _id: { $in: soldProductIds.map((id) => safeObjectId(id)).filter(Boolean) } })
    .select('name price costPrice shippingCost marketingCost supplier')
    .lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const byProduct = soldProductIds.map((productId) => {
    const sale = salesByProductMap.get(productId);
    const product = productMap.get(productId);
    const soldQty = toNumber(sale?.soldQty);
    const revenue = toNumber(sale?.soldRevenue);

    const unitCost = toNumber(product?.costPrice);
    const unitShippingCost = toNumber(product?.shippingCost);
    const unitMarketingCost = toNumber(product?.marketingCost);

    const productCost = unitCost * soldQty;
    const shippingCost = unitShippingCost * soldQty;
    const marketingCost = unitMarketingCost * soldQty;
    const grossProfit = revenue - productCost;
    const netProfit = grossProfit - shippingCost - marketingCost;
    const marginPercent = revenue > 0 ? Number(((netProfit / revenue) * 100).toFixed(2)) : 0;

    return {
      productId,
      productName: product?.name || sale?.productName || 'Unknown Product',
      unitsSold: soldQty,
      productCost,
      sellingPrice: toNumber(sale?.avgSellingPrice),
      revenue,
      shippingCost,
      marketingCost,
      grossProfit,
      netProfit,
      marginPercent
    };
  }).sort((a, b) => b.netProfit - a.netProfit);

  const summary = byProduct.reduce((acc, item) => {
    acc.totalRevenue += item.revenue;
    acc.totalProductCost += item.productCost;
    acc.totalShippingCost += item.shippingCost;
    acc.totalMarketingCost += item.marketingCost;
    acc.totalGrossProfit += item.grossProfit;
    acc.totalNetProfit += item.netProfit;
    return acc;
  }, {
    totalRevenue: 0,
    totalProductCost: 0,
    totalShippingCost: 0,
    totalMarketingCost: 0,
    totalGrossProfit: 0,
    totalNetProfit: 0
  });

  summary.netProfitMargin = summary.totalRevenue > 0
    ? Number(((summary.totalNetProfit / summary.totalRevenue) * 100).toFixed(2))
    : 0;

  return {
    summary,
    byProduct: byProduct.slice(0, 50)
  };
};

const buildCustomerSegmentation = async () => {
  const ninetyDaysAgo = daysAgo(90);
  const thirtyDaysAgo = daysAgo(30);

  const customerOrders = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        lastOrderAt: { $max: '$createdAt' }
      }
    }
  ]);

  const orderMap = new Map(customerOrders.map((row) => [String(row._id), row]));

  const [users, cartAbandonersRows] = await Promise.all([
    User.find({ role: 'user' }).select('name email createdAt').lean(),
    AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: 'add_to_cart',
          user: { $ne: null },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      { $group: { _id: '$user', cartAdds: { $sum: 1 } } },
      {
        $lookup: {
          from: 'analyticsevents',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$eventType', 'checkout_order_success'] },
                    { $gte: ['$createdAt', thirtyDaysAgo] }
                  ]
                }
              }
            }
          ],
          as: 'ordersPlaced'
        }
      },
      { $match: { ordersPlaced: { $size: 0 } } },
      { $sort: { cartAdds: -1 } },
      { $limit: 30 }
    ])
  ]);

  const enriched = users.map((user) => {
    const orderData = orderMap.get(String(user._id));
    return {
      userId: String(user._id),
      name: user.name,
      email: user.email,
      totalSpent: toNumber(orderData?.totalSpent),
      totalOrders: toNumber(orderData?.totalOrders),
      lastOrderAt: orderData?.lastOrderAt || null,
      isInactive: !orderData?.lastOrderAt || new Date(orderData.lastOrderAt) < ninetyDaysAgo
    };
  });

  const vipCustomers = enriched.filter((row) => row.totalSpent >= 50000).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 20);
  const repeatCustomers = enriched.filter((row) => row.totalOrders >= 2).sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 20);
  const highSpenders = enriched.filter((row) => row.totalSpent >= 30000).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 20);
  const inactiveCustomers = enriched.filter((row) => row.isInactive).sort((a, b) => new Date(a.lastOrderAt || 0) - new Date(b.lastOrderAt || 0)).slice(0, 30);

  const cartAbandoners = cartAbandonersRows.map((row) => {
    const user = users.find((u) => String(u._id) === String(row._id));
    return {
      userId: String(row._id),
      name: user?.name || 'Unknown',
      email: user?.email || '',
      cartAdds: row.cartAdds
    };
  });

  return {
    summary: {
      totalCustomers: users.length,
      vipCount: vipCustomers.length,
      repeatCount: repeatCustomers.length,
      highSpenderCount: highSpenders.length,
      inactiveCount: inactiveCustomers.length,
      cartAbandonerCount: cartAbandoners.length
    },
    vipCustomers,
    repeatCustomers,
    highSpenders,
    inactiveCustomers,
    cartAbandoners
  };
};

const buildReturnRefundAnalytics = async () => {
  const returnOrders = await Order.find({
    $or: [
      { orderStatus: 'Cancelled' },
      { refundAmount: { $gt: 0 } },
      { returnReason: { $ne: '' } },
      { returnedAt: { $ne: null } }
    ]
  }).populate('items.product', 'name supplier').lean();

  const byProductMap = new Map();
  const reasonMap = new Map();

  let refundLoss = 0;
  let defectiveCount = 0;

  returnOrders.forEach((order) => {
    const orderRefund = toNumber(order.refundAmount, order.orderStatus === 'Cancelled' ? order.totalAmount : 0);
    refundLoss += orderRefund;
    if (order.isDefective) defectiveCount += 1;

    const reason = String(order.returnReason || (order.orderStatus === 'Cancelled' ? 'Order Cancelled' : 'Unspecified')).trim();
    reasonMap.set(reason, toNumber(reasonMap.get(reason)) + 1);

    (order.items || []).forEach((item) => {
      const productId = String(item.product?._id || item.product || item.name || 'unknown');
      const existing = byProductMap.get(productId) || {
        productId,
        productName: item.product?.name || item.name || 'Unknown Product',
        returns: 0,
        refundedAmount: 0,
        defectiveReturns: 0
      };

      existing.returns += toNumber(item.quantity, 1);
      existing.refundedAmount += orderRefund;
      if (order.isDefective) existing.defectiveReturns += 1;
      byProductMap.set(productId, existing);
    });
  });

  const mostReturnedProducts = Array.from(byProductMap.values())
    .sort((a, b) => b.returns - a.returns)
    .slice(0, 20);

  const returnReasons = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    summary: {
      totalReturnedOrders: returnOrders.length,
      refundLoss,
      defectiveCount
    },
    mostReturnedProducts,
    returnReasons
  };
};

const buildSupplierIntelligence = async (salesByProductMap, returnAnalytics) => {
  const products = await Product.find({ 'supplier.name': { $ne: '' } })
    .select('name price costPrice supplier')
    .lean();

  const defectiveMap = new Map(
    (returnAnalytics?.mostReturnedProducts || []).map((row) => [row.productId, toNumber(row.defectiveReturns)])
  );

  const supplierMap = new Map();

  products.forEach((product) => {
    const supplierName = product?.supplier?.name || 'Unknown Supplier';
    const sale = salesByProductMap.get(String(product._id));
    const soldQty = toNumber(sale?.soldQty);
    const revenue = toNumber(sale?.soldRevenue);
    const cost = toNumber(product.costPrice) * soldQty;
    const margin = revenue - cost;
    const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;
    const defectiveReturns = toNumber(defectiveMap.get(String(product._id)));

    const existing = supplierMap.get(supplierName) || {
      supplier: supplierName,
      products: 0,
      soldQty: 0,
      revenue: 0,
      margin: 0,
      avgMarginRate: 0,
      avgDeliveryDays: 0,
      avgQualityScore: 0,
      qualityIssues: 0
    };

    existing.products += 1;
    existing.soldQty += soldQty;
    existing.revenue += revenue;
    existing.margin += margin;
    existing.avgMarginRate += marginRate;
    existing.avgDeliveryDays += toNumber(product?.supplier?.avgDeliveryDays);
    existing.avgQualityScore += toNumber(product?.supplier?.qualityScore);
    existing.qualityIssues += defectiveReturns;

    supplierMap.set(supplierName, existing);
  });

  const suppliers = Array.from(supplierMap.values()).map((row) => ({
    ...row,
    avgMarginRate: row.products > 0 ? Number((row.avgMarginRate / row.products).toFixed(2)) : 0,
    avgDeliveryDays: row.products > 0 ? Number((row.avgDeliveryDays / row.products).toFixed(2)) : 0,
    avgQualityScore: row.products > 0 ? Number((row.avgQualityScore / row.products).toFixed(2)) : 0
  }));

  const bestMargins = [...suppliers].sort((a, b) => b.avgMarginRate - a.avgMarginRate).slice(0, 10);
  const deliveryDelays = [...suppliers].sort((a, b) => b.avgDeliveryDays - a.avgDeliveryDays).slice(0, 10);
  const qualityIssues = [...suppliers].sort((a, b) => b.qualityIssues - a.qualityIssues).slice(0, 10);

  return {
    suppliers,
    bestMargins,
    deliveryDelays,
    qualityIssues
  };
};

const buildMarketingAttribution = async () => {
  const rows = await Order.aggregate([
    { $match: { orderStatus: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: { $ifNull: ['$marketingSource', 'direct'] },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalAmount' }
      }
    },
    { $sort: { revenue: -1 } }
  ]);

  return rows.map((row) => ({
    source: row._id || 'direct',
    orders: row.orders,
    revenue: row.revenue
  }));
};

const buildAutomatedAlerts = async () => {
  const twentyFourHoursAgo = daysAgo(1);
  const fortyEightHoursAgo = daysAgo(2);
  const ninetyDaysAgo = daysAgo(90);

  const [lowStockProducts, last24hOrders, previous24hOrders, paymentFailures24h, deadStockProducts, addToCartEvents30d, checkoutSuccess30d] = await Promise.all([
    Product.find({ stock: { $lt: 5 }, isActive: true }).select('name stock').limit(10).lean(),
    Order.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
    Order.countDocuments({ createdAt: { $gte: fortyEightHoursAgo, $lt: twentyFourHoursAgo } }),
    Order.countDocuments({ paymentStatus: 'Failed', createdAt: { $gte: twentyFourHoursAgo } }),
    Product.find({ stock: { $gt: 0 }, purchases: { $lt: 1 }, createdAt: { $lte: ninetyDaysAgo } })
      .select('name stock createdAt')
      .limit(10)
      .lean(),
    AnalyticsEvent.countDocuments({ eventType: 'add_to_cart', createdAt: { $gte: daysAgo(30) } }),
    AnalyticsEvent.countDocuments({ eventType: 'checkout_order_success', createdAt: { $gte: daysAgo(30) } })
  ]);

  const alerts = [];

  if (lowStockProducts.length > 0) {
    alerts.push({
      type: 'low_stock',
      severity: 'high',
      title: 'Low stock alert',
      message: `${lowStockProducts.length} products are below stock threshold.`
    });
  }

  if (previous24hOrders > 0 && last24hOrders >= previous24hOrders * 1.5) {
    alerts.push({
      type: 'sales_spike',
      severity: 'medium',
      title: 'Sudden sales spike',
      message: `Orders jumped from ${previous24hOrders} to ${last24hOrders} in the last 24h.`
    });
  }

  if (deadStockProducts.length > 0) {
    alerts.push({
      type: 'dead_stock',
      severity: 'medium',
      title: 'Dead stock detected',
      message: `${deadStockProducts.length} products have not sold in 90+ days.`
    });
  }

  if (paymentFailures24h > 0) {
    alerts.push({
      type: 'payment_failures',
      severity: paymentFailures24h >= 5 ? 'high' : 'medium',
      title: 'Payment failures detected',
      message: `${paymentFailures24h} failed payments in the last 24h.`
    });
  }

  const abandonmentRate = addToCartEvents30d > 0
    ? Number((((addToCartEvents30d - checkoutSuccess30d) / addToCartEvents30d) * 100).toFixed(2))
    : 0;

  if (abandonmentRate >= 60) {
    alerts.push({
      type: 'high_cart_abandonment',
      severity: 'high',
      title: 'High cart abandonment',
      message: `Cart abandonment is ${abandonmentRate}% in the last 30 days.`
    });
  }

  const fraudOrders = await Order.find({
    createdAt: { $gte: daysAgo(7) },
    $or: [
      { totalAmount: { $gte: 150000 } },
      { paymentStatus: 'Failed' }
    ]
  }).select('totalAmount paymentStatus createdAt').limit(20).lean();

  if (fraudOrders.length >= 5) {
    alerts.push({
      type: 'fraud_risk',
      severity: 'high',
      title: 'Potential fraud pattern',
      message: `${fraudOrders.length} risky orders detected in the last 7 days.`
    });
  }

  return {
    alerts,
    data: {
      lowStockProducts,
      deadStockProducts,
      paymentFailures24h,
      abandonmentRate,
      riskyOrders: fraudOrders.length
    }
  };
};

const getAnalytics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const [totalUsers, stockResult, totalProducts, salesByStatus, dailyRevenue, paymentMethods, recentOrders] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Product.aggregate([{ $group: { _id: null, totalStock: { $sum: '$stock' } } }]),
      Product.countDocuments(),
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: daysAgo(30) }, orderStatus: { $ne: 'Cancelled' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } }
      ]),
      Order.find()
        .populate('user', 'name email phone')
        .populate('items.product', 'name slug')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const totalStock = stockResult[0]?.totalStock || 0;

    const salesByProductMap = await aggregateSalesByProduct();
    const bestSellers = Array.from(salesByProductMap.values())
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 10)
      .map((item) => ({
        _id: item._id,
        productName: item.productName,
        totalQuantitySold: item.soldQty,
        totalRevenue: item.soldRevenue
      }));

    const [
      behaviorAnalytics,
      searchIntelligence,
      profitDashboard,
      customerSegmentation,
      returnRefundAnalytics,
      marketingAttribution,
      automatedAlerts
    ] = await Promise.all([
      buildBehaviorAnalytics(salesByProductMap),
      buildSearchIntelligence(),
      buildProfitDashboard(salesByProductMap),
      buildCustomerSegmentation(),
      buildReturnRefundAnalytics(),
      buildMarketingAttribution(),
      buildAutomatedAlerts()
    ]);

    const supplierIntelligence = await buildSupplierIntelligence(salesByProductMap, returnRefundAnalytics);

    res.json({
      success: true,
      summary: {
        totalOrders,
        totalRevenue,
        totalUsers,
        totalStock,
        totalProducts,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0
      },
      bestSellers,
      recentOrders,
      salesByStatus,
      dailyRevenue,
      paymentMethods,
      lowStockProducts: automatedAlerts.data.lowStockProducts,
      customerPsychology: behaviorAnalytics,
      searchIntelligence,
      profitDashboard,
      customerSegmentation,
      returnRefundAnalytics,
      supplierIntelligence,
      marketingAttribution,
      alerts: automatedAlerts.alerts,
      alertData: automatedAlerts.data
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const logAnalyticsEvent = async (req, res) => {
  try {
    const {
      eventType,
      productId,
      orderId,
      sessionId,
      keyword,
      source,
      step,
      page,
      metadata
    } = req.body || {};

    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }

    if (!ALLOWED_EVENT_TYPES.has(String(eventType).trim())) {
      return res.status(400).json({ success: false, message: 'Unsupported eventType' });
    }

    const event = await AnalyticsEvent.create({
      eventType: String(eventType).trim(),
      user: req.user?._id || null,
      product: safeObjectId(productId),
      order: safeObjectId(orderId),
      sessionId: String(sessionId || '').slice(0, 120),
      keyword: normalizeKeyword(keyword).slice(0, 120),
      source: String(source || '').slice(0, 120),
      step: String(step || '').slice(0, 120),
      page: String(page || '').slice(0, 160),
      metadata: (metadata && typeof metadata === 'object') ? metadata : {}
    });

    return res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPersonalizedRecommendations = async (req, res) => {
  try {
    const sessionId = String(req.query?.sessionId || '').trim();

    const eventMatch = { eventType: { $in: ['product_view', 'product_click', 'wishlist_add'] } };
    if (req.user?._id) {
      eventMatch.user = req.user._id;
    } else if (sessionId) {
      eventMatch.sessionId = sessionId;
    }

    const [events, purchasedOrders, userDoc] = await Promise.all([
      AnalyticsEvent.find(eventMatch)
        .sort({ createdAt: -1 })
        .limit(80)
        .select('product')
        .lean(),
      req.user?._id
        ? Order.find({ user: req.user._id, orderStatus: { $ne: 'Cancelled' } })
          .sort({ createdAt: -1 })
          .limit(40)
          .select('items.product')
          .lean()
        : Promise.resolve([]),
      req.user?._id
        ? User.findById(req.user._id).select('wishlist').lean()
        : Promise.resolve(null)
    ]);

    const seedIds = new Set();
    events.forEach((e) => { if (e?.product) seedIds.add(String(e.product)); });
    purchasedOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item?.product) seedIds.add(String(item.product));
      });
    });
    (userDoc?.wishlist || []).forEach((id) => seedIds.add(String(id)));

    const seedProducts = seedIds.size > 0
      ? await Product.find({ _id: { $in: Array.from(seedIds).map((id) => safeObjectId(id)).filter(Boolean) } })
        .select('category fabricType')
        .lean()
      : [];

    const categoryIds = Array.from(new Set(seedProducts.map((p) => String(p.category)).filter(Boolean)));
    const fabricTypes = Array.from(new Set(seedProducts.map((p) => String(p.fabricType || '').trim()).filter(Boolean)));

    let recommendationPool;

    if (categoryIds.length > 0 || fabricTypes.length > 0) {
      recommendationPool = await Product.find({
        isActive: true,
        stock: { $gt: 0 },
        _id: { $nin: Array.from(seedIds).map((id) => safeObjectId(id)).filter(Boolean) },
        $or: [
          ...(categoryIds.length > 0 ? [{ category: { $in: categoryIds.map((id) => safeObjectId(id)).filter(Boolean) } }] : []),
          ...(fabricTypes.length > 0 ? [{ fabricType: { $in: fabricTypes } }] : [])
        ]
      })
        .select('name price discountPrice category fabricType purchases images')
        .sort({ purchases: -1, createdAt: -1 })
        .limit(20)
        .lean();
    } else {
      recommendationPool = await Product.find({ isActive: true, stock: { $gt: 0 } })
        .select('name price discountPrice category fabricType purchases images')
        .sort({ purchases: -1, createdAt: -1 })
        .limit(20)
        .lean();
    }

    return res.json({
      success: true,
      recommendations: recommendationPool.slice(0, 8)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnalytics,
  logAnalyticsEvent,
  getPersonalizedRecommendations
};

