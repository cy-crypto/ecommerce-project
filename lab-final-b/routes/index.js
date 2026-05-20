const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const blogPosts = [
  {
    slug: 'custom-ice-cream-pints',
    title: 'How to Build the Perfect Custom Pint',
    excerpt: 'Learn how to balance creamy, crunchy, and fruity layers while picking 3-flavour and 4-flavour blends.',
    category: 'Custom Pints',
    date: 'May 2026',
    readTime: '4 min read',
    image: '/assets/main-section-imge.jpg',
    author: 'ScoopCraft Team',
    coverAlt: 'Custom ice cream pint with layered flavours',
    sections: [
      {
        heading: 'Start with a hero base',
        paragraphs: [
          'Choose one flavour that defines the pint and build everything else around it. A base like vanilla bean, pistachio, or salted maple provides a consistent creamy backbone that keeps the overall profile smooth.',
          'We recommend selecting a base that pairs well with both fruit and chocolate so your supporting layers can add contrast without overpowering the finish.'
        ],
        bullets: [
          'Pick a base that matches the mood (bright, rich, or nutty).',
          'Avoid pairing two heavy bases in one pint.',
          'Match the base with one fresh layer and one texture layer.'
        ]
      },
      {
        heading: 'Balance texture with every scoop',
        paragraphs: [
          'The best pints feel consistent from the first bite to the last. Add one layer that is light and airy, then follow with a second layer that is dense or crunchy to keep the experience exciting.',
          'If you are selecting a 4-flavour pint, repeat the texture cycle so the last spoonful feels just as vibrant as the first.'
        ]
      },
      {
        heading: 'Plan the flavour order',
        paragraphs: [
          'Think of your order as a journey. Start with a bright or fruity note, move into something rich, and finish with a smooth base so the aftertaste is clean and memorable.',
          'For subscription customers, rotate the order each week to keep the profile familiar but still fresh.'
        ]
      }
    ],
    takeaways: [
      'Use one hero base to anchor the pint.',
      'Mix creamy, fruity, and crunchy notes in every order.',
      'Plan the flavour order for a memorable finish.'
    ]
  },
  {
    slug: 'delivery-cold-chain',
    title: 'Cold-Chain Delivery: Keeping Pints Perfect',
    excerpt: 'See how insulated packaging, flash freezing, and tight delivery windows protect every order.',
    category: 'Delivery',
    date: 'May 2026',
    readTime: '3 min read',
    image: '/assets/chocolate-homepage.webp',
    author: 'Logistics Team',
    coverAlt: 'Insulated ice cream delivery package',
    sections: [
      {
        heading: 'Flash-freeze for stability',
        paragraphs: [
          'Every pint is flash-frozen the moment the final layer is set. This locks in texture and keeps mix-ins suspended evenly throughout the pint.',
          'Rapid freezing keeps ice crystals small, which means a creamier finish when the pint arrives.'
        ]
      },
      {
        heading: 'Insulated packaging with a plan',
        paragraphs: [
          'We use insulated liners and cold packs designed for two-day protection. That gives us a buffer so every shipment stays in the safe range even if there are minor carrier delays.',
          'Packages are tested in high and low temperature scenarios before each seasonal rollout.'
        ],
        bullets: [
          'Cold packs are packed at the last moment before pickup.',
          'Packaging is sized to reduce excess air and movement.',
          'Labels signal that the package should not be left in heat.'
        ]
      },
      {
        heading: 'What customers can do',
        paragraphs: [
          'Plan to bring your package indoors within two hours. If you cannot, move the pints to a freezer as soon as possible and let them temper for 5-7 minutes before serving.',
          'For subscription deliveries, set a reminder so the order is never left outside overnight.'
        ]
      }
    ],
    takeaways: [
      'Flash-freezing preserves creamy texture.',
      'Insulated liners keep deliveries safe for up to 48 hours.',
      'Bring pints indoors quickly for the best experience.'
    ]
  },
  {
    slug: 'subscription-perks',
    title: 'Why Subscribers Never Run Out of Dessert',
    excerpt: 'Weekly subscriptions lock in savings, priority restocks, and rotating seasonal flavour drops.',
    category: 'Subscriptions',
    date: 'May 2026',
    readTime: '5 min read',
    image: '/assets/pista-homepage.jpg',
    author: 'ScoopCraft Team',
    coverAlt: 'Weekly subscription pints arranged on a table',
    sections: [
      {
        heading: 'Predictable drops, less stress',
        paragraphs: [
          'Subscribers get their pints on a dependable cadence, so there is always something ready for movie nights, celebrations, and hosting friends.',
          'We align production cycles with subscription windows to keep quality consistent across every drop.'
        ]
      },
      {
        heading: 'Savings and priority restocks',
        paragraphs: [
          'Weekly plans include built-in savings and priority access to limited seasonal flavours. That means you can keep a steady rotation without missing your favorites.',
          'Subscribers are alerted first when new seasonal menus go live.'
        ],
        bullets: [
          'Savings are applied automatically every week.',
          'Priority access to limited flavour drops.',
          'Flexible updates for delivery windows and flavour choices.'
        ]
      },
      {
        heading: 'How to personalize your plan',
        paragraphs: [
          'Use your order history to remix your top picks and test new blends. If you loved a custom combination, save it and rotate in a new hero flavour once per month.',
          'Your account dashboard tracks every order so your next edit takes seconds.'
        ]
      }
    ],
    takeaways: [
      'Subscribers get consistent weekly drops.',
      'Priority restocks keep favorites available.',
      'Plan edits take minutes inside your account.'
    ]
  }
];

