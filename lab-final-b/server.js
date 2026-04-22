const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const session = require('express-session');
const SeoSetting = require('./models/SeoSetting');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Order = require('./models/Order');
const User = require('./models/User');
const { loadCurrentUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3004;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Render (and similar hosts) terminate TLS at a proxy.
app.set('trust proxy', 1);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scoopcraft-store';

async function connectToMongoWithRetry(maxAttempts = 6) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000
      });
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      console.error(`MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${message}`);

      if (attempt >= maxAttempts) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'scoopcraft-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  })
);

// Helmet security + SEO-friendly response headers.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com']
      }
    },
    crossOriginResourcePolicy: { policy: 'same-site' }
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(loadCurrentUser);

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function toPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

function buildPathHint(pathname) {
  const pathKey = String(pathname || '/').toLowerCase();
  const hints = [
    { key: '/products', hint: 'Product browsing context. Mention filters, stock, and recommendations.' },
    { key: '/product', hint: 'Product detail context. Focus on specific product comparisons and flavours.' },
    { key: '/cart', hint: 'Cart context. Prioritize totals, quantity edits, shipping and checkout guidance.' },
    { key: '/checkout', hint: 'Checkout context. Prioritize payment, shipping address and order confirmation support.' },
    { key: '/track-order', hint: 'Order tracking context. Prioritize status timeline and delivery guidance.' },
    { key: '/my-orders', hint: 'My orders context. Help user review and understand previous orders.' },
    { key: '/wishlist', hint: 'Wishlist context. Suggest saved products and next steps.' },
    { key: '/admin', hint: 'Admin context. Give concise operational insights from live stats.' }
  ];

  const match = hints.find((item) => pathKey.includes(item.key));
  return match ? match.hint : 'General storefront context. Provide concise shopping support.';
}

async function buildCartContext(cartInput) {
  const cart = Array.isArray(cartInput) ? cartInput : [];
  if (!cart.length) {
    return {
      count: 0,
      subtotal: 0,
      items: []
    };
  }

  const ids = cart.map((item) => String(item?.productId || '')).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } })
    .select('name price image category isActive stock')
    .lean();
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  let subtotal = 0;
  const items = [];

  cart.forEach((item) => {
    const product = productMap.get(String(item?.productId || ''));
    if (!product) {
      return;
    }

    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const itemTotal = toPrice((Number(product.price) || 0) * quantity);
    subtotal += itemTotal;
    items.push({
      name: product.name,
      quantity,
      price: toPrice(product.price),
      itemTotal,
      selectedFlavours: Array.isArray(item?.selectedFlavours) ? item.selectedFlavours.slice(0, 4) : [],
      scoopCount: Number(item?.scoopCount) || 0
    });
  });

  return {
    count: items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
    subtotal: toPrice(subtotal),
    items: items.slice(0, 8)
  };
}

