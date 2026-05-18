const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const SeoSetting = require('../models/SeoSetting');
const { requireAdmin } = require('../middleware/auth');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function parseFlavourOptions(rawInput) {
  const lines = String(rawInput || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const [name, note, color] = line.split('|').map((part) => String(part || '').trim());
      if (!name) {
        return null;
      }
      return {
        name,
        note: note || '',
        color: color || '#ffe5c2'
      };
    })
    .filter(Boolean);
}

async function ensureDefaultAdmin() {
  const existingAdmin = await User.findOne({ role: 'Admin' });
  if (existingAdmin) {
    return;
  }

  await User.create({
    name: 'Store Admin',
    email: 'admin@scoopcraftpints.com',
    passwordHash: User.hashPassword('admin123'),
    role: 'Admin',
    status: 'Active'
  });
}

function getNextStatus(currentStatus) {
  const statusMap = {
    Placed: 'Processing',
    Processing: 'Delivered',
    Delivered: null
  };
  return statusMap[currentStatus] || null;
}

function getStoreImages() {
  try {
    const assetsDir = path.join(__dirname, '..', 'public', 'assets');
    const files = fs.readdirSync(assetsDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))
      .map((name) => `/assets/${name}`)
      .sort();
  } catch (error) {
    return [];
  }
}

function resolveProductImage(body) {
  const manualUrl = (body.image || '').trim();
  const storeUrl = (body.imageFromStore || '').trim();
  return manualUrl || storeUrl;
}

router.get('/signin', async (req, res) => {
  try {
    if (req.session.userId && (req.session.userRole === 'Admin' || req.session.userRole === 'Manager')) {
      return res.redirect('/admin');
    }

    await ensureDefaultAdmin();

    res.render('admin/signin', {
      title: 'Admin Sign In | ScoopCraft',
      error: ''
    });
  } catch (error) {
    console.error('Error loading admin sign in page:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load sign in page'
    });
  }
});

router.post('/signin', async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').trim().toLowerCase() });

    const validRole = user && (user.role === 'Admin' || user.role === 'Manager');
    const validPassword = user && User.verifyPassword(password || '', user.passwordHash);

    if (!validRole || !validPassword) {
      return res.status(401).render('admin/signin', {
        title: 'Admin Sign In | ScoopCraft',
        error: 'Invalid admin credentials.'
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).render('admin/signin', {
        title: 'Admin Sign In | ScoopCraft',
        error: 'Your admin account is inactive.'
      });
    }

    req.session.userId = user._id.toString();
    req.session.userRole = user.role;
    req.session.currentUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.redirect('/admin');
  } catch (error) {
    console.error('Error signing in admin:', error);
    res.status(500).render('admin/signin', {
      title: 'Admin Sign In | ScoopCraft',
      error: 'Failed to sign in. Please try again.'
    });
  }
});

router.post('/signout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/signin');
  });
});

router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalUsers, products] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),
      Product.find().limit(5).sort({ createdAt: -1 })
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard | ScoopCraft',
      totalProducts,
      totalOrders,
      totalUsers,
      recentProducts: products
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load dashboard'
    });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products', {
      title: 'Manage Products | Admin',
      products
    });
  } catch (error) {
    console.error('Error loading products:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load products'
    });
  }
});

router.get('/products/add', async (req, res) => {
  try {
    res.render('admin/product-form', {
      title: 'Add New Product | Admin',
      product: null,
      storeImages: getStoreImages(),
      formAction: '/admin/products',
      formMethod: 'POST',
      submitText: 'Add Product',
      editMode: false
    });
  } catch (error) {
    console.error('Error loading product form:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load product form'
    });
  }
});

router.post('/products', async (req, res) => {
  try {
    const {
      name, price, image, description,
      shortDescription, stock, isActive, flavourOptions,
      seoTitle, seoDescription, seoKeywords, metaRobots, canonicalUrl
    } = req.body;

    const product = new Product({
      name,
      price: parseFloat(price),
      rarity: 'Signature',
      category: '',
      image: resolveProductImage(req.body),
      description,
      shortDescription: (shortDescription || '').trim(),
      stock: Number(stock) || 0,
      isActive: isActive === 'on',
      flavourOptions: parseFlavourOptions(flavourOptions),
      seoTitle: (seoTitle || '').trim(),
      seoDescription: (seoDescription || '').trim(),
      seoKeywords: (seoKeywords || '').trim(),
      metaRobots: (metaRobots || '').trim() || 'index, follow',
      canonicalUrl: (canonicalUrl || '').trim()
    });

    await product.save();
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to create product'
    });
  }
});