function extractFlavourHighlights(products) {
  const seen = new Set();
  const highlights = [];

  for (const product of products) {
    for (const flavour of product.flavourOptions || []) {
      const key = String(flavour.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      highlights.push({
        name: flavour.name,
        note: flavour.note || 'Signature scoop profile',
        color: flavour.color || '#ffe5c2',
        detail: `${flavour.name} is crafted as a premium layer with ${flavour.note || 'a balanced creamy profile'}. It pairs well in both one-time and subscription pint builds.`
      });

      if (highlights.length >= 10) {
        return highlights;
      }
    }
  }

  return highlights;
}

async function buildCartSummary(sessionCart) {
  const cart = Array.isArray(sessionCart) ? sessionCart : [];
  const cartItems = [];
  let subtotal = 0;

  for (const item of cart) {
    const product = await Product.findById(item.productId).lean();
    if (!product || !product.isActive) {
      continue;
    }

    const quantity = Number(item.quantity) || 1;
    const itemTotal = product.price * quantity;
    subtotal += itemTotal;
    cartItems.push({
      product,
      quantity,
      itemTotal,
      selectedFlavours: Array.isArray(item.selectedFlavours) ? item.selectedFlavours : [],
      scoopCount: Number(item.scoopCount) || 0
    });
  }

  const tax = subtotal * 0.08;
  const shipping = subtotal > 0 ? 5.99 : 0;
  return {
    cartItems,
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping
  };
}

router.get('/', async (req, res) => {
  try {
    const featuredProducts = await Product.find({ isActive: true }).sort({ createdAt: -1 }).limit(8).lean();
    const highlights = extractFlavourHighlights(featuredProducts);
    const signatureStack = highlights.slice(0, 3).map((item) => item.name).join(' + ');

    res.render('home', {
      title: 'ScoopCraft Pints | Custom Ice Cream Shop',
      flavours: highlights,
      featuredProducts,
      totalFlavours: highlights.length,
      totalProducts: featuredProducts.length,
      signatureStack,
      blogPosts
    });
  } catch (error) {
    console.error('Error loading home:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const query = { isActive: true };

    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { 'flavourOptions.name': new RegExp(q, 'i') }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();

    res.render('products', {
      title: 'Browse Custom Pints | ScoopCraft',
      products,
      q
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product || !product.isActive) {
      return res.status(404).render('404', {
        title: 'Product Not Found | ScoopCraft'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      category: product.category
    })
      .limit(4)
      .lean();

    let isWishlisted = false;
    if (req.session.userId) {
      const user = await User.findById(req.session.userId).select('wishlist').lean();
      isWishlisted = (user?.wishlist || []).some(
        item => item.product && item.product.toString() === String(product._id)
      );
    }

    if (product.seoTitle || product.seoDescription || product.seoKeywords || product.metaRobots || product.canonicalUrl) {
      res.locals.seo = {
        ...res.locals.seo,
        metaDescription: product.seoDescription || res.locals.seo.metaDescription,
        metaKeywords: product.seoKeywords || res.locals.seo.metaKeywords,
        robots: product.metaRobots || res.locals.seo.robots,
        currentUrl: product.canonicalUrl || res.locals.seo.currentUrl
      };
    }

    res.render('product-detail', {
      title: product.seoTitle || `${product.name} | ScoopCraft`,
      product,
      relatedProducts,
      isWishlisted
    });
  } catch (error) {
    console.error('Error loading product detail:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/checkout', requireAuth, async (req, res) => {
  try {
    const summary = await buildCartSummary(req.session.cart);
    if (!summary.cartItems.length) {
      return res.redirect('/cart');
    }

    const user = await User.findById(req.session.userId).lean();
    res.render('checkout', {
      title: 'Checkout | ScoopCraft',
      cartItems: summary.cartItems,
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total,
      profile: {
        name: user?.name || req.session.currentUser?.name || '',
        email: user?.email || req.session.currentUser?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
      }
    });
  } catch (error) {
    console.error('Error loading checkout:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/my-orders', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 }).lean();
    res.render('my-orders', {
      title: 'My Orders | ScoopCraft',
      orders,
      email: req.session.currentUser?.email || ''
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/track-order', requireAuth, async (req, res) => {
  try {
    const queryOrderId = String(req.query.orderId || '').trim();
    let trackedOrder = null;
    let trackError = '';

    if (queryOrderId) {
      trackedOrder = await Order.findOne({
        _id: queryOrderId,
        user: req.session.userId
      }).lean();

      if (!trackedOrder) {
        trackError = 'No order found for this ID in your account.';
      }
    }

    const recentOrders = await Order.find({ user: req.session.userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.render('track-order', {
      title: 'Track Order | ScoopCraft',
      trackedOrder,
      queryOrderId,
      trackError,
      recentOrders
    });
  } catch (error) {
    console.error('Error loading track order page:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About Us | ScoopCraft'
  });
});

router.get('/blog', (req, res) => {
  res.render('blog', {
    title: 'ScoopCraft Journal | Custom Ice Cream Insights',
    posts: blogPosts
  });
});

router.get('/blog/:slug', (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return res.status(404).render('404', {
      title: 'Blog Post Not Found | ScoopCraft'
    });
  }

  const relatedPosts = blogPosts.filter((item) => item.slug !== slug).slice(0, 2);

  return res.render('blog-detail', {
    title: `${post.title} | ScoopCraft`,
    post,
    relatedPosts
  });
});

router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Us | ScoopCraft'
  });
});

module.exports = router;