async function buildLiveAiContext(req, pathname) {
  const [seo, categories, products, recentProducts, totalProducts, activeProducts] = await Promise.all([
    SeoSetting.findOne().select('siteTitle metaDescription metaKeywords').lean(),
    Category.find().sort({ name: 1 }).select('name description').lean(),
    Product.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .select('name price rarity category stock flavourOptions shortDescription description isActive updatedAt')
      .lean(),
    Product.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('name price rarity category stock shortDescription updatedAt')
      .lean(),
    Product.countDocuments({}),
    Product.countDocuments({ isActive: true })
  ]);

  const minPrice = products.length ? Math.min(...products.map((row) => Number(row.price) || 0)) : 0;
  const maxPrice = products.length ? Math.max(...products.map((row) => Number(row.price) || 0)) : 0;
  const totalStock = products.reduce((sum, row) => sum + (Number(row.stock) || 0), 0);
  const lowStockCount = products.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= 10).length;
  const outOfStockCount = products.filter((row) => Number(row.stock) <= 0).length;

  const flavourCounter = new Map();
  products.forEach((product) => {
    const options = Array.isArray(product.flavourOptions) ? product.flavourOptions : [];
    options.forEach((option) => {
      const key = String(option?.name || '').trim();
      if (!key) {
        return;
      }
      flavourCounter.set(key, (flavourCounter.get(key) || 0) + 1);
    });
  });

  const popularFlavours = Array.from(flavourCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, usedInProducts: count }));

  const userId = req.session?.userId ? String(req.session.userId) : '';
  const currentUser = req.session?.currentUser || null;
  const cartContext = await buildCartContext(req.session?.cart || []);

  let userContext = {
    isSignedIn: Boolean(userId),
    role: currentUser?.role || 'Guest',
    name: currentUser?.name || '',
    cart: cartContext,
    recentOrders: []
  };

  if (userId) {
    const [orders, user] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('status total plan createdAt items')
        .lean(),
      User.findById(userId).select('wishlist').lean()
    ]);

    userContext = {
      ...userContext,
      wishlistCount: Array.isArray(user?.wishlist) ? user.wishlist.length : 0,
      recentOrders: orders.map((order) => ({
        id: String(order._id),
        status: order.status,
        total: toPrice(order.total),
        plan: order.plan,
        createdAt: order.createdAt,
        itemCount: Array.isArray(order.items) ? order.items.length : 0
      }))
    };
  }

  let adminStats = null;
  if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
    const [allOrdersCount, placedCount, processingCount, deliveredCount, latestOrders] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'Placed' }),
      Order.countDocuments({ status: 'Processing' }),
      Order.countDocuments({ status: 'Delivered' }),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(6)
        .select('status total createdAt customer.name')
        .lean()
    ]);

    adminStats = {
      orders: {
        total: allOrdersCount,
        placed: placedCount,
        processing: processingCount,
        delivered: deliveredCount
      },
      latestOrders: latestOrders.map((order) => ({
        status: order.status,
        total: toPrice(order.total),
        createdAt: order.createdAt,
        customerName: truncateText(order?.customer?.name || 'Customer', 32)
      }))
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    page: {
      pathname,
      hint: buildPathHint(pathname)
    },
    seo: {
      siteTitle: seo?.siteTitle || 'ScoopCraft Pints',
      metaDescription: truncateText(seo?.metaDescription || '', 220),
      metaKeywords: truncateText(seo?.metaKeywords || '', 220)
    },
    catalog: {
      counts: {
        totalProducts,
        activeProducts,
        categories: categories.length
      },
      priceRange: {
        min: toPrice(minPrice),
        max: toPrice(maxPrice)
      },
      stock: {
        totalUnits: totalStock,
        lowStockProducts: lowStockCount,
        outOfStockProducts: outOfStockCount
      },
      categories: categories.map((category) => ({
        name: category.name,
        description: truncateText(category.description || '', 110)
      })),
      recentProducts: recentProducts.map((product) => ({
        name: product.name,
        category: product.category || 'General',
        rarity: product.rarity,
        price: toPrice(product.price),
        stock: Number(product.stock) || 0,
        note: truncateText(product.shortDescription || product.description || '', 140),
        updatedAt: product.updatedAt
      })),
      popularFlavours
    },
    user: userContext,
    admin: adminStats,
    policies: {
      taxRate: '8%',
      shippingFlatRate: '$5.99',
      shippingEta: '2-3 business days',
      subscriptionDiscount: '20% weekly plan discount'
    }
  };
}