router.post('/products/seo-generate', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(503).json({ success: false, error: 'AI service is not configured.' });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const shortDescription = String(req.body?.shortDescription || '').trim();
    const price = String(req.body?.price || '').trim();
    const rarity = String(req.body?.rarity || 'Signature').trim();
    const category = String(req.body?.category || 'Ice Cream').trim();
    const flavourOptions = Array.isArray(req.body?.flavourOptions)
      ? req.body.flavourOptions.map((item) => String(item || '').trim()).filter(Boolean)
      : String(req.body?.flavourOptions || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    if (!name || !description) {
      return res.status(400).json({ success: false, error: 'Name and description are required.' });
    }

    const prompt = [
      'Generate SEO metadata in STRICT JSON format.',
      '',
      'Return ONLY valid JSON.',
      'Do not add markdown.',
      'Do not add explanations.',
      'Do not add text before or after JSON.',
      '',
      'Required structure:',
      '{',
      '  "title": "",',
      '  "metaDescription": "",',
      '  "keywords": []',
      '}',
      '',
      'User Input:',
      `Name: ${name}`,
      `Description: ${description}`,
      shortDescription ? `Short description: ${shortDescription}` : '',
      price ? `Price: ${price}` : '',
      rarity ? `Rarity: ${rarity}` : '',
      category ? `Category: ${category}` : '',
      flavourOptions.length ? `Flavours: ${flavourOptions.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    async function requestSeoJson() {
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 300,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return { ok: false, errorText };
      }

      const payload = await geminiResponse.json();
      const parts = payload?.candidates?.[0]?.content?.parts;
      const raw = Array.isArray(parts) ? parts.map((part) => String(part?.text || '')).join('\n').trim() : '';
      return { ok: true, raw };
    }

    const response = await requestSeoJson();
    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: 'AI request failed.',
        details: response.errorText.slice(0, 300)
      });
    }

    const rawText = response.raw;
    let seo = null;
    try {
      seo = JSON.parse(rawText);
    } catch (err) {
      console.error('AI SEO raw response:', rawText.slice(0, 500));
      return res.status(422).json({ success: false, error: 'AI response was not valid JSON.' });
    }

    const keywords = Array.isArray(seo?.keywords)
      ? seo.keywords.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    return res.json({
      success: true,
      seo: {
        seoTitle: String(seo?.title || '').trim(),
        seoDescription: String(seo?.metaDescription || '').trim(),
        seoKeywords: keywords.join(', '),
        metaRobots: 'index, follow',
        canonicalUrl: ''
      }
    });
  } catch (error) {
    console.error('Error generating product SEO:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate SEO data.' });
  }
});

router.get('/products/:id/edit', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }

    res.render('admin/product-form', {
      title: 'Edit Product | Admin',
      product,
      storeImages: getStoreImages(),
      formAction: `/admin/products/${product._id}`,
      formMethod: 'POST',
      submitText: 'Update Product',
      editMode: true
    });
  } catch (error) {
    console.error('Error loading product for edit:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load product'
    });
  }
});

router.post('/products/:id', async (req, res) => {
  try {
    const {
      name, price, image, description,
      shortDescription, stock, isActive, flavourOptions,
      seoTitle, seoDescription, seoKeywords, metaRobots, canonicalUrl
    } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price: parseFloat(price),
        rarity: 'Signature',
        category: '',
        image: resolveProductImage(req.body),
        description,
        shortDescription: (shortDescription || '').trim(),
        stock: Number(stock) || 0,
        isActive: isActive === 'on',
        flavourOptions: parseFlavourOptions(flavourOptions),
        seoTitle: (seoTitle || '').trim(),
        seoDescription: (seoDescription || '').trim(),
        seoKeywords: (seoKeywords || '').trim(),
        metaRobots: (metaRobots || '').trim() || 'index, follow',
        canonicalUrl: (canonicalUrl || '').trim()
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }

    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update product'
    });
  }
});

router.post('/products/:id/delete', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Product not found'
      });
    }
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to delete product'
    });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.render('admin/orders', {
      title: 'Manage Orders | Admin',
      orders
    });
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load orders'
    });
  }
});

router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'Order not found'
      });
    }

    const validStatuses = ['Placed', 'Processing', 'Delivered'];
    const statusOrder = { Placed: 0, Processing: 1, Delivered: 2 };

    if (!validStatuses.includes(status)) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status | Admin',
        message: 'Invalid order status'
      });
    }

    const currentStatusIndex = statusOrder[order.status];
    const newStatusIndex = statusOrder[status];

    if (newStatusIndex - currentStatusIndex > 1) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status Transition | Admin',
        message: `Cannot skip status. Current status is "${order.status}". You can only move to "${getNextStatus(order.status)}".`
      });
    }

    if (newStatusIndex < currentStatusIndex) {
      return res.status(400).render('admin/error', {
        title: 'Invalid Status Transition | Admin',
        message: `Cannot move order status backwards. Current status is "${order.status}".`
      });
    }

    order.status = status;
    if (!Array.isArray(order.trackingHistory)) {
      order.trackingHistory = [];
    }
    order.trackingHistory.push({
      status,
      note: `Status updated by admin to ${status}`,
      updatedAt: new Date()
    });

    await order.save();
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update order status'
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users', {
      title: 'Manage Users | Admin',
      users
    });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load users'
    });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).render('admin/error', {
        title: 'Error | Admin',
        message: 'Password is required and must be at least 6 characters.'
      });
    }

    await User.create({
      name: (name || '').trim(),
      email: (email || '').trim(),
      passwordHash: User.hashPassword(password),
      role,
      status
    });

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to create user. Make sure email is unique and valid.'
    });
  }
});

router.post('/users/:id', async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;

    const updates = {
      name: (name || '').trim(),
      email: (email || '').trim(),
      role,
      status
    };

    if ((password || '').trim()) {
      if (password.length < 6) {
        return res.status(400).render('admin/error', {
          title: 'Error | Admin',
          message: 'New password must be at least 6 characters.'
        });
      }
      updates.passwordHash = User.hashPassword(password);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'User not found'
      });
    }

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to update user. Make sure email is unique and valid.'
    });
  }
});

router.post('/users/:id/delete', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).render('admin/error', {
        title: 'Not Found | Admin',
        message: 'User not found'
      });
    }

    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to delete user'
    });
  }
});

router.get('/seo', async (req, res) => {
  try {
    let settings = await SeoSetting.findOne();
    if (!settings) {
      settings = await SeoSetting.create({});
    }

    res.render('admin/seo', {
      title: 'SEO Settings | Admin',
      settings
    });
  } catch (error) {
    console.error('Error loading SEO settings:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to load SEO settings'
    });
  }
});

router.post('/seo', async (req, res) => {
  try {
    const {
      siteTitle,
      titleSeparator,
      metaDescription,
      metaKeywords,
      canonicalBaseUrl,
      robots,
      ogImage,
      twitterCard
    } = req.body;

    let settings = await SeoSetting.findOne();
    if (!settings) {
      settings = new SeoSetting();
    }

    settings.siteTitle = (siteTitle || '').trim() || 'ScoopCraft Pints';
    settings.titleSeparator = (titleSeparator || '').trim() || '|';
    settings.metaDescription =
      (metaDescription || '').trim() ||
      'Build custom 3-flavour and 4-flavour artisan ice cream pints with one-time or subscription delivery.';
    settings.metaKeywords =
      (metaKeywords || '').trim() ||
      'custom ice cream pints, flavour builder, artisan dessert, pint subscription';
    settings.canonicalBaseUrl = (canonicalBaseUrl || '').trim();
    settings.robots = (robots || '').trim() || 'index, follow';
    settings.ogImage = (ogImage || '').trim() || '/assets/blackseamer-honey-pint.jpg';
    settings.twitterCard = (twitterCard || '').trim() || 'summary_large_image';

    await settings.save();
    res.redirect('/admin/seo');
  } catch (error) {
    console.error('Error saving SEO settings:', error);
    res.status(500).render('admin/error', {
      title: 'Error | Admin',
      message: 'Failed to save SEO settings'
    });
  }
});

module.exports = router;

