const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

function wantsJson(req) {
  const accept = req.headers.accept || '';
  return req.xhr || accept.includes('application/json');
}

async function buildCartSummary(cartInput) {
  const cart = Array.isArray(cartInput) ? cartInput : [];
  const cartItems = [];
  let subtotal = 0;

  for (let i = 0; i < cart.length; i += 1) {
    const item = cart[i];
    const product = await Product.findById(item.productId);
    if (product) {
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      cartItems.push({
        product,
        quantity: item.quantity,
        itemTotal,
        itemIndex: i,
        selectedFlavours: item.selectedFlavours || [],
        scoopCount: Number(item.scoopCount) || 0
      });
    }
  }

  const tax = subtotal * 0.08;
  const shipping = subtotal > 0 ? 5.99 : 0;
  const total = subtotal + tax + shipping;
  const cartCount = cart.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  return { cartItems, subtotal, tax, shipping, total, cartCount };
}

router.get('/', async (req, res) => {
  try {
    const summary = await buildCartSummary(req.session.cart || []);

    res.render('cart', {
      title: 'Your Cart | ScoopCraft',
      cartItems: summary.cartItems,
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total
    });
  } catch (error) {
    console.error('Error loading cart:', error);
    res.status(500).render('404', {
      title: 'Error | ScoopCraft'
    });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await buildCartSummary(req.session.cart || []);
    res.json({
      success: true,
      cartCount: summary.cartCount,
      subtotal: summary.subtotal,
      tax: summary.tax,
      shipping: summary.shipping,
      total: summary.total,
      items: summary.cartItems.map((item) => ({
        id: String(item.product._id),
        name: item.product.name,
        image: item.product.image,
        price: Number(item.product.price || 0),
        quantity: Number(item.quantity || 0),
        itemTotal: Number(item.itemTotal || 0),
        selectedFlavours: item.selectedFlavours || [],
        scoopCount: Number(item.scoopCount) || 0
      }))
    });
  } catch (error) {
    console.error('Error loading cart summary:', error);
    res.status(500).json({ success: false, error: 'Failed to load cart summary' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1, scoopCount = 0 } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (Number(product.stock) <= 0) {
      return res.status(409).json({ error: 'Product is out of stock' });
    }

    const cart = req.session.cart || [];
    const selectedFlavoursRaw = req.body.selectedFlavours;
    const selectedFlavours = Array.isArray(selectedFlavoursRaw)
      ? selectedFlavoursRaw.map((item) => String(item).trim()).filter(Boolean)
      : String(selectedFlavoursRaw || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

    const normalizedScoopCount = Number(scoopCount) || selectedFlavours.length || 0;
    const cartItemKey = JSON.stringify({
      productId,
      selectedFlavours: [...selectedFlavours].sort(),
      scoopCount: normalizedScoopCount
    });

    const existingItemIndex = cart.findIndex((item) => {
      const itemKey = JSON.stringify({
        productId: item.productId.toString(),
        selectedFlavours: [...(item.selectedFlavours || [])].sort(),
        scoopCount: Number(item.scoopCount) || 0
      });
      return itemKey === cartItemKey;
    });

    const requestedQty = parseInt(quantity, 10) || 0;
    const existingQty = existingItemIndex > -1 ? Number(cart[existingItemIndex].quantity) || 0 : 0;
    const desiredQty = existingQty + requestedQty;

    if (desiredQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    if (desiredQty > Number(product.stock)) {
      return res.status(409).json({
        error: 'Requested quantity exceeds available stock',
        availableStock: Number(product.stock)
      });
    }

    if (existingItemIndex > -1) {
      cart[existingItemIndex].quantity = desiredQty;
    } else {
      cart.push({
        productId,
        quantity: desiredQty,
        selectedFlavours,
        scoopCount: normalizedScoopCount
      });
    }

    req.session.cart = cart;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    res.json({ success: true, cartCount });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

router.post('/update', async (req, res) => {
  try {
    const { productId, quantity, itemIndex } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    const cart = req.session.cart || [];
    const resolvedIndex = Number.isInteger(Number(itemIndex))
      ? Number(itemIndex)
      : cart.findIndex(item => item.productId.toString() === String(productId));

    if (resolvedIndex > -1 && resolvedIndex < cart.length) {
      const normalizedQty = parseInt(quantity, 10);
      if (normalizedQty <= 0) {
        cart.splice(resolvedIndex, 1);
      } else {
        const product = await Product.findById(cart[resolvedIndex].productId);
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        if (normalizedQty > Number(product.stock)) {
          return res.status(409).json({
            error: 'Requested quantity exceeds available stock',
            availableStock: Number(product.stock)
          });
        }

        cart[resolvedIndex].quantity = normalizedQty;
      }
    }

    req.session.cart = cart;
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (wantsJson(req)) {
      return res.json({ success: true, cartCount });
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error updating cart:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: 'Failed to update cart' });
    }
    res.status(500).redirect('/cart');
  }
});

router.post('/remove', (req, res) => {
  try {
    const { productId, itemIndex } = req.body;

    const cart = req.session.cart || [];
    const resolvedIndex = Number.isInteger(Number(itemIndex))
      ? Number(itemIndex)
      : cart.findIndex(item => item.productId.toString() === String(productId));

    if (resolvedIndex > -1 && resolvedIndex < cart.length) {
      cart.splice(resolvedIndex, 1);
    }

    req.session.cart = cart;
    const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (wantsJson(req)) {
      return res.json({ success: true, cartCount });
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error removing from cart:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ error: 'Failed to remove item from cart' });
    }
    res.status(500).redirect('/cart');
  }
});

router.post('/clear', (req, res) => {
  req.session.cart = [];
  if (wantsJson(req)) {
    return res.json({ success: true, cartCount: 0 });
  }
  res.redirect('/cart');
});

module.exports = router;