// Server-side Gemini proxy keeps API key out of browser code.
app.post('/api/chatbot/ai', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const pathname = String(req.body?.pathname || '/').trim();
    const pageContext = req.body?.pageContext && typeof req.body.pageContext === 'object' ? req.body.pageContext : {};

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(503).json({ success: false, error: 'AI service is not configured.' });
    }

    const liveContext = await buildLiveAiContext(req, pathname);

    const historyText = history
      .slice(-8)
      .map((item) => {
        const role = String(item?.role || '').toLowerCase() === 'user' ? 'User' : 'Assistant';
        const text = String(item?.text || '').trim();
        return text ? `${role}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');

    const prompt = [
      'You are ScoopCraft Assistant for an e-commerce ice cream store.',
      'Use only the provided LIVE SITE CONTEXT and conversation context.',
      'Answer clearly and dynamically with real-time catalog/order/cart data when relevant.',
      'Keep answers concise, practical, and helpful for shopping.',
      'If user asks recommendations, suggest specific flavour/product combos from available catalog context.',
      'If user asks price/shipping/orders, answer directly and include next action guidance.',
      'If required data is missing, say what is missing and ask one focused follow-up.',
      `Current page path: ${pathname}`,
      `CLIENT PAGE CONTEXT JSON:\n${JSON.stringify(pageContext, null, 2)}`,
      `LIVE SITE CONTEXT JSON:\n${JSON.stringify(liveContext, null, 2)}`,
      historyText ? `Conversation so far:\n${historyText}` : '',
      `Latest user message: ${message}`
    ]
      .filter(Boolean)
      .join('\n\n');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          maxOutputTokens: 320
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return res.status(502).json({
        success: false,
        error: 'Gemini request failed.',
        details: errorText.slice(0, 300)
      });
    }

    const payload = await geminiResponse.json();
    const parts = payload?.candidates?.[0]?.content?.parts;
    const reply = Array.isArray(parts)
      ? parts.map((part) => String(part?.text || '')).join('\n').trim()
      : '';

    if (!reply) {
      return res.status(502).json({ success: false, error: 'Gemini returned an empty response.' });
    }

    return res.json({ success: true, reply });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'AI request failed.' });
  }
});

app.get('/api/chatbot/track-latest', async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        signedIn: false,
        error: 'Sign in required.'
      });
    }

    const latestOrder = await Order.findOne({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestOrder) {
      return res.json({
        success: true,
        signedIn: true,
        hasOrder: false
      });
    }

    const trackingHistory = Array.isArray(latestOrder.trackingHistory)
      ? latestOrder.trackingHistory
          .map((event) => ({
            status: String(event?.status || '').trim(),
            note: String(event?.note || '').trim(),
            updatedAt: event?.updatedAt || null
          }))
          .filter((event) => event.status)
      : [];

    return res.json({
      success: true,
      signedIn: true,
      hasOrder: true,
      order: {
        id: String(latestOrder._id),
        status: String(latestOrder.status || 'Placed'),
        total: toPrice(latestOrder.total),
        createdAt: latestOrder.createdAt || null,
        itemCount: Array.isArray(latestOrder.items) ? latestOrder.items.length : 0,
        trackingHistory
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      signedIn: Boolean(req.session?.userId),
      error: 'Could not fetch tracking details.'
    });
  }
});

// Inject SEO defaults for all page renders.
app.use(async (req, res, next) => {
  try {
    const setting = await SeoSetting.findOne().lean();
    res.locals.seo = {
      siteTitle: setting?.siteTitle || 'ScoopCraft Pints',
      titleSeparator: setting?.titleSeparator || '|',
      metaDescription:
        setting?.metaDescription ||
        'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.',
      metaKeywords:
        setting?.metaKeywords || 'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: setting?.canonicalBaseUrl || '',
      robots: setting?.robots || 'index, follow',
      ogImage: setting?.ogImage || '/assets/blackseamer-honey-pint.jpg',
      twitterCard: setting?.twitterCard || 'summary_large_image'
    };

    const baseUrl = (res.locals.seo.canonicalBaseUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    res.locals.seo.currentUrl = `${baseUrl}${req.originalUrl || ''}`;
    res.locals.seo.ogImageUrl =
      res.locals.seo.ogImage && /^https?:\/\//i.test(res.locals.seo.ogImage)
        ? res.locals.seo.ogImage
        : `${baseUrl}${res.locals.seo.ogImage || '/assets/blackseamer-honey-pint.jpg'}`;
  } catch (error) {
    res.locals.seo = {
      siteTitle: 'ScoopCraft Pints',
      titleSeparator: '|',
      metaDescription: 'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.',
      metaKeywords: 'custom ice cream pints, flavour builder, artisan dessert, pint subscription',
      canonicalBaseUrl: '',
      robots: 'index, follow',
      ogImage: '/assets/blackseamer-honey-pint.jpg',
      twitterCard: 'summary_large_image'
    };

    const fallbackBaseUrl = `${req.protocol}://${req.get('host')}`;
    res.locals.seo.currentUrl = `${fallbackBaseUrl}${req.originalUrl || ''}`;
    res.locals.seo.ogImageUrl = `${fallbackBaseUrl}/assets/blackseamer-honey-pint.jpg`;
  }
  next();
});

// Routes
const mainRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const wishlistRoutes = require('./routes/wishlist');

app.use('/', mainRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/wishlist', wishlistRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found | ScoopCraft',
  });
});

async function startServer() {
  try {
    await connectToMongoWithRetry();
    app.listen(PORT, () => {
      console.log(`ScoopCraft Pints running at http://localhost:${PORT}`);
    });
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`Fatal startup error. Could not connect to MongoDB: ${message}`);
    process.exit(1);
  }
}

startServer();


