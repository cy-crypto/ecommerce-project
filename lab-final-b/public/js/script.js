(function () {
  'use strict';

  if (typeof document === 'undefined') {
    return;
  }

  let openCartDrawer = function () {};

  function setupFlavourLimiter(formId, tierName, flavourName, statusId, helpId, submitButtonId) {
    const form = document.getElementById(formId);
    if (!form) {
      return;
    }

    const tierInputs = Array.from(form.querySelectorAll(`input[name="${tierName}"]`));
    const flavourInputs = Array.from(form.querySelectorAll(`input[name="${flavourName}"]`));
    const status = document.getElementById(statusId);
    const help = document.getElementById(helpId);
    const submitButton = submitButtonId ? document.getElementById(submitButtonId) : null;
    const previewContainer = form.querySelector('[data-flavour-preview]');
    const productImage = form.getAttribute('data-product-image') || '/assets/main-section-imge.jpg';

    function getTier() {
      const selectedTier = tierInputs.find((input) => input.checked);
      return selectedTier ? Number(selectedTier.value) : 3;
    }

    function getSelectedFlavours() {
      return flavourInputs.filter((input) => input.checked);
    }

    function renderSelectedFlavourPreview(selectedInputs, tier) {
      if (!previewContainer) {
        return;
      }

      previewContainer.innerHTML = '';

      selectedInputs.forEach((input) => {
        const card = input.closest('.flavour-picker');
        const color = card ? card.style.getPropertyValue('--flavour-accent') : '#e6f2ff';

        const tile = document.createElement('div');
        tile.className = 'selected-flavour-tile';

        const media = document.createElement('div');
        media.className = 'selected-flavour-tile__media';
        media.style.backgroundImage = `url("${resolveFlavourImage(input.value, productImage)}")`;

        const tint = document.createElement('span');
        tint.className = 'selected-flavour-tile__tint';
        tint.style.background = color || '#e6f2ff';
        media.appendChild(tint);

        const label = document.createElement('strong');
        label.textContent = input.value;

        tile.appendChild(media);
        tile.appendChild(label);
        previewContainer.appendChild(tile);
      });

      const remaining = Math.max(0, tier - selectedInputs.length);
      for (let idx = 0; idx < remaining; idx += 1) {
        const slot = document.createElement('div');
        slot.className = 'selected-flavour-placeholder';

        const plus = document.createElement('span');
        plus.textContent = '+';
        const text = document.createElement('strong');
        text.textContent = 'Choose flavour';

        slot.appendChild(plus);
        slot.appendChild(text);
        previewContainer.appendChild(slot);
      }
    }

    function updateBuilderState() {
      const tier = getTier();
      const selected = getSelectedFlavours();

      if (selected.length > tier) {
        const lastChecked = selected[selected.length - 1];
        if (lastChecked) {
          lastChecked.checked = false;
        }
      }

      const activeSelected = getSelectedFlavours();
      flavourInputs.forEach((input) => {
        const card = input.closest('.flavour-picker');
        if (card) {
          card.classList.toggle('active', input.checked);
        }

        input.disabled = !input.checked && activeSelected.length >= tier;
      });

      if (status) {
        status.textContent = `${activeSelected.length} of ${tier} selected`;
      }

      if (help) {
        help.textContent = `Pick exactly ${tier} flavours.`;
      }

      if (submitButton) {
        submitButton.disabled = activeSelected.length !== tier;
      }

      renderSelectedFlavourPreview(activeSelected, tier);
    }

    tierInputs.forEach((input) => {
      input.addEventListener('change', updateBuilderState);
    });

    flavourInputs.forEach((input) => {
      input.addEventListener('change', updateBuilderState);
    });

    form.addEventListener('submit', function (event) {
      const tier = getTier();
      const selectedCount = getSelectedFlavours().length;
      if (selectedCount !== tier) {
        event.preventDefault();
      }
    });

    updateBuilderState();
  }

  function setupCustomAddToCartForm() {
    const form = document.getElementById('customAddToCartForm');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const productId = form.getAttribute('data-product-id');
      const quantity = 1;
      const scoopInput = form.querySelector('input[name="scoopCount"]:checked');
      const scoopCount = scoopInput ? Number(scoopInput.value) : 0;
      const selectedFlavours = Array.from(form.querySelectorAll('input[name="selectedFlavours"]:checked')).map((input) => input.value);
      addToCart(productId, quantity, selectedFlavours, scoopCount);
    });
  }

  function setCartBadgeCount(count) {
    const badge = document.getElementById('cartCountBadge');
    if (!badge) {
      return;
    }

    const safeCount = Math.max(0, Number(count) || 0);
    badge.textContent = String(safeCount);
    badge.classList.toggle('is-empty', safeCount <= 0);
  }

  function resolveFlavourImage(flavourName, fallbackImage) {
    const name = String(flavourName || '').toLowerCase();
    const flavourImageMap = [
      { tokens: ['pistachio', 'pista', 'pistichio'], image: '/assets/Pistichio.jpg' },
      { tokens: ['vanilla'], image: '/assets/Vanilla.jpg' },
      { tokens: ['strawberry', 'straw'], image: '/assets/Strawberry Match.jpg' },
      { tokens: ['mango'], image: '/assets/Mango.jpg' },
      { tokens: ['chocolate', 'cocoa'], image: '/assets/Cherry CHocolate.jpg' },
      { tokens: ['mocha', 'coffee'], image: '/assets/Mocha.jpg' },
      { tokens: ['caramel', 'caremel'], image: '/assets/Caremel Coffee.jpg' },
      { tokens: ['hazelnut', 'hazel'], image: '/assets/Hazel Nut.jpg' },
      { tokens: ['rose'], image: '/assets/Rose.jpg' },
      { tokens: ['banana'], image: '/assets/Banana Pie.jpg' },
      { tokens: ['lemon'], image: '/assets/Lemon Basil.jpg' },
      { tokens: ['blueberry', 'blueberr', 'berry'], image: '/assets/Blueberrry.jpg' },
      { tokens: ['cookie'], image: '/assets/Cookie.jpg' },
      { tokens: ['yogurt', 'yoghurt', 'yougurt'], image: '/assets/Yougurt.jpg' },
      { tokens: ['salted', 'maple'], image: '/assets/Salted Maple.jpg' },
      { tokens: ['midnight'], image: '/assets/Midnight.jpg' }
    ];

    const match = flavourImageMap.find((row) => row.tokens.some((token) => name.includes(token)));
    return match ? match.image : (fallbackImage || '/assets/main-section-imge.jpg');
  }

  function addToCart(productId, quantity, selectedFlavours, scoopCount) {
    const btn = document.getElementById('addToCartBtn');
    const messageDiv = document.getElementById('cartMessage');

    if (!productId) {
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Adding...';
    }

    fetch('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        quantity: quantity || 1,
        selectedFlavours: Array.isArray(selectedFlavours) ? selectedFlavours : [],
        scoopCount: scoopCount || 0
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.className = 'cart-msg-success';
          messageDiv.textContent = data && data.success ? '✅ Added to cart successfully!' : '❌ Could not add item.';
        }

        if (data && data.success) {
          setCartBadgeCount(data.cartCount);
          openCartDrawer();
        }
      })
      .catch(() => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.className = 'cart-msg-error';
          messageDiv.textContent = '❌ Could not add item.';
        }
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Add To Cart';
        }
      });
  }

  function setWishlistButtonState(btn, isWishlisted) {
    if (!btn) {
      return;
    }

    btn.dataset.wishlisted = isWishlisted ? 'true' : 'false';
    btn.classList.toggle('active', isWishlisted);
    btn.textContent = isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
  }

  function addToWishlistCard(productId, trigger) {
    if (!productId || !trigger) {
      return;
    }

    trigger.disabled = true;
    trigger.textContent = 'Saving...';

    fetch(`/wishlist/add/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => {
        if (res.status === 401 || res.redirected) {
          window.location.href = '/auth/signin';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !data.success) {
          trigger.textContent = 'Try Again';
          return;
        }

        trigger.classList.add('active');
        trigger.textContent = '💜 Wishlisted';
      })
      .catch(() => {
        trigger.textContent = 'Try Again';
      })
      .finally(() => {
        trigger.disabled = false;
      });
  }

  function setupWishlistCardForms() {
    const forms = Array.from(document.querySelectorAll('.wishlist-card-form'));
    forms.forEach((form) => {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const button = form.querySelector('.wishlist-card-btn');
        const productId = form.getAttribute('data-product-id');
        addToWishlistCard(productId, button);
      });
    });
  }

  function setupWishlistToggleForm() {
    const form = document.querySelector('.wishlist-toggle-form');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const productId = form.getAttribute('data-product-id');
      toggleWishlist(productId);
    });
  }

  /* ── Info Popup / Tooltip System ── */
  function setupInfoPopup() {
    const triggers = Array.from(document.querySelectorAll('.info-trigger'));

    if (!triggers.length) {
      return;
    }

    let currentTooltip = null;

    function createTooltip(title, body) {
      const tooltip = document.createElement('div');
      tooltip.className = 'info-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.setAttribute('aria-hidden', 'false');
      
      const titleElem = document.createElement('div');
      titleElem.className = 'info-tooltip-title';
      titleElem.textContent = title || 'Details';
      
      const bodyElem = document.createElement('div');
      bodyElem.className = 'info-tooltip-body';
      bodyElem.textContent = body || 'No additional details available.';
      
      tooltip.appendChild(titleElem);
      tooltip.appendChild(bodyElem);
      
      return tooltip;
    }

    function closeTooltip() {
      if (currentTooltip && currentTooltip.parentNode) {
        currentTooltip.parentNode.removeChild(currentTooltip);
        currentTooltip = null;
      }
    }

    function showTooltip(trigger, title, body) {
      closeTooltip();
      
      const tooltip = createTooltip(title, body);
      document.body.appendChild(tooltip);
      currentTooltip = tooltip;
      
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      let top = triggerRect.top - tooltipRect.height - 10;

      if (top < 8) {
        top = triggerRect.bottom + 10;
      }
      
      tooltip.style.position = 'fixed';
      tooltip.style.left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8)) + 'px';
      tooltip.style.top = Math.max(8, top) + 'px';
      tooltip.style.pointerEvents = 'none';
      
      requestAnimationFrame(() => tooltip.classList.add('visible'));
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener('mouseenter', function () {
        const title = trigger.getAttribute('data-info-title') || 'Details';
        const body = trigger.getAttribute('data-info-body') || 'No additional details available.';
        showTooltip(trigger, title, body);
      });

      trigger.addEventListener('mouseleave', function () {
        closeTooltip();
      });
    });

    document.addEventListener('click', closeTooltip);
  }

  /* ── Flavour Detail Modal ── */
  function setupFlavourDetailModal() {
    const modal = document.getElementById('flavourDetailModal');
    if (!modal) return;

    const titleEl = document.getElementById('flavourModalTitle');
    const bodyEl = document.getElementById('flavourModalBody');
    const accentEl = document.getElementById('flavourModalAccent');
    const closeBtns = Array.from(modal.querySelectorAll('[data-close-flavour-modal]'));
    const triggers = Array.from(document.querySelectorAll('.flavour-detail-trigger'));

    function openModal(title, body, color) {
      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.textContent = body;
      if (accentEl) accentEl.style.background = color || '#ffe5c2';
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    triggers.forEach(trigger => {
      trigger.addEventListener('click', function () {
        const title = trigger.getAttribute('data-info-title') || 'Flavour';
        const body = trigger.getAttribute('data-info-body') || 'A premium flavour crafted for the perfect ice cream experience.';
        const color = trigger.style.getPropertyValue('--flavour-accent') || '#ffe5c2';
        openModal(title, body, color);
      });
    });

    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }

  /* ── Scroll Animations (IntersectionObserver) ── */
  function setupScrollAnimations() {
    const animatedElements = Array.from(document.querySelectorAll('.sc-animate'));
    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          setTimeout(function () {
            el.classList.add('sc-visible');
          }, delay);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatedElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  function setupClickableCards() {
    const cards = Array.from(document.querySelectorAll('.product-card-clickable'));
    if (!cards.length) {
      return;
    }

    function isInteractiveElement(element) {
      if (!element) {
        return false;
      }

      const tag = String(element.tagName || '').toLowerCase();
      if (['a', 'button', 'input', 'select', 'textarea', 'label', 'form'].includes(tag)) {
        return true;
      }

      return !!element.closest('a, button, input, select, textarea, label, form');
    }

    cards.forEach((card) => {
      const href = card.getAttribute('data-href');
      if (!href) {
        return;
      }

      card.addEventListener('click', function (event) {
        if (isInteractiveElement(event.target)) {
          return;
        }
        window.location.href = href;
      });

      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          window.location.href = href;
        }
      });
    });
  }

  function setupHomepageFlavourSlider() {
    const root = document.getElementById('homeFlavourSlider');
    if (!root) {
      return;
    }

    const track = root.querySelector('.home-flavour-slider__track');
    const slides = Array.from(root.querySelectorAll('.home-flavour-slide'));
    const dotsWrap = root.querySelector('.home-flavour-slider__dots');
    const prevButton = root.querySelector('.home-flavour-slider__arrow--prev');
    const nextButton = root.querySelector('.home-flavour-slider__arrow--next');

    if (!track || !slides.length) {
      return;
    }

    let currentIndex = 0;
    let autoTimer = null;
    let dots = [];

    function getVisibleSlides() {
      if (window.innerWidth <= 700) {
        return 1;
      }
      if (window.innerWidth <= 960) {
        return 2;
      }
      return 4;
    }

    function getMaxIndex() {
      return Math.max(0, slides.length - getVisibleSlides());
    }

    function buildDots() {
      if (!dotsWrap) {
        return;
      }

      const count = getMaxIndex() + 1;
      dotsWrap.innerHTML = '';
      dots = [];

      for (let idx = 0; idx < count; idx += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'home-flavour-slider__dot';
        dot.setAttribute('data-dot', String(idx));
        dot.setAttribute('aria-label', `Go to slide ${idx + 1}`);
        dot.addEventListener('click', function () {
          render(idx);
          startAuto();
        });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }

      dotsWrap.style.display = dots.length > 1 ? 'flex' : 'none';
    }

    function render(index) {
      const visibleSlides = getVisibleSlides();
      const maxIndex = getMaxIndex();
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      root.style.setProperty('--visible-slides', String(visibleSlides));
      track.style.transform = `translateX(-${(currentIndex * 100) / visibleSlides}%)`;

      slides.forEach((slide, idx) => {
        slide.classList.toggle('is-active', idx >= currentIndex && idx < currentIndex + visibleSlides);
      });

      dots.forEach((dot, idx) => {
        const active = idx === currentIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    function startAuto() {
      stopAuto();
      if (getMaxIndex() <= 0) {
        return;
      }
      autoTimer = setInterval(function () {
        const maxIndex = getMaxIndex();
        const nextIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
        render(nextIndex);
      }, 3600);
    }

    if (prevButton) {
      prevButton.addEventListener('click', function () {
        const maxIndex = getMaxIndex();
        const prevIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
        render(prevIndex);
        startAuto();
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        const maxIndex = getMaxIndex();
        const nextIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
        render(nextIndex);
        startAuto();
      });
    }

    window.addEventListener('resize', function () {
      buildDots();
      render(currentIndex);
    });

    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('focusout', startAuto);

    buildDots();
    render(0);
    startAuto();
  }

  function setupBuildYourBox() {
    const root = document.getElementById('buildYourBox');
    if (!root) {
      return;
    }

    const caseInputs = Array.from(root.querySelectorAll('input[name="caseSize"]'));
    const sizeCards = Array.from(root.querySelectorAll('.box-size-option'));
    const productCards = Array.from(root.querySelectorAll('[data-box-product]'));
    const planButtons = Array.from(root.querySelectorAll('.box-plan-btn'));
    const requiredCountEl = document.getElementById('boxRequiredCount');
    const caseSizeLabelEl = document.getElementById('boxCaseSizeLabel');
    const selectedCountEl = document.getElementById('boxSelectedCount');
    const remainingCountEl = document.getElementById('boxRemainingCount');
    const subtotalEl = document.getElementById('boxSubtotal');
    const estimatedTotalEl = document.getElementById('boxEstimatedTotal');
    const addBundleBtn = document.getElementById('boxAddBundleBtn');
    const feedbackEl = document.getElementById('boxFeedback');
    const configModal = document.getElementById('boxConfigModal');
    const modalProductName = document.getElementById('boxModalProductName');
    const baseOptionsEl = document.getElementById('boxBaseOptions');
    const flavourOptionsEl = document.getElementById('boxFlavourOptions');
    const selectedFlavourPreviewEl = document.getElementById('boxSelectedFlavourPreview');
    const flavourLimitLabel = document.getElementById('boxFlavourLimitLabel');
    const modalStatusEl = document.getElementById('boxModalStatus');
    const modalConfirmBtn = document.getElementById('boxModalConfirmBtn');
    const modalCloseButtons = Array.from(document.querySelectorAll('[data-box-close-modal]'));

    let planDiscount = 0;
    let isSubmitting = false;
    let activeCard = null;
    let activeSelection = { base: '', flavours: [] };
    let activeProductImage = '';
    let activeFlavourMeta = new Map();
    const cardSelections = new Map();

    function getCardKey(card) {
      return card.getAttribute('data-product-id') || '';
    }

    function getProductFlavourDetails(card) {
      const detailsRaw = card.getAttribute('data-flavour-details') || '';
      if (detailsRaw) {
        try {
          const parsed = JSON.parse(decodeURIComponent(detailsRaw));
          if (Array.isArray(parsed) && parsed.length) {
            return parsed
              .map((item) => ({
                name: String(item && item.name ? item.name : '').trim(),
                note: String(item && item.note ? item.note : '').trim(),
                color: String(item && item.color ? item.color : '#ffe5c2').trim() || '#ffe5c2'
              }))
              .filter((item) => item.name);
          }
        } catch (error) {
          // Fallback to plain name parsing below.
        }
      }

      const raw = card.getAttribute('data-flavours') || '';
      return raw
        .split('|')
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .map((name) => ({ name, note: 'Signature layer', color: '#ffe5c2' }));
    }

    function getProductFlavourOptions(card) {
      return getProductFlavourDetails(card).map((item) => item.name);
    }

    function getAvailableBaseOptions(card) {
      const flavourOptions = getProductFlavourOptions(card);
      if (flavourOptions.length >= 3) {
        return flavourOptions.slice(0, 3);
      }
      if (flavourOptions.length) {
        return flavourOptions;
      }
      return ['Classic Vanilla', 'Chocolate Cream', 'Berry Cream'];
    }

    function getMaxFlavourByCase() {
      const size = getCaseSize();
      return Math.max(1, size - 1);
    }

    function getCaseSize() {
      const selected = caseInputs.find((input) => input.checked);
      return selected ? Number(selected.value) : 4;
    }

    function getQty(card) {
      const key = getCardKey(card);
      const entries = cardSelections.get(key) || [];
      return entries.length;
    }

    function setQty(card, nextQty) {
      const input = card.querySelector('[data-qty-input]');
      if (!input) {
        return;
      }

      input.value = String(Math.max(0, nextQty));
    }

    function syncQtyInputs() {
      productCards.forEach((card) => setQty(card, getQty(card)));
    }

    function getSelectedCount() {
      return productCards.reduce((sum, card) => sum + getQty(card), 0);
    }

    function getSubtotal() {
      return productCards.reduce((sum, card) => {
        const qty = getQty(card);
        const price = Number(card.getAttribute('data-price') || 0);
        return sum + (qty * price);
      }, 0);
    }

    function updateSizeStyles() {
      sizeCards.forEach((card) => {
        const input = card.querySelector('input[name="caseSize"]');
        card.classList.toggle('active', !!(input && input.checked));
      });
    }

    function updateQtyButtonState() {
      const required = getCaseSize();
      const selected = getSelectedCount();

      productCards.forEach((card) => {
        const qty = getQty(card);
        const decreaseBtn = card.querySelector('.box-qty-btn[data-action="decrease"]');
        const increaseBtn = card.querySelector('.box-qty-btn[data-action="increase"]');

        if (decreaseBtn) {
          decreaseBtn.disabled = qty <= 0 || isSubmitting;
        }

        if (increaseBtn) {
          increaseBtn.disabled = selected >= required || isSubmitting;
        }
      });

      syncQtyInputs();
    }

    function closeModal() {
      if (!configModal) {
        return;
      }
      configModal.classList.remove('open');
      configModal.setAttribute('aria-hidden', 'true');
      activeCard = null;
      activeSelection = { base: '', flavours: [] };
    }

    function renderModalSelectionState() {
      if (!baseOptionsEl || !flavourOptionsEl || !modalStatusEl || !modalConfirmBtn || !activeCard) {
        return;
      }

      const maxFlavours = getMaxFlavourByCase();
      const baseChecked = !!activeSelection.base;
      const flavourCount = activeSelection.flavours.length;

      Array.from(baseOptionsEl.querySelectorAll('input[type="radio"]')).forEach((input) => {
        input.checked = input.value === activeSelection.base;
        const row = input.closest('.box-modal-choice');
        if (row) {
          row.classList.toggle('active', input.checked);
        }
      });

      Array.from(flavourOptionsEl.querySelectorAll('input[type="checkbox"]')).forEach((input) => {
        const checked = activeSelection.flavours.includes(input.value);
        input.checked = checked;
        input.disabled = !checked && flavourCount >= maxFlavours;
        const picker = input.closest('.flavour-picker');
        if (picker) {
          picker.classList.toggle('active', checked);
        }
      });

      const ready = baseChecked && flavourCount > 0;
      modalConfirmBtn.disabled = !ready;
      renderSelectedFlavourPreview(maxFlavours);
      modalStatusEl.textContent = ready
        ? `Ready: 1 base + ${flavourCount} flavour${flavourCount > 1 ? 's' : ''}.`
        : `Select 1 base and up to ${maxFlavours} flavours.`;
    }

    function renderSelectedFlavourPreview(maxFlavours) {
      if (!selectedFlavourPreviewEl) {
        return;
      }

      selectedFlavourPreviewEl.innerHTML = '';

      const selected = activeSelection.flavours.slice(0, maxFlavours);
      selected.forEach((name) => {
        const meta = activeFlavourMeta.get(name) || { color: '#e6f2ff' };
        const tile = document.createElement('div');
        tile.className = 'selected-flavour-tile';

        const media = document.createElement('div');
        media.className = 'selected-flavour-tile__media';
        media.style.backgroundImage = `url("${resolveFlavourImage(name, activeProductImage || '/assets/main-section-imge.jpg')}")`;

        const tint = document.createElement('span');
        tint.className = 'selected-flavour-tile__tint';
        tint.style.background = meta.color || '#e6f2ff';
        media.appendChild(tint);

        const label = document.createElement('strong');
        label.textContent = name;

        tile.appendChild(media);
        tile.appendChild(label);
        selectedFlavourPreviewEl.appendChild(tile);
      });

      const remaining = Math.max(0, maxFlavours - selected.length);
      for (let i = 0; i < remaining; i += 1) {
        const slot = document.createElement('div');
        slot.className = 'selected-flavour-placeholder';

        const plus = document.createElement('span');
        plus.textContent = '+';

        const text = document.createElement('strong');
        text.textContent = 'Choose flavour';

        slot.appendChild(plus);
        slot.appendChild(text);
        selectedFlavourPreviewEl.appendChild(slot);
      }
    }

    function openModalForCard(card) {
      if (!configModal || !baseOptionsEl || !flavourOptionsEl || !modalProductName || !flavourLimitLabel) {
        return;
      }

      activeCard = card;
      activeSelection = { base: '', flavours: [] };
      const flavourDetails = getProductFlavourDetails(card);
      const flavourOptions = flavourDetails.map((item) => item.name);
      const baseOptions = getAvailableBaseOptions(card);
      const maxFlavours = getMaxFlavourByCase();
      const productName = String(card.querySelector('h4') ? card.querySelector('h4').textContent : 'this product');
      activeProductImage = String(card.querySelector('img') ? card.querySelector('img').getAttribute('src') : '');
      activeFlavourMeta = new Map(flavourDetails.map((item) => [item.name, { color: item.color, note: item.note }]));

      modalProductName.textContent = `Configure ${productName}: choose 1 base and up to ${maxFlavours} flavour${maxFlavours > 1 ? 's' : ''}.`;
      flavourLimitLabel.textContent = `Choose Flavours (up to ${maxFlavours})`;

      const baseNotes = ['Smooth classic profile', 'Balanced sweetness', 'Rich and creamy base'];
      baseOptionsEl.innerHTML = baseOptions
        .map((base, idx) => `
          <label class="choice-row box-modal-choice">
            <input type="radio" name="boxBasePick" value="${escapeHtml(base)}" ${idx === 0 ? 'checked' : ''} />
            <span>
              <strong>${escapeHtml(base)}</strong>
              <small>${baseNotes[idx % baseNotes.length]}</small>
            </span>
          </label>
        `)
        .join('');

      activeSelection.base = baseOptions.length ? baseOptions[0] : '';

      const fallbackFlavours = flavourDetails.length
        ? flavourDetails
        : ['Caramel Crunch', 'Berry Swirl', 'Cookie Crumble', 'Pistachio Cream'].map((name) => ({ name, note: 'Signature layer', color: '#ffe5c2' }));
      flavourOptionsEl.innerHTML = fallbackFlavours
        .map((flavour) => `
          <label class="flavour-picker" style="--flavour-accent:${escapeHtml(flavour.color || '#ffe5c2')}">
            <input type="checkbox" value="${escapeHtml(flavour.name)}" />
            <span class="flavour-badge"></span>
            <strong>${escapeHtml(flavour.name)}</strong>
            <small>${escapeHtml(flavour.note || 'Signature layer')}</small>
          </label>
        `)
        .join('');

      renderModalSelectionState();
      configModal.classList.add('open');
      configModal.setAttribute('aria-hidden', 'false');
    }

    function renderSummary() {
      const required = getCaseSize();
      const selected = getSelectedCount();
      const remaining = Math.max(0, required - selected);
      const subtotal = getSubtotal();
      const estimatedTotal = subtotal * (1 - (planDiscount / 100));

      if (requiredCountEl) {
        requiredCountEl.textContent = String(required);
      }

      if (caseSizeLabelEl) {
        caseSizeLabelEl.textContent = `${required}-Pack`;
      }

      if (selectedCountEl) {
        selectedCountEl.textContent = String(selected);
      }

      if (remainingCountEl) {
        remainingCountEl.textContent = String(remaining);
      }

      if (subtotalEl) {
        subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
      }

      if (estimatedTotalEl) {
        estimatedTotalEl.textContent = `$${estimatedTotal.toFixed(2)}`;
      }

      if (addBundleBtn) {
        addBundleBtn.disabled = isSubmitting || selected === 0 || remaining !== 0;
      }

      if (feedbackEl) {
        if (selected === 0) {
          feedbackEl.textContent = 'Select products to start building your bundle.';
        } else if (remaining > 0) {
          feedbackEl.textContent = `Add ${remaining} more pint${remaining > 1 ? 's' : ''} to complete your ${required}-pack.`;
        } else {
          feedbackEl.textContent = 'Bundle ready. Add to cart now.';
        }
      }

      updateQtyButtonState();
      updateSizeStyles();
    }

    function handleQtyClick(event) {
      const btn = event.target.closest('.box-qty-btn');
      if (!btn || isSubmitting) {
        return;
      }

      const card = btn.closest('[data-box-product]');
      if (!card) {
        return;
      }

      const action = btn.getAttribute('data-action');
      const currentQty = getQty(card);
      const required = getCaseSize();
      const selected = getSelectedCount();

      if (action === 'decrease') {
        const key = getCardKey(card);
        const entries = cardSelections.get(key) || [];
        entries.pop();
        cardSelections.set(key, entries);
      }

      if (action === 'increase' && selected < required) {
        openModalForCard(card);
      }

      renderSummary();
    }

    function resetBundle() {
      cardSelections.clear();
      productCards.forEach((card) => setQty(card, 0));
      renderSummary();
    }

    function addBundleToCart() {
      const selectedItems = [];

      productCards.forEach((card) => {
        const key = getCardKey(card);
        const productId = card.getAttribute('data-product-id');
        const entries = cardSelections.get(key) || [];
        entries.forEach((entry) => {
          selectedItems.push({
            productId,
            quantity: 1,
            selectedFlavours: [`Base: ${entry.base}`].concat(entry.flavours.map((value) => `Flavor: ${value}`)),
            scoopCount: entry.flavours.length
          });
        });
      });

      if (!selectedItems.length) {
        return Promise.resolve();
      }

      const requests = selectedItems.map((item) =>
        fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity,
            selectedFlavours: item.selectedFlavours,
            scoopCount: item.scoopCount
          })
        }).then((res) => {
          if (!res.ok) {
            throw new Error('Cart add failed');
          }
          return res.json();
        })
      );

      return Promise.all(requests).then((responses) => {
        return responses.reduce((maxCount, row) => {
          const next = Number(row && row.cartCount) || 0;
          return Math.max(maxCount, next);
        }, 0);
      });
    }

    caseInputs.forEach((input) => {
      input.addEventListener('change', function () {
        resetBundle();
      });
    });

    planButtons.forEach((button) => {
      button.addEventListener('click', function () {
        if (isSubmitting) {
          return;
        }

        planButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        planDiscount = Number(button.getAttribute('data-discount') || 0);
        renderSummary();
      });
    });

    root.addEventListener('click', handleQtyClick);

    if (baseOptionsEl) {
      baseOptionsEl.addEventListener('change', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        if (target.type === 'radio') {
          activeSelection.base = target.value;
          renderModalSelectionState();
        }
      });
    }

    if (flavourOptionsEl) {
      flavourOptionsEl.addEventListener('change', function (event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
          return;
        }

        const maxFlavours = getMaxFlavourByCase();
        if (target.checked) {
          if (activeSelection.flavours.length >= maxFlavours) {
            target.checked = false;
            return;
          }
          activeSelection.flavours.push(target.value);
        } else {
          activeSelection.flavours = activeSelection.flavours.filter((value) => value !== target.value);
        }

        renderModalSelectionState();
      });
    }

    modalCloseButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && configModal && configModal.classList.contains('open')) {
        closeModal();
      }
    });

    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', function () {
        if (!activeCard || !activeSelection.base || !activeSelection.flavours.length) {
          return;
        }

        const key = getCardKey(activeCard);
        const entries = cardSelections.get(key) || [];
        entries.push({
          base: activeSelection.base,
          flavours: activeSelection.flavours.slice(0)
        });
        cardSelections.set(key, entries);
        closeModal();
        renderSummary();
      });
    }

    if (addBundleBtn) {
      addBundleBtn.addEventListener('click', function () {
        const required = getCaseSize();
        const selected = getSelectedCount();
        if (selected !== required || isSubmitting) {
          return;
        }

        isSubmitting = true;
        addBundleBtn.textContent = 'Adding Bundle...';
        renderSummary();

        addBundleToCart()
          .then((cartCount) => {
            setCartBadgeCount(cartCount);
            openCartDrawer();
            if (feedbackEl) {
              feedbackEl.textContent = 'Bundle added to cart successfully. You can continue building or go to cart.';
            }
            resetBundle();
          })
          .catch(() => {
            if (feedbackEl) {
              feedbackEl.textContent = 'Could not add bundle right now. Please try again.';
            }
          })
          .finally(() => {
            isSubmitting = false;
            addBundleBtn.textContent = 'Add Bundle To Cart';
            renderSummary();
          });
      });
    }

    renderSummary();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setupCartDrawer() {
    const root = document.getElementById('cartDrawer');
    const content = document.getElementById('cartDrawerContent');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');
    const totalEl = document.getElementById('cartDrawerTotal');
    const closeBtn = document.getElementById('cartDrawerClose');
    const backdrop = root ? root.querySelector('[data-close-cart-drawer]') : null;

    if (!root || !content || !subtotalEl || !totalEl) {
      openCartDrawer = function () {};
      return;
    }

    function closeDrawer() {
      root.classList.remove('open');
      root.setAttribute('aria-hidden', 'true');
    }

    function renderItems(items) {
      if (!Array.isArray(items) || !items.length) {
        content.innerHTML = '<p class="muted">Your cart is currently empty.</p>';
        return;
      }

      content.innerHTML = items
        .map((item) => {
          const flavors = Array.isArray(item.selectedFlavours) && item.selectedFlavours.length
            ? `<p class="cart-drawer-item-flavours">${item.selectedFlavours.map((name) => escapeHtml(name)).join(', ')}</p>`
            : '';

          return `
            <article class="cart-drawer-item">
              <img src="${escapeHtml(item.image || '/assets/main-section-imge.jpg')}" alt="${escapeHtml(item.name || 'Cart item')}" class="cart-drawer-item-image" />
              <div class="cart-drawer-item-body">
                <h4>${escapeHtml(item.name || 'Product')}</h4>
                <p class="cart-drawer-item-meta">Qty ${Number(item.quantity || 0)} • $${Number(item.price || 0).toFixed(2)}</p>
                ${flavors}
              </div>
              <strong class="cart-drawer-item-total">$${Number(item.itemTotal || 0).toFixed(2)}</strong>
            </article>
          `;
        })
        .join('');
    }

    function fetchSummaryAndRender() {
      return fetch('/cart/summary', {
        headers: {
          Accept: 'application/json'
        }
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch cart summary');
          }
          return res.json();
        })
        .then((data) => {
          if (!data || !data.success) {
            throw new Error('Invalid cart summary');
          }

          renderItems(data.items || []);
          subtotalEl.textContent = `$${Number(data.subtotal || 0).toFixed(2)}`;
          totalEl.textContent = `$${Number(data.total || 0).toFixed(2)}`;
          setCartBadgeCount(data.cartCount || 0);
        })
        .catch(() => {
          content.innerHTML = '<p class="muted">Could not load cart details right now.</p>';
        });
    }

    openCartDrawer = function () {
      fetchSummaryAndRender().finally(() => {
        root.classList.add('open');
        root.setAttribute('aria-hidden', 'false');
      });
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }
    if (backdrop) {
      backdrop.addEventListener('click', closeDrawer);
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && root.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

    /* ══════════════════════════════════════════════
      NLP CHATBOT ENGINE — Client-side, no API key
      Hybrid matching: synonyms + fuzzy typo tolerance + intent overlap
      ══════════════════════════════════════════════ */
  function setupChatbotWidget() {
    const toggle = document.getElementById('chatbotToggle');
    const panel = document.getElementById('chatbotPanel');
    const close = document.getElementById('chatbotClose');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const body = document.getElementById('chatbotBody');
    const promptButtons = Array.from(document.querySelectorAll('.chatbot-prompt'));

    if (!toggle || !panel || !form || !input || !body) {
      return;
    }

    const userRole = String(panel.getAttribute('data-user-role') || 'Guest');
    const isAdmin = userRole === 'Admin' || userRole === 'Manager';
    const isSignedIn = panel.getAttribute('data-user-signedin') === 'true';
    const userName = panel.getAttribute('data-user-name') || '';
    const storageUserKey = isSignedIn ? `${userRole}:${userName || 'member'}` : 'guest';
    const chatStorageKey = `scoopcraft-chatbot:${storageUserKey}`;
    const maxStoredMessages = 30;
    const initialBotMessage = body.querySelector('.chatbot-msg.bot p');
    const defaultGreetingHtml = initialBotMessage
      ? String(initialBotMessage.innerHTML || '').trim()
      : 'Hello! 👋 I\'m your ScoopCraft assistant. Ask me anything about our products, flavours, ordering, or tracking!';

    /* ── Site Knowledge Base ── */
    const siteKnowledge = {
      flavours: [],
      products: [],
      recommendationRules: {},
      support: {
        email: 'hello@scoopcraftpints.com',
        phone: '+1 (555) 246-7812',
        address: '14 Creamery Lane, Frostown'
      },
      pages: [
        { name: 'Home', path: '/', desc: 'Landing page with featured products and flavours' },
        { name: 'Shop Pints', path: '/products', desc: 'Browse all products with search and build-your-box' },
        { name: 'Cart', path: '/cart', desc: 'View cart items, update quantities and proceed to checkout' },
        { name: 'Checkout', path: '/checkout', desc: 'Enter shipping details and place your order' },
        { name: 'My Orders', path: '/my-orders', desc: 'View your order history' },
        { name: 'Track Order', path: '/track-order', desc: 'Track any order status with a timeline view' },
        { name: 'Wishlist', path: '/wishlist', desc: 'View saved products for later' },
        { name: 'About', path: '/about', desc: 'Learn about ScoopCraft story and values' },
        { name: 'Contact', path: '/contact', desc: 'Get in touch with ScoopCraft team' },
        { name: 'Sign In', path: '/auth/signin', desc: 'Sign in to your account' },
        { name: 'Sign Up', path: '/auth/signup', desc: 'Create a new ScoopCraft account' }
      ],
      shipping: {
        method: 'Cold-chain insulated packaging with dry ice',
        time: '2-3 business days',
        cost: '$5.99 flat rate',
        details: 'All orders are packed in insulated containers with dry ice to maintain freshness and texture during transit.'
      },
      subscriptions: {
        plans: ['One-Time', 'Weekly Subscription (20% off)'],
        details: 'Weekly subscriptions deliver fresh pints every week at 20% off. You can pause or cancel anytime from your account.',
        cancel: 'Cancel anytime from My Orders page'
      },
      checkout: {
        steps: ['Add items to cart', 'Go to checkout', 'Enter shipping info', 'Select plan (one-time/subscription)', 'Apply coupon code if available', 'Review and confirm order'],
        payment: 'Session-based secure checkout',
        tax: '8% tax applied automatically'
      }
    };

    function dedupeBy(items, getKey) {
      const map = new Map();
      (items || []).forEach((item) => {
        const key = String(getKey(item) || '').trim().toLowerCase();
        if (!key || map.has(key)) {
          return;
        }
        map.set(key, item);
      });
      return Array.from(map.values());
    }

    function toCurrency(value) {
      const amount = Number(value);
      if (!Number.isFinite(amount)) {
        return '';
      }
      return `$${amount.toFixed(2)}`;
    }

    function isSpecificProductLink(href) {
      return /^\/products\/[^/?#]+/i.test(String(href || '').trim());
    }

    function resolveProductLink(product) {
      const explicitLink = String(product?.link || product?.href || '').trim();
      if (isSpecificProductLink(explicitLink)) {
        return explicitLink;
      }

      const id = String(product?._id || product?.id || '').trim();
      if (id) {
        return `/products/${id}`;
      }

      return explicitLink || '/products';
    }

    function mergeExternalKnowledge(payload) {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      if (payload.support && typeof payload.support === 'object') {
        siteKnowledge.support = {
          ...siteKnowledge.support,
          ...payload.support
        };
      }

      if (Array.isArray(payload.pages) && payload.pages.length) {
        const externalPages = payload.pages.map((page) => ({
          name: String(page.name || '').trim(),
          path: String(page.path || '').trim(),
          desc: String(page.purpose || page.desc || '').trim()
        }));
        siteKnowledge.pages = dedupeBy(siteKnowledge.pages.concat(externalPages), (row) => row.path || row.name);
      }

      if (Array.isArray(payload.products) && payload.products.length) {
        const externalProducts = payload.products.map((product) => ({
          id: String(product._id || product.id || '').trim(),
          name: String(product.name || '').trim(),
          desc: String(product.description || product.desc || '').trim(),
          price: toCurrency(product.price),
          link: resolveProductLink(product),
          rarity: String(product.rarity || '').trim(),
          flavours: Array.isArray(product.flavours) ? product.flavours.map((name) => String(name || '').trim()).filter(Boolean) : []
        })).filter((item) => item.name);
        siteKnowledge.products = dedupeBy(siteKnowledge.products.concat(externalProducts), (row) => row.name);
      }

      const flavourRows = [];

      if (Array.isArray(payload.allFlavours)) {
        payload.allFlavours.forEach((flavourName) => {
          const name = String(flavourName || '').trim();
          if (name) {
            flavourRows.push({
              name,
              note: 'Signature handcrafted flavour',
              detail: 'Available in the ScoopCraft catalog.'
            });
          }
        });
      }

      if (Array.isArray(payload.products)) {
        payload.products.forEach((product) => {
          const productName = String(product.name || '').trim();
          const productFlavours = Array.isArray(product.flavours) ? product.flavours : [];
          productFlavours.forEach((flavourName) => {
            const name = String(flavourName || '').trim();
            if (!name) {
              return;
            }
            flavourRows.push({
              name,
              note: `${productName} flavour layer`,
              detail: `${name} appears in ${productName}.`
            });
          });
        });
      }

      if (flavourRows.length) {
        siteKnowledge.flavours = dedupeBy(siteKnowledge.flavours.concat(flavourRows), (row) => row.name);
      }

      if (payload.commercePolicyFacts && typeof payload.commercePolicyFacts === 'object') {
        const policy = payload.commercePolicyFacts;
        siteKnowledge.shipping = {
          ...siteKnowledge.shipping,
          method: policy.shippingMethod || siteKnowledge.shipping.method,
          time: policy.shippingETA || siteKnowledge.shipping.time,
          cost: policy.shippingFlatRate || siteKnowledge.shipping.cost,
          details: siteKnowledge.shipping.details
        };

        if (policy.subscriptionDiscount) {
          siteKnowledge.subscriptions = {
            ...siteKnowledge.subscriptions,
            plans: ['One-Time', `Weekly Subscription (${policy.subscriptionDiscount})`]
          };
        }

        if (policy.taxRate) {
          siteKnowledge.checkout = {
            ...siteKnowledge.checkout,
            tax: `${policy.taxRate} tax applied automatically`
          };
        }
      }

      if (payload.bestSuggestionRules && typeof payload.bestSuggestionRules === 'object') {
        siteKnowledge.recommendationRules = payload.bestSuggestionRules;
      }
    }

    function loadExternalKnowledge() {
      return fetch('/data/chatbot-full-data.json', {
        headers: {
          Accept: 'application/json'
        }
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Knowledge fetch failed with ${res.status}`);
          }
          return res.json();
        })
        .then((json) => {
          mergeExternalKnowledge(json);
        })
        .catch(() => {
          // Keep chatbot functional with local fallback data.
        });
    }

    /* Scrape live products and flavours from current page DOM */
    function scrapeLiveData() {
      const productCards = Array.from(document.querySelectorAll('.product-card'));
      productCards.forEach(card => {
        const nameEl = card.querySelector('h3');
        const descEl = card.querySelector('p');
        const priceEl = card.querySelector('strong');
        const anchorEl = card.querySelector('a[href*="/products/"]');
        const link = card.getAttribute('data-href') || (anchorEl ? anchorEl.getAttribute('href') : '') || '';
        if (nameEl) {
          const name = nameEl.textContent.trim();
          const existing = siteKnowledge.products.find(p => p.name === name);
          if (!existing) {
            siteKnowledge.products.push({
              name: name,
              desc: descEl ? descEl.textContent.trim() : '',
              price: priceEl ? priceEl.textContent.trim() : '',
              link: resolveProductLink({ link })
            });
          }
        }
      });

      const flavourCards = Array.from(document.querySelectorAll('.flavour-card'));
      flavourCards.forEach(card => {
        const nameEl = card.querySelector('h3');
        const noteEl = card.querySelector('p');
        const detail = card.getAttribute('data-info-body') || '';
        if (nameEl) {
          const name = nameEl.textContent.trim();
          const existing = siteKnowledge.flavours.find(f => f.name === name);
          if (!existing) {
            siteKnowledge.flavours.push({
              name: name,
              note: noteEl ? noteEl.textContent.trim() : '',
              detail: detail
            });
          }
        }
      });
    }

    scrapeLiveData();
    loadExternalKnowledge();

    /* ── NLP Utilities ── */
    const synonymGroups = {
      flavours: ['flavour', 'flavours', 'flavor', 'flavors', 'taste', 'tastes', 'variety', 'varieties', 'options', 'choices'],
      products: ['product', 'products', 'catalog', 'menu', 'shop', 'items', 'pints', 'buy', 'purchase'],
      shipping: ['shipping', 'delivery', 'deliver', 'ship', 'arrival', 'arrive', 'transit', 'dispatch'],
      subscription: ['subscription', 'subscribe', 'subscribed', 'weekly', 'recurring', 'renewal', 'plan', 'plans'],
      cart: ['cart', 'basket', 'bag', 'checkout', 'payment', 'pay', 'total', 'coupon', 'promo'],
      orders: ['order', 'orders', 'tracking', 'track', 'status', 'shipment', 'history'],
      wishlist: ['wishlist', 'wish', 'saved', 'favorite', 'favorites', 'bookmark'],
      customization: ['custom', 'customize', 'build', 'builder', 'mix', 'layer', 'choose', 'selection', 'personalize'],
      pricing: ['price', 'prices', 'pricing', 'cost', 'rate', 'expensive', 'cheap', 'cheaper', 'budget', 'affordable', 'value', 'lowest'],
      support: ['help', 'support', 'contact', 'email', 'assist', 'assistance', 'issue', 'problem'],
      recommendation: ['recommend', 'suggest', 'best', 'top', 'popular', 'pairing', 'combo', 'match'],
      compare: ['compare', 'difference', 'versus', 'vs', 'between']
    };

    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
      'to', 'for', 'of', 'on', 'in', 'at', 'by', 'with', 'about', 'from', 'into',
      'my', 'me', 'i', 'you', 'we', 'our', 'your', 'it', 'this', 'that', 'these', 'those',
      'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'please',
      'show', 'tell', 'give', 'need', 'want', 'know', 'any', 'one', 'ones', 'them', 'those', 'that'
    ]);

    const typoAliases = {
      pitachio: 'pistachio',
      pistacio: 'pistachio',
      pistacho: 'pistachio',
      pistachioo: 'pistachio',
      choco: 'chocolate',
      choc: 'chocolate',
      choclate: 'chocolate',
      chocalate: 'chocolate',
      straberry: 'strawberry',
      strawbery: 'strawberry',
      carmel: 'caramel',
      caremel: 'caramel',
      vanila: 'vanilla',
      mangoo: 'mango'
    };

    function normalizeToken(token) {
      let t = String(token || '').toLowerCase().trim();
      if (t.length <= 2) return t;
      if (typoAliases[t]) {
        return typoAliases[t];
      }
      t = t.replace(/(ingly|edly|ing|ed|ly|es|s)$/i, '');
      if (t === 'flavour') return 'flavors';
      if (t === 'flavor') return 'flavors';
      if (t === 'favourite') return 'favorite';
      if (t === 'reccomend' || t === 'recomend') return 'recommend';
      if (t === 'shiping') return 'shipping';
      if (t === 'delievery') return 'delivery';
      return t;
    }

    function isTokenPrefixMatch(a, b) {
      const left = String(a || '').trim();
      const right = String(b || '').trim();
      if (!left || !right) return false;
      if (left.length < 4 && right.length < 4) return false;
      return left.startsWith(right) || right.startsWith(left) || left.includes(right) || right.includes(left);
    }

    function tokenize(text) {
      return String(text || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map(normalizeToken)
        .filter((t) => t.length > 1 && !stopWords.has(t));
    }

    function levenshteinDistance(a, b) {
      const left = String(a || '');
      const right = String(b || '');

      if (left === right) {
        return 0;
      }

      if (!left.length) {
        return right.length;
      }

      if (!right.length) {
        return left.length;
      }

      const cols = right.length + 1;
      const rows = left.length + 1;
      const matrix = new Array(rows);

      for (let row = 0; row < rows; row += 1) {
        matrix[row] = new Array(cols);
        matrix[row][0] = row;
      }

      for (let col = 0; col < cols; col += 1) {
        matrix[0][col] = col;
      }

      for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
          const cost = left[row - 1] === right[col - 1] ? 0 : 1;
          matrix[row][col] = Math.min(
            matrix[row - 1][col] + 1,
            matrix[row][col - 1] + 1,
            matrix[row - 1][col - 1] + cost
          );
        }
      }

      return matrix[rows - 1][cols - 1];
    }

    function tokenSimilarity(a, b) {
      const left = String(a || '').trim();
      const right = String(b || '').trim();

      if (!left || !right) {
        return 0;
      }

      if (left === right) {
        return 1;
      }

      const maxLen = Math.max(left.length, right.length);
      if (!maxLen) {
        return 0;
      }

      const distance = levenshteinDistance(left, right);
      return Math.max(0, 1 - (distance / maxLen));
    }

    function buildSynonymIndex() {
      const index = {};
      Object.keys(synonymGroups).forEach((canonical) => {
        synonymGroups[canonical].forEach((word) => {
          index[normalizeToken(word)] = canonical;
        });
      });
      return index;
    }

    const synonymIndex = buildSynonymIndex();
    const synonymTokens = Object.keys(synonymIndex);

    function getClosestSynonymToken(token) {
      let bestToken = '';
      let bestScore = 0;

      synonymTokens.forEach((candidate) => {
        const score = tokenSimilarity(token, candidate);
        if (score > bestScore) {
          bestScore = score;
          bestToken = candidate;
        }
      });

      return bestScore >= 0.8 ? bestToken : '';
    }

    function expandTokens(tokens) {
      const expanded = new Set();
      (tokens || []).forEach((token) => {
        const normalized = normalizeToken(token);
        if (!normalized) return;
        expanded.add(normalized);

        let canonical = synonymIndex[normalized];
        if (!canonical) {
          const closest = getClosestSynonymToken(normalized);
          if (closest) {
            expanded.add(closest);
            canonical = synonymIndex[closest];
          }
        }

        if (canonical) expanded.add(canonical);
      });
      return Array.from(expanded);
    }

    function collectDomainSignals(queryTokens) {
      const counts = {};
      Object.keys(synonymGroups).forEach((domain) => {
        counts[domain] = 0;
      });

      (queryTokens || []).forEach((token) => {
        const normalized = normalizeToken(token);
        const directDomain = synonymIndex[normalized];
        if (directDomain) {
          counts[directDomain] += 1;
          return;
        }

        const closest = getClosestSynonymToken(normalized);
        if (closest) {
          const fuzzyDomain = synonymIndex[closest];
          if (fuzzyDomain) {
            counts[fuzzyDomain] += 0.8;
          }
        }
      });

      return counts;
    }

    function scoreByOverlap(queryTokens, docTokens) {
      if (!queryTokens.length || !docTokens.length) return 0;
      const querySet = new Set(queryTokens);
      const docSet = new Set(docTokens);
      const docArray = Array.from(docSet);
      let overlap = 0;

      querySet.forEach((token) => {
        if (docSet.has(token)) {
          overlap += 1;
          return;
        }

        let bestSimilarity = 0;
        docArray.forEach((docToken) => {
          const similarity = tokenSimilarity(token, docToken);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
          }
        });

        if (bestSimilarity >= 0.82) {
          overlap += bestSimilarity * 0.75;
          return;
        }

        const prefixMatch = docArray.some((docToken) => isTokenPrefixMatch(token, docToken));
        if (prefixMatch) {
          overlap += 0.6;
        }
      });

      const union = new Set([...querySet, ...docSet]).size || 1;
      return overlap / union;
    }

    function guessRecommendationBucket(text) {
      const lower = String(text || '').toLowerCase();
      if (/(choco|cocoa|brownie|mocha)/i.test(lower)) return 'chocolate_lover';
      if (/(fruit|berry|mango|lemon|tropical|citrus)/i.test(lower)) return 'fruity_refreshing';
      if (/(nut|hazel|pistach|sesame|pecan)/i.test(lower)) return 'nutty_premium';
      if (/(season|limited)/i.test(lower)) return 'seasonal_only';
      if (/(reserve|premium|luxury)/i.test(lower)) return 'premium_reserve_only';
      if (/(first|new|beginner|start)/i.test(lower)) return 'balanced_first_timer';
      return '';
    }

    function rankProductsByQuery(text, limit) {
      const queryTokens = expandTokens(tokenize(text));
      return (siteKnowledge.products || [])
        .map((product) => {
          const productText = [product.name, product.desc, product.price].join(' ');
          const productTokens = expandTokens(tokenize(productText));
          const nameTokens = tokenize(product.name || '');
          const score = scoreByOverlap(queryTokens, productTokens) + scoreByOverlap(queryTokens, nameTokens) * 0.55;
          return { product, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, Number(limit || 6)));
    }

    function rankFlavoursByQuery(text, limit) {
      const queryTokens = expandTokens(tokenize(text));
      return (siteKnowledge.flavours || [])
        .map((flavour) => {
          const flavourText = [flavour.name, flavour.note, flavour.detail].join(' ');
          const flavourTokens = expandTokens(tokenize(flavourText));
          const nameTokens = tokenize(flavour.name || '');
          const score = scoreByOverlap(queryTokens, flavourTokens) + scoreByOverlap(queryTokens, nameTokens) * 0.65;
          return { flavour, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, Number(limit || 8)));
    }

    function getSpecificProductLinks(text, limit) {
      const rows = rankProductsByQuery(text || '', 12)
        .map((row) => ({
          name: row.product.name,
          href: resolveProductLink(row.product),
          score: row.score
        }))
        .filter((row) => isSpecificProductLink(row.href));

      const top = dedupeBy(rows, (row) => row.href).slice(0, Math.max(1, Number(limit || 3)));
      return top.map((row) => ({
        label: `🛍️ ${row.name}`,
        href: row.href
      }));
    }

    function parsePriceNumber(value) {
      const raw = String(value || '');
      const match = raw.match(/\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
    }

    function extractPriceRange(text) {
      const raw = String(text || '').trim();
      if (!raw) {
        return null;
      }

      const lower = raw.toLowerCase();
      const hasPriceCue = /\$|\b(price|cost|under|below|less than|over|above|between|budget|affordable|cheap|cheaper|at most|at least)\b/i.test(lower);
      if (!hasPriceCue) {
        return null;
      }

      const betweenMatch = lower.match(/(?:between|from)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (betweenMatch) {
        const first = Number(betweenMatch[1]);
        const second = Number(betweenMatch[2]);
        if (Number.isFinite(first) && Number.isFinite(second)) {
          return {
            min: Math.min(first, second),
            max: Math.max(first, second),
            type: 'between'
          };
        }
      }

      const maxMatch = lower.match(/(?:less than|under|below|cheaper than|at most|max(?:imum)?|<=?)\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (maxMatch) {
        const max = Number(maxMatch[1]);
        if (Number.isFinite(max)) {
          return {
            min: 0,
            max,
            type: 'max'
          };
        }
      }

      const minMatch = lower.match(/(?:more than|above|over|greater than|at least|min(?:imum)?|>=?)\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (minMatch) {
        const min = Number(minMatch[1]);
        if (Number.isFinite(min)) {
          return {
            min,
            max: Number.POSITIVE_INFINITY,
            type: 'min'
          };
        }
      }

      const exactDollarMatch = raw.match(/\$\s*(\d+(?:\.\d+)?)/);
      if (exactDollarMatch) {
        const target = Number(exactDollarMatch[1]);
        if (Number.isFinite(target)) {
          return {
            min: target,
            max: target,
            type: 'exact'
          };
        }
      }

      const exactPriceMatch = lower.match(/(?:price|cost)\s*(?:is|=|around|about|near|at)?\s*\$?\s*(\d+(?:\.\d+)?)/i);
      if (exactPriceMatch) {
        const target = Number(exactPriceMatch[1]);
        if (Number.isFinite(target)) {
          return {
            min: target,
            max: target,
            type: 'exact'
          };
        }
      }

      return null;
    }

    function filterProductsByPrice(products, range) {
      const min = Number.isFinite(range?.min) ? Number(range.min) : 0;
      const max = Number.isFinite(range?.max) ? Number(range.max) : Number.POSITIVE_INFINITY;

      return (products || [])
        .map((product) => {
          const numericPrice = parsePriceNumber(product.price);
          return {
            product,
            numericPrice
          };
        })
        .filter((row) => Number.isFinite(row.numericPrice))
        .filter((row) => row.numericPrice >= min && row.numericPrice <= max);
    }

    function formatPriceRangeLabel(range) {
      if (!range) {
        return 'selected range';
      }

      if (range.type === 'between') {
        return `between ${toCurrency(range.min)} and ${toCurrency(range.max)}`;
      }

      if (range.type === 'max') {
        return `under ${toCurrency(range.max)}`;
      }

      if (range.type === 'min') {
        return `at or above ${toCurrency(range.min)}`;
      }

      return `around ${toCurrency(range.min)}`;
    }

    /* ── Intent Definitions with NLP matching ── */
    const intentDocs = [
      {
        key: 'flavours_list',
        corpus: 'flavour flavours flavor flavors available what names list all show options choices ice cream taste',
        handler: function () {
          if (siteKnowledge.flavours.length) {
            const list = siteKnowledge.flavours.map(f =>
              `<strong>🍦 ${esc(f.name)}</strong><br/><span style="color:#5a7ba5">${esc(f.detail || f.note || 'A premium handcrafted flavour.')}</span>`
            ).join('<br/><br/>');
            return withLinks(
              `<strong>Our Featured Flavours:</strong><br/><br/>${list}`,
              [{ label: '🛍️ Shop Now', href: '/products' }, { label: '🎨 Build Your Box', href: '/products#buildYourBox' }]
            );
          }
          return withLinks('Our flavour lineup changes with the season! Visit the products page to see all currently available flavours and their tasting profiles.', [
            { label: 'Browse Products', href: '/products' }
          ]);
        }
      },
      {
        key: 'products_list',
        corpus: 'product products catalog menu shop what sell pint pints buy purchase items available stock',
        handler: function () {
          if (siteKnowledge.products.length) {
            const list = siteKnowledge.products.slice(0, 8).map(p =>
              `<strong>🛍️ ${esc(p.name)}</strong> — ${esc(p.price)}<br/><span style="color:#5a7ba5">${esc(p.desc).substring(0, 80)}${p.desc.length > 80 ? '...' : ''}</span>${p.link ? ` <a href="${esc(p.link)}">View →</a>` : ''}`
            ).join('<br/><br/>');
            return withLinks(
              `<strong>Our Product Catalog:</strong><br/><br/>${list}`,
              [{ label: '📦 Full Catalog', href: '/products' }, { label: '🎁 Build Your Box', href: '/products#buildYourBox' }]
            );
          }
          return withLinks('Browse our full product catalog to discover premium ice cream pints with customizable flavour layers.', [
            { label: 'Go to Products', href: '/products' }
          ]);
        }
      },
      {
        key: 'shipping',
        corpus: 'shipping delivery deliver ship how long arrive time transit cold chain packed package',
        handler: function () {
          const s = siteKnowledge.shipping;
          return withLinks(
            `<strong>🚚 Shipping Information:</strong><br/><br/>` +
            `<strong>Method:</strong> ${esc(s.method)}<br/>` +
            `<strong>Delivery Time:</strong> ${esc(s.time)}<br/>` +
            `<strong>Cost:</strong> ${esc(s.cost)}<br/><br/>` +
            `${esc(s.details)}`,
            [{ label: '🛒 View Cart', href: '/cart' }, { label: '💳 Checkout', href: '/checkout' }]
          );
        }
      },
      {
        key: 'subscription',
        corpus: 'subscription subscribe plan weekly recurring auto delivery cancel pause save discount 20',
        handler: function () {
          const sub = siteKnowledge.subscriptions;
          return withLinks(
            `<strong>🔄 Subscription Plans:</strong><br/><br/>` +
            `<strong>Available Plans:</strong> ${sub.plans.join(', ')}<br/>` +
            `<strong>How it works:</strong> ${esc(sub.details)}<br/>` +
            `<strong>Cancellation:</strong> ${esc(sub.cancel)}`,
            [{ label: '💳 Start Checkout', href: '/checkout' }, { label: '📋 My Orders', href: '/my-orders' }]
          );
        }
      },
      {
        key: 'cart_checkout',
        corpus: 'cart checkout payment coupon discount promo code tax total price cost buy order place how',
        handler: function () {
          const c = siteKnowledge.checkout;
          const steps = c.steps.map((s, i) => `${i + 1}. ${s}`).join('<br/>');
          return withLinks(
            `<strong>🛒 Cart & Checkout Guide:</strong><br/><br/>` +
            `<strong>Steps:</strong><br/>${steps}<br/><br/>` +
            `<strong>Tax:</strong> ${esc(c.tax)}<br/>` +
            `<strong>Security:</strong> ${esc(c.payment)}`,
            [{ label: '🛒 Open Cart', href: '/cart' }, { label: '💳 Checkout', href: '/checkout' }]
          );
        }
      },
      {
        key: 'order_tracking',
        corpus: 'track order status history where shipment tracking order my orders placed processing delivered timeline',
        handler: function () {
          if (!isSignedIn) {
            return withLinks(
              '🔐 Please sign in first to access your order history and tracking timeline.',
              [{ label: '🔑 Sign In', href: '/auth/signin' }, { label: '📝 Sign Up', href: '/auth/signup' }]
            );
          }
          return withLinks(
            `<strong>📦 Order Tracking:</strong><br/><br/>` +
            `You can track your orders in two ways:<br/>` +
            `1. <strong>Track Order page</strong> — Enter an order ID for detailed timeline view<br/>` +
            `2. <strong>My Orders page</strong> — See all your orders with status updates<br/><br/>` +
            `Each order goes through: <strong>Placed → Processing → Delivered</strong>`,
            [{ label: '📍 Track Order', href: '/track-order' }, { label: '📋 My Orders', href: '/my-orders' }]
          );
        }
      },
      {
        key: 'wishlist',
        corpus: 'wishlist wish save saved favorite like later bookmark',
        handler: function () {
          if (!isSignedIn) {
            return withLinks(
              '🔐 Sign in to use the Wishlist feature! Save your favorite pints and access them anytime.',
              [{ label: '🔑 Sign In', href: '/auth/signin' }]
            );
          }
          return withLinks(
            `<strong>💜 Wishlist:</strong><br/><br/>` +
            `Save products you love for later! On any product page, click "Add to Wishlist" to save it. ` +
            `View all your saved items anytime from the Wishlist page.`,
            [{ label: '💜 My Wishlist', href: '/wishlist' }, { label: '🛍️ Browse Products', href: '/products' }]
          );
        }
      },
      {
        key: 'customization',
        corpus: 'custom customize build create mix layer scoop flavour flavor pick choose selection personalize configuration',
        handler: function () {
          return withLinks(
            `<strong>🎨 Customization Guide:</strong><br/><br/>` +
            `Each product lets you create your perfect pint:<br/>` +
            `1. Choose <strong>3-Flavour Classic</strong> or <strong>4-Flavour Deluxe</strong> mode<br/>` +
            `2. Select your exact flavour layers from available options<br/>` +
            `3. Add to cart — no two pints need to be the same!<br/><br/>` +
            `You can also use the <strong>Build Your Box</strong> feature to create custom cases of 4, 6, or 8 pints.`,
            [{ label: '🎨 Build Your Box', href: '/products#buildYourBox' }, { label: '🛍️ Products', href: '/products' }]
          );
        }
      },
      {
        key: 'recommendation',
        corpus: 'recommend best popular suggest combo pairing favorite top rated which what should try',
        handler: function () {
          const historyText = state.history.slice(-3).map((entry) => entry.text).join(' ');
          const bucket = guessRecommendationBucket(historyText);
          const productMap = new Map((siteKnowledge.products || []).map((item) => [String(item.name || '').trim(), item]));
          const ruleRows = bucket ? siteKnowledge.recommendationRules[bucket] : null;

          if (Array.isArray(ruleRows) && ruleRows.length) {
            const picks = ruleRows.slice(0, 5).map((name) => {
              const product = productMap.get(String(name || '').trim());
              if (!product) {
                return `⭐ <strong>${esc(name)}</strong>`;
              }
              return `⭐ <strong>${esc(product.name)}</strong> — ${esc(product.price || '')}<br/><span style="color:#5a7ba5">${esc(product.desc || 'Recommended based on your preference.')}</span>`;
            }).join('<br/><br/>');

            return withLinks(
              `<strong>🌟 Best Matches For You:</strong><br/><br/>${picks}`,
              [{ label: '🛍️ Shop Now', href: '/products' }, { label: '🎨 Build Custom Box', href: '/products#buildYourBox' }]
            );
          }

          if (siteKnowledge.flavours.length) {
            const top = siteKnowledge.flavours.slice(0, 4).map(f =>
              `⭐ <strong>${esc(f.name)}</strong> — ${esc(f.note || f.detail || 'Premium crafted profile')}`
            ).join('<br/>');
            return withLinks(
              `<strong>🌟 Top Recommendations:</strong><br/><br/>${top}<br/><br/>` +
              `Try combining contrasting flavours (e.g., chocolate + fruit) for the best experience!`,
              [{ label: '🛍️ Shop Now', href: '/products' }, { label: '🎨 Build Custom Box', href: '/products#buildYourBox' }]
            );
          }

          return withLinks(
            'Our top combos: Midnight Cocoa + Vanilla Berry for chocolate-berry balance, or Mango Cloud + Passionfruit for tropical vibes!',
            [{ label: 'Browse Products', href: '/products' }]
          );
        }
      },
      {
        key: 'pricing',
        corpus: 'price cost how much expensive cheap affordable free payment money',
        handler: function () {
          let priceInfo = '';
          if (siteKnowledge.products.length) {
            const prices = siteKnowledge.products.slice(0, 5).map(p =>
              `${esc(p.name)}: <strong>${esc(p.price)}</strong>`
            ).join('<br/>');
            priceInfo = `<br/><br/><strong>Current Prices:</strong><br/>${prices}`;
          }
          return withLinks(
            `<strong>💰 Pricing:</strong><br/><br/>` +
            `Prices vary by product and rarity. Tax (8%) and shipping ($5.99) are added at checkout. ` +
            `Subscriptions get the same base price with 20% discount!${priceInfo}`,
            [{ label: '🛍️ See All Prices', href: '/products' }, { label: '💳 Checkout', href: '/checkout' }]
          );
        }
      },
      {
        key: 'returns',
        corpus: 'return refund issue problem quality melted damaged broken complaint',
        handler: function () {
          return withLinks(
            `<strong>🔧 Returns & Issues:</strong><br/><br/>` +
            `If there's an issue with your order, please contact us with your order ID. ` +
            `We stand behind quality and freshness and will resolve it quickly.`,
            [{ label: '📧 Contact Us', href: '/contact' }, { label: '📍 Track Order', href: '/track-order' }]
          );
        }
      },
      {
        key: 'admin',
        corpus: 'admin dashboard manage crud seo analytics settings users product management',
        handler: function () {
          if (!isAdmin) {
            return '🔒 Admin features are available only to Admin or Manager roles. Contact site support if you need access.';
          }
          return withLinks(
            `<strong>⚙️ Admin Dashboard:</strong><br/><br/>` +
            `You have access to:<br/>` +
            `• <strong>Product CRUD</strong> — Add, edit, delete products<br/>` +
            `• <strong>Order Management</strong> — View and update order statuses<br/>` +
            `• <strong>User Administration</strong> — Manage user accounts<br/>` +
            `• <strong>SEO Settings</strong> — Update site-wide and per-product metadata`,
            [{ label: '⚙️ Dashboard', href: '/admin' }, { label: '🔍 SEO Settings', href: '/admin/seo' }]
          );
        }
      },
      {
        key: 'account',
        corpus: 'account profile signin signup login register password my sign create',
        handler: function () {
          if (!isSignedIn) {
            return withLinks(
              `<strong>👤 Get Started:</strong><br/><br/>` +
              `Create an account to unlock wishlist, order tracking, subscriptions, and stored shipping addresses. Takes under a minute!`,
              [{ label: '🔑 Sign In', href: '/auth/signin' }, { label: '📝 Create Account', href: '/auth/signup' }]
            );
          }
          return withLinks(
            `<strong>👤 Your Account:</strong><br/><br/>` +
            `Welcome back${userName ? ', ' + esc(userName) : ''}! You can:<br/>` +
            `• View order history and tracking<br/>` +
            `• Manage your wishlist<br/>` +
            `• Reorder favorite pints quickly`,
            [{ label: '📋 My Orders', href: '/my-orders' }, { label: '💜 Wishlist', href: '/wishlist' }]
          );
        }
      },
      {
        key: 'support',
        corpus: 'support contact help email question about team reach company',
        handler: function () {
          return withLinks(
            `<strong>📧 Need Help?</strong><br/><br/>` +
            `Email: <strong>${esc(siteKnowledge.support.email || 'hello@scoopcraftpints.com')}</strong><br/>` +
            `Phone: <strong>${esc(siteKnowledge.support.phone || '+1 (555) 246-7812')}</strong><br/>` +
            `Address: <strong>${esc(siteKnowledge.support.address || '14 Creamery Lane, Frostown')}</strong><br/><br/>` +
            `Reach out via our Contact page and include your order ID if it's order-related.`,
            [{ label: '📧 Contact Us', href: '/contact' }, { label: 'ℹ️ About Us', href: '/about' }]
          );
        }
      },
      {
        key: 'chocolate',
        corpus: 'chocolate cocoa brownie dark mocha',
        handler: function () {
          return withLinks(
            `<strong>🍫 Chocolate Flavours:</strong><br/><br/>` +
            `Our chocolate range includes rich dark cocoa, espresso mocha, and cherry chocolate combinations. ` +
            `Each is crafted for deep, balanced flavour profiles perfect for cocoa lovers.`,
            [{ label: '🛍️ See Chocolate Options', href: '/products' }, { label: '🎨 Build Custom', href: '/products#buildYourBox' }]
          );
        }
      },
      {
        key: 'fruity',
        corpus: 'fruit berry mango strawberry raspberry fresh tropical citrus lemon yogurt',
        handler: function () {
          return withLinks(
            `<strong>🍓 Fruity Flavours:</strong><br/><br/>` +
            `From Vanilla Berry Ripple to Mango Coconut Cloud, our fruit-forward flavours deliver fresh, ` +
            `vibrant profiles. Perfect for light, refreshing pint builds.`,
            [{ label: '🛍️ Browse Fruity Options', href: '/products' }]
          );
        }
      },
      {
        key: 'howto',
        corpus: 'how to guide tutorial instructions steps order process work use navigate',
        handler: function () {
          return withLinks(
            `<strong>📖 How to Order:</strong><br/><br/>` +
            `1️⃣ Browse products or use Build Your Box<br/>` +
            `2️⃣ Customize your flavour layers (3 or 4)<br/>` +
            `3️⃣ Add to cart and review items<br/>` +
            `4️⃣ Go to checkout, enter shipping info<br/>` +
            `5️⃣ Choose one-time or subscription plan<br/>` +
            `6️⃣ Review and confirm your order<br/>` +
            `7️⃣ Track your delivery from the Track Order page`,
            [{ label: '🛍️ Start Shopping', href: '/products' }, { label: '🛒 Cart', href: '/cart' }]
          );
        }
      }
    ];

    /* ── NLP Intent Matching ── */
    function rankIntents(userText) {
      const queryTokens = expandTokens(tokenize(userText));
      if (!queryTokens.length) {
        return [];
      }

      const domainSignals = collectDomainSignals(queryTokens);
      const ranked = [];

      intentDocs.forEach(intent => {
        const docTokens = expandTokens(tokenize(intent.corpus));
        let score = scoreByOverlap(queryTokens, docTokens);

        // Boost score when canonical synonym domains are present in both query and intent corpus.
        Object.keys(synonymGroups).forEach((domain) => {
          if (queryTokens.includes(domain) && docTokens.includes(domain)) {
            score += 0.06;
          }

          if ((domainSignals[domain] || 0) > 0 && docTokens.includes(domain)) {
            score += Math.min(0.12, domainSignals[domain] * 0.03);
          }
        });

        ranked.push({ intent, score });
      });

      return ranked
        .sort((a, b) => b.score - a.score)
        .filter((row, index) => {
          if (row.score < 0.09) {
            return false;
          }
          if (index === 0) {
            return true;
          }
          return row.score >= ranked[0].score * 0.72;
        })
        .slice(0, 3);
    }

    function getLinksForIntent(intentKey, contextText) {
      const linkMap = {
        flavours_list: [
          { label: '🍦 Flavour List', href: '/products' },
          { label: '🎨 Build Your Box', href: '/products#buildYourBox' }
        ],
        products_list: [
          { label: '🛍️ Product Catalog', href: '/products' },
          { label: '🛒 View Cart', href: '/cart' }
        ],
        shipping: [
          { label: '📦 Track Order', href: '/track-order' },
          { label: '📧 Shipping Help', href: '/contact' }
        ],
        subscription: [
          { label: '🔄 Subscription Checkout', href: '/checkout' },
          { label: '📋 My Orders', href: '/my-orders' }
        ],
        cart_checkout: [
          { label: '🛒 Open Cart', href: '/cart' },
          { label: '💳 Go To Checkout', href: '/checkout' }
        ],
        order_tracking: [
          { label: '📍 Track Order', href: '/track-order' },
          { label: '📋 Order History', href: '/my-orders' }
        ],
        wishlist: [
          { label: '💜 Wishlist', href: '/wishlist' },
          { label: '🛍️ Browse Products', href: '/products' }
        ],
        customization: [
          { label: '🎨 Build Your Box', href: '/products#buildYourBox' },
          { label: '🍨 Customizable Pints', href: '/products' }
        ],
        pricing: [
          { label: '💵 Product Pricing', href: '/products' },
          { label: '💳 Checkout Estimate', href: '/checkout' }
        ],
        support: [
          { label: '📧 Contact Support', href: '/contact' },
          { label: 'ℹ️ About ScoopCraft', href: '/about' }
        ],
        recommendation: [
          { label: '🌟 Recommended Picks', href: '/products' },
          { label: '🎁 Build A Combo Box', href: '/products#buildYourBox' }
        ]
      };

      const baseLinks = linkMap[intentKey] || [
        { label: '🛍️ Products', href: '/products' },
        { label: '📧 Contact', href: '/contact' }
      ];

      const querySource = String(contextText || state.context.lastEffectiveQuery || state.context.lastUserQuery || '').trim();
      const productLinks = getSpecificProductLinks(querySource, 2);
      return dedupeBy(baseLinks.concat(productLinks), (item) => `${item.label}:${item.href}`);
    }

    function ensureContextualLinks(answerHtml, rankedIntents) {
      if (String(answerHtml || '').includes('chatbot-links-row')) {
        return answerHtml;
      }

      const intents = Array.isArray(rankedIntents) ? rankedIntents : [];
      const primaryIntent = intents.length ? intents[0].intent : null;
      const links = primaryIntent ? getLinksForIntent(primaryIntent.key, state.context.lastEffectiveQuery) : getLinksForIntent('support', state.context.lastEffectiveQuery);
      return withLinks(answerHtml, links);
    }

    /* ── Helpers ── */
    function esc(val) { return escapeHtml(val); }

    function withLinks(text, links) {
      const htmlLinks = (links || []).map(item =>
        `<a href="${esc(item.href)}" class="chatbot-link">${item.label}</a>`
      ).join(' ');
      if (!htmlLinks) return text;
      return `${text}<div class="chatbot-links-row">${htmlLinks}</div>`;
    }

    const state = {
      customerName: userName,
      history: [],
      messages: [],
      context: {
        lastUserQuery: '',
        lastEffectiveQuery: '',
        lastIntentKey: '',
        lastDomains: [],
        lastProductNames: [],
        lastFlavourNames: []
      }
    };

    function resetContextState() {
      state.context = {
        lastUserQuery: '',
        lastEffectiveQuery: '',
        lastIntentKey: '',
        lastDomains: [],
        lastProductNames: [],
        lastFlavourNames: []
      };
    }

    function htmlToPlainText(html) {
      const div = document.createElement('div');
      div.innerHTML = String(html || '');
      return String(div.textContent || div.innerText || '').trim();
    }

    function persistChatState() {
      try {
        const payload = {
          savedAt: new Date().toISOString(),
          customerName: state.customerName || '',
          history: state.history.slice(-20),
          context: state.context,
          messages: state.messages.slice(-maxStoredMessages)
        };
        window.localStorage.setItem(chatStorageKey, JSON.stringify(payload));
      } catch (error) {
        // Ignore storage failures (private mode, disabled storage, quota exceeded).
      }
    }

    function restoreChatState() {
      try {
        const raw = window.localStorage.getItem(chatStorageKey);
        if (!raw) {
          return false;
        }

        const parsed = JSON.parse(raw);
        const savedMessages = Array.isArray(parsed?.messages) ? parsed.messages : [];
        if (!savedMessages.length) {
          return false;
        }

        state.customerName = String(parsed?.customerName || state.customerName || '');
        state.history = Array.isArray(parsed?.history) ? parsed.history.slice(-20) : [];
        if (parsed?.context && typeof parsed.context === 'object') {
          state.context = {
            ...state.context,
            ...parsed.context
          };
        }

        state.messages = [];
        body.innerHTML = '';
        savedMessages.slice(-maxStoredMessages).forEach((msg) => {
          if (!msg || !msg.role || !msg.html) {
            return;
          }
          appendMessage(msg.role, msg.html, {
            text: String(msg.text || htmlToPlainText(msg.html)),
            skipPersist: true
          });
        });
        return true;
      } catch (error) {
        return false;
      }
    }

    function setDefaultChatMessage() {
      state.messages = [];
      body.innerHTML = '';
      appendMessage('bot', defaultGreetingHtml, {
        text: htmlToPlainText(defaultGreetingHtml),
        skipPersist: true
      });
    }

    function clearChatState() {
      state.customerName = userName || '';
      state.history = [];
      resetContextState();
      setDefaultChatMessage();
      persistChatState();
    }

    function detectDomains(tokens) {
      return Object.keys(synonymGroups).filter((domain) => (tokens || []).includes(domain));
    }

    function isLikelyFollowUp(text) {
      const value = String(text || '').trim().toLowerCase();
      return (
        /^(and|also|what about|how about|then|now|okay|ok)\b/.test(value) ||
        /\b(those|them|that one|same|similar|another|more like|like that|ones)\b/.test(value)
      );
    }

    function buildEffectiveQueryText(text) {
      const safeText = String(text || '').trim();
      const currentTokens = expandTokens(tokenize(safeText));
      const explicitDomains = detectDomains(currentTokens);
      const followUp = isLikelyFollowUp(safeText);

      if (!followUp) {
        return safeText;
      }

      const baseContext = state.context.lastEffectiveQuery || state.context.lastUserQuery;
      if (!baseContext) {
        return safeText;
      }

      // Only borrow previous context when user asks a follow-up without clear fresh topic.
      if (explicitDomains.length === 0 || currentTokens.length <= 3) {
        return `${baseContext} ${safeText}`.trim();
      }

      return safeText;
    }

    function rememberContext(details) {
      const next = details || {};
      if (next.userQuery) {
        state.context.lastUserQuery = String(next.userQuery);
      }
      if (next.effectiveQuery) {
        state.context.lastEffectiveQuery = String(next.effectiveQuery);
      }
      if (next.intentKey) {
        state.context.lastIntentKey = String(next.intentKey);
      }
      if (Array.isArray(next.domains)) {
        state.context.lastDomains = next.domains.slice(0, 6);
      }
      if (Array.isArray(next.productNames)) {
        state.context.lastProductNames = next.productNames.slice(0, 10);
      }
      if (Array.isArray(next.flavourNames)) {
        state.context.lastFlavourNames = next.flavourNames.slice(0, 10);
      }
    }

    function isGreeting(text) {
      return /(^|\s)(hello|hi|hey|good morning|good evening|howdy|sup|yo)(\s|$)/i.test(text);
    }

    function isThanks(text) {
      return /(thanks|thank you|thx|appreciate)/i.test(text);
    }

    function appendMessage(role, html, options) {
      const opts = options || {};
      const row = document.createElement('div');
      row.className = `chatbot-msg ${role}`;
      row.innerHTML = `<p>${html}</p>`;
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;

      if (!opts.skipState) {
        state.messages.push({
          role: String(role || 'bot'),
          html: String(html || ''),
          text: String(opts.text || htmlToPlainText(html || '')).trim()
        });

        if (state.messages.length > maxStoredMessages) {
          state.messages = state.messages.slice(-maxStoredMessages);
        }
      }

      if (!opts.skipPersist) {
        persistChatState();
      }

      return row;
    }

    function plainTextToSafeHtml(text) {
      return esc(String(text || '')).replace(/\n/g, '<br/>');
    }

    function buildClientPageContext() {
      const title = document.title || '';
      const heading = (document.querySelector('h1') || {}).textContent || '';
      const productCards = Array.from(document.querySelectorAll('.product-card h3'))
        .slice(0, 8)
        .map((el) => String(el.textContent || '').trim())
        .filter(Boolean);

      return {
        pageTitle: title.trim(),
        heading: String(heading).trim(),
        pathname: window.location.pathname,
        search: window.location.search || '',
        topProductsOnPage: productCards
      };
    }

    function fetchAiReply(text) {
      return fetch('/api/chatbot/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: state.history.slice(-10),
          pathname: window.location.pathname,
          pageContext: buildClientPageContext()
        })
      })
        .then((res) => {
          if (!res.ok) {
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (!data || !data.success || !data.reply) {
            return null;
          }
          return String(data.reply).trim();
        })
        .catch(() => null);
    }

    function formatTrackingTimelineMessage(payload) {
      if (!payload || !payload.success) {
        return withLinks(
          'I could not load tracking details right now. Please try again or open the Track Order page.',
          [{ label: '📍 Track Order Page', href: '/track-order' }]
        );
      }

      if (!payload.signedIn) {
        return withLinks(
          '🔐 Please sign in to automatically track your latest order.',
          [
            { label: '🔑 Sign In', href: '/auth/signin' },
            { label: '📍 Track Order Page', href: '/track-order' }
          ]
        );
      }

      if (!payload.hasOrder || !payload.order) {
        return withLinks(
          'You do not have any orders yet. Place your first order, then I can track it here automatically.',
          [
            { label: '🛍️ Browse Products', href: '/products' },
            { label: '📍 Track Order Page', href: '/track-order' }
          ]
        );
      }

      const order = payload.order;
      const orderId = String(order.id || '').trim();
      const shortId = orderId ? orderId.slice(-8) : 'N/A';
      const placedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A';
      const total = Number(order.total || 0).toFixed(2);
      const itemCount = Number(order.itemCount || 0);
      const currentStatus = String(order.status || 'Placed');
      const allStatuses = ['Placed', 'Processing', 'Delivered'];
      const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : [];

      const statusInfo = allStatuses.map((status) => {
        const event = history.find((entry) => String(entry?.status || '') === status);
        const done = !!event;
        const icon = status === 'Placed' ? '📝' : status === 'Processing' ? '⚙️' : '✅';
        const marker = done ? '✅' : '⏳';
        const note = event && event.note ? String(event.note) : done ? 'Status updated' : 'Pending';
        const when = event && event.updatedAt ? ` (${new Date(event.updatedAt).toLocaleString()})` : '';
        return `${marker} <strong>${status}</strong> ${icon}<br/><span style="color:#5a7ba5">${esc(note)}${esc(when)}</span>`;
      }).join('<br/><br/>');

      const trackLink = orderId
        ? `/track-order?orderId=${encodeURIComponent(orderId)}`
        : '/track-order';

      return withLinks(
        `<strong>📦 Latest Order Tracked Automatically</strong><br/><br/>` +
        `<strong>Order:</strong> #${esc(shortId)}<br/>` +
        `<strong>Current Status:</strong> ${esc(currentStatus)}<br/>` +
        `<strong>Placed:</strong> ${esc(placedDate)}<br/>` +
        `<strong>Total:</strong> $${esc(total)}<br/>` +
        `<strong>Items:</strong> ${esc(itemCount)}<br/><br/>` +
        `<strong>Timeline</strong><br/><br/>${statusInfo}`,
        [
          { label: '📍 Open Track Order Page', href: trackLink },
          { label: '📋 My Orders', href: '/my-orders' }
        ]
      );
    }

    function getReply(text) {
      const safeText = String(text || '').trim();
      const effectiveQueryText = buildEffectiveQueryText(safeText);
      const expandedQueryTokens = expandTokens(tokenize(effectiveQueryText));
      const rankedIntents = rankIntents(effectiveQueryText);
      const primaryIntent = rankedIntents.length ? rankedIntents[0].intent : null;
      const predictiveFlavours = rankFlavoursByQuery(effectiveQueryText, 6).filter((row) => row.score >= 0.2).map((row) => row.flavour);
      const activeDomains = detectDomains(expandedQueryTokens);
      const pricingFocused = expandedQueryTokens.includes('pricing') || expandedQueryTokens.includes('cheap') || expandedQueryTokens.includes('cheaper') || expandedQueryTokens.includes('affordable') || expandedQueryTokens.includes('budget') || expandedQueryTokens.includes('lowest');
      const flavourContextOnly = (activeDomains.includes('flavours') || activeDomains.includes('recommendation')) && !activeDomains.includes('products');
      const requestedPriceRange = extractPriceRange(safeText) || extractPriceRange(effectiveQueryText);

      /* Name detection */
      const nameMatch = safeText.match(/my name is\s+([a-zA-Z]+)/i) || safeText.match(/i am\s+([a-zA-Z]+)/i);
      if (nameMatch) {
        state.customerName = nameMatch[1];
        rememberContext({
          userQuery: safeText,
          effectiveQuery: effectiveQueryText,
          domains: activeDomains
        });
        return `Nice to meet you, <strong>${esc(nameMatch[1])}</strong>! 😊 I can help with products, flavours, ordering, tracking, and more. What would you like to know?`;
      }

      /* Greetings */
      if (isGreeting(safeText)) {
        const name = state.customerName ? `, ${esc(state.customerName)}` : '';
        rememberContext({
          userQuery: safeText,
          effectiveQuery: effectiveQueryText,
          domains: []
        });
        return withLinks(
          `Hello${name}! 👋 I'm here to help with everything ScoopCraft. Ask about:<br/>` +
          `🍦 Flavours · 🛍️ Products · 🛒 Cart · 📦 Tracking · 🔄 Subscriptions`,
          [{ label: '🛍️ Products', href: '/products' }, { label: '📦 Track Order', href: '/track-order' }]
        );
      }

      /* Thanks */
      if (isThanks(safeText)) {
        rememberContext({
          userQuery: safeText,
          effectiveQuery: effectiveQueryText,
          domains: state.context.lastDomains
        });
        return withLinks(
          'Happy to help! 😊 Feel free to ask about anything else — flavours, products, orders, or shipping.',
          [{ label: '🛍️ Products', href: '/products' }, { label: '🎨 Build Box', href: '/products#buildYourBox' }]
        );
      }

      if (requestedPriceRange && siteKnowledge.products.length) {
        const relevanceScoreByName = new Map(
          rankProductsByQuery(effectiveQueryText, 50).map((row) => [String(row.product?.name || '').trim(), row.score])
        );

        const matchingRows = filterProductsByPrice(siteKnowledge.products, requestedPriceRange)
          .sort((left, right) => {
            const leftScore = relevanceScoreByName.get(String(left.product?.name || '').trim()) || 0;
            const rightScore = relevanceScoreByName.get(String(right.product?.name || '').trim()) || 0;
            if (rightScore !== leftScore) {
              return rightScore - leftScore;
            }
            return left.numericPrice - right.numericPrice;
          });

        if (matchingRows.length) {
          const productList = matchingRows
            .slice(0, 6)
            .map((row) => {
              const p = row.product;
              return `<strong>• ${esc(p.name)}</strong> — ${esc(toCurrency(row.numericPrice) || p.price || '')}<br/><span style="color:#5a7ba5">${esc((p.desc || '').substring(0, 90))}${(p.desc || '').length > 90 ? '...' : ''}</span>${p.link ? ` <a href="${esc(p.link)}">View</a>` : ''}`;
            })
            .join('<br/><br/>');

          const productLinks = getSpecificProductLinks(effectiveQueryText, 3);
          rememberContext({
            userQuery: safeText,
            effectiveQuery: effectiveQueryText,
            intentKey: 'pricing',
            domains: dedupeBy(activeDomains.concat(['pricing', 'products']), (item) => String(item || '')),
            productNames: matchingRows.slice(0, 10).map((row) => row.product.name)
          });

          return withLinks(
            `<strong>Products ${esc(formatPriceRangeLabel(requestedPriceRange))}:</strong><br/><br/>${productList}`,
            dedupeBy(productLinks.concat([
              { label: 'Open Full Catalog', href: '/products' },
              { label: 'Go to Cart', href: '/cart' }
            ]), (item) => `${item.label}:${item.href}`)
          );
        }

        const pricedRows = (siteKnowledge.products || [])
          .map((product) => parsePriceNumber(product.price))
          .filter((value) => Number.isFinite(value));

        const minPrice = pricedRows.length ? Math.min(...pricedRows) : null;
        const maxPrice = pricedRows.length ? Math.max(...pricedRows) : null;

        rememberContext({
          userQuery: safeText,
          effectiveQuery: effectiveQueryText,
          intentKey: 'pricing',
          domains: dedupeBy(activeDomains.concat(['pricing']), (item) => String(item || ''))
        });

        return withLinks(
          `I couldn't find products ${esc(formatPriceRangeLabel(requestedPriceRange))}.` +
          (minPrice !== null && maxPrice !== null ? ` Our current catalog is roughly ${esc(toCurrency(minPrice))} to ${esc(toCurrency(maxPrice))}.` : ''),
          [
            { label: 'Browse All Products', href: '/products' },
            { label: 'Build Your Box', href: '/products#buildYourBox' }
          ]
        );
      }

      // Follow-up pricing in flavour context: return cheapest matching products instead of repeating flavour descriptions.
      if (pricingFocused && flavourContextOnly) {
        const rankedProducts = rankProductsByQuery(effectiveQueryText, 12)
          .sort((a, b) => parsePriceNumber(a.product.price) - parsePriceNumber(b.product.price));

        const productList = rankedProducts
          .slice(0, 6)
          .map((row) => {
            const p = row.product;
            return `<strong>• ${esc(p.name)}</strong> — ${esc(p.price || '')}<br/><span style="color:#5a7ba5">${esc((p.desc || '').substring(0, 90))}${(p.desc || '').length > 90 ? '...' : ''}</span>${p.link ? ` <a href="${esc(p.link)}">View</a>` : ''}`;
          })
          .join('<br/><br/>');

        if (productList) {
          rememberContext({
            userQuery: safeText,
            effectiveQuery: effectiveQueryText,
            intentKey: 'pricing',
            domains: ['products', 'pricing'],
            productNames: rankedProducts.slice(0, 8).map((row) => row.product.name)
          });

          return withLinks(
            `<strong>Best lower-price matches for your request:</strong><br/><br/>${productList}`,
            [
              { label: 'Open Full Catalog', href: '/products' },
              { label: 'Go to Cart', href: '/cart' }
            ]
          );
        }
      }

      // NLP + synonyms: flavour-focused queries return matched flavour names with action links.
      if (expandedQueryTokens.includes('flavours') || expandedQueryTokens.includes('flavors') || predictiveFlavours.length) {
        const rankedFlavours = rankFlavoursByQuery(effectiveQueryText, 8);
        const matched = rankedFlavours.filter((row) => row.score > 0).map((row) => row.flavour);
        const flavourSeed = matched.length ? matched : predictiveFlavours;
        const flavourList = (flavourSeed.length ? flavourSeed : siteKnowledge.flavours.slice(0, 8)).map((flavour) => {
          return `<strong>• ${esc(flavour.name)}</strong><br/><span style="color:#5a7ba5">${esc(flavour.detail || flavour.note || 'Premium handcrafted flavour profile.')}</span>`;
        }).join('<br/><br/>');

        if (flavourList) {
          const flavourNames = (flavourSeed.length ? flavourSeed : siteKnowledge.flavours.slice(0, 8)).map((item) => item.name);
          const productLinks = getSpecificProductLinks(effectiveQueryText, 3);
          rememberContext({
            userQuery: safeText,
            effectiveQuery: effectiveQueryText,
            intentKey: primaryIntent ? primaryIntent.key : 'flavours_list',
            domains: activeDomains.length ? activeDomains : ['flavours'],
            flavourNames
          });
          const intro = expandedQueryTokens.includes('recommendation') || expandedQueryTokens.includes('recommend') || expandedQueryTokens.includes('best')
            ? '<strong>Best flavour matches for your question:</strong><br/><br/>'
            : '<strong>Available Flavours:</strong><br/><br/>';
          return withLinks(
            `${intro}${flavourList}`,
            dedupeBy(productLinks.concat([
              { label: 'View Flavour Products', href: '/products' },
              { label: 'Build Your Box', href: '/products#buildYourBox' }
            ]), (item) => `${item.label}:${item.href}`)
          );
        }
      }

      // NLP + synonyms: product-focused queries return best-matched product list with direct links.
      if (expandedQueryTokens.includes('products')) {
        const rankedProducts = rankProductsByQuery(effectiveQueryText, 8);

        if (pricingFocused && rankedProducts.length) {
          rankedProducts.sort((a, b) => parsePriceNumber(a.product.price) - parsePriceNumber(b.product.price));
        }

        const productList = rankedProducts
          .slice(0, 6)
          .map((row) => {
            const p = row.product;
            return `<strong>• ${esc(p.name)}</strong> — ${esc(p.price || '')}<br/><span style="color:#5a7ba5">${esc((p.desc || '').substring(0, 90))}${(p.desc || '').length > 90 ? '...' : ''}</span>${p.link ? ` <a href="${esc(p.link)}">View</a>` : ''}`;
          })
          .join('<br/><br/>');

        if (productList) {
          const productLinks = getSpecificProductLinks(effectiveQueryText, 3);
          rememberContext({
            userQuery: safeText,
            effectiveQuery: effectiveQueryText,
            intentKey: primaryIntent ? primaryIntent.key : 'products_list',
            domains: activeDomains.length ? activeDomains : ['products'],
            productNames: rankedProducts.slice(0, 8).map((row) => row.product.name)
          });
          const intro = expandedQueryTokens.includes('recommendation') || expandedQueryTokens.includes('recommend') || expandedQueryTokens.includes('best')
            ? '<strong>Top product suggestions for your question:</strong><br/><br/>'
            : '<strong>Best Product Matches:</strong><br/><br/>';
          return withLinks(
            `${intro}${productList}`,
            dedupeBy(productLinks.concat([
              { label: 'Open Full Catalog', href: '/products' },
              { label: 'Go to Cart', href: '/cart' }
            ]), (item) => `${item.label}:${item.href}`)
          );
        }
      }

      /* NLP intent matching */
      if (primaryIntent) {
        const intentAnswer = primaryIntent.handler();
        rememberContext({
          userQuery: safeText,
          effectiveQuery: effectiveQueryText,
          intentKey: primaryIntent.key,
          domains: activeDomains
        });
        return ensureContextualLinks(intentAnswer, rankedIntents);
      }

      /* Fallback */
      const nextBestHints = rankedIntents.slice(0, 2).map((row) => row.intent.key);
      const fallbackLinks = nextBestHints.length
        ? nextBestHints.flatMap((key) => getLinksForIntent(key)).slice(0, 4)
        : [
            { label: '🛍️ Products', href: '/products' },
            { label: '🛒 Cart', href: '/cart' },
            { label: '📦 Track Order', href: '/track-order' },
            { label: '📧 Contact', href: '/contact' }
          ];

      rememberContext({
        userQuery: safeText,
        effectiveQuery: effectiveQueryText,
        domains: activeDomains.length ? activeDomains : state.context.lastDomains
      });

      return withLinks(
        `I'm not sure about that specific question, but I can help with:<br/><br/>` +
        `🍦 <strong>Flavours</strong> — Ask "what flavours do you have?"<br/>` +
        `🛍️ <strong>Products</strong> — Ask "show me products"<br/>` +
        `📦 <strong>Orders</strong> — Ask "how to track my order"<br/>` +
        `🚚 <strong>Shipping</strong> — Ask "how does shipping work"<br/>` +
        `🔄 <strong>Subscriptions</strong> — Ask "how do subscriptions work"<br/>` +
        `💰 <strong>Pricing</strong> — Ask "what are your prices"`,
        dedupeBy(fallbackLinks, (item) => `${item.label}:${item.href}`)
      );
    }

    function replyWithTyping(text) {
      const typingNode = appendMessage('chatbot-typing', '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span> Thinking...', {
        skipState: true,
        skipPersist: true
      });
      setTimeout(function () {
        const localReply = getReply(text);

        fetchAiReply(text).then((aiReply) => {
          if (typingNode && typingNode.parentNode) {
            typingNode.parentNode.removeChild(typingNode);
          }

          if (aiReply) {
            const suggestedLinks = getLinksForIntent(state.context.lastIntentKey || 'support', text);
            const aiHtml = withLinks(plainTextToSafeHtml(aiReply), suggestedLinks);
            appendMessage('bot', aiHtml, { text: aiReply });
            state.history.push({ role: 'assistant', text: aiReply });
            if (state.history.length > 20) {
              state.history = state.history.slice(-20);
            }
            persistChatState();
            return;
          }

          appendMessage('bot', localReply, { text: htmlToPlainText(localReply) });
          state.history.push({ role: 'assistant', text: htmlToPlainText(localReply) });
          if (state.history.length > 20) {
            state.history = state.history.slice(-20);
          }
          persistChatState();
        });
      }, 400 + Math.random() * 300);
    }

    function askQuestion(text) {
      appendMessage('user', esc(text), { text: text });
      state.history.push({ role: 'user', text: text });
      if (state.history.length > 20) {
        state.history = state.history.slice(-20);
      }
      persistChatState();
      replyWithTyping(text);
    }

    function openChat() {
      panel.classList.add('open');
      input.focus();
    }

    function closeChat() {
      panel.classList.remove('open');
    }

    toggle.addEventListener('click', function () {
      panel.classList.contains('open') ? closeChat() : openChat();
    });

    if (close) {
      close.addEventListener('click', closeChat);
    }

    const header = panel.querySelector('.chatbot-header');
    if (header && !document.getElementById('chatbotClear')) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'chatbotClear';
      clearBtn.type = 'button';
      clearBtn.className = 'chatbot-clear';
      clearBtn.textContent = 'Clear';
      clearBtn.setAttribute('aria-label', 'Clear chat messages');
      clearBtn.addEventListener('click', function () {
        clearChatState();
        input.focus();
      });

      const closeBtn = document.getElementById('chatbotClose');
      if (closeBtn && closeBtn.parentNode === header) {
        header.insertBefore(clearBtn, closeBtn);
      } else {
        header.appendChild(clearBtn);
      }
    }

    if (!restoreChatState()) {
      setDefaultChatMessage();
      persistChatState();
    }

    promptButtons.forEach((button) => {
      button.addEventListener('click', function () {
        const action = String(button.getAttribute('data-action') || '').trim();
        if (action === 'track-order') {
          if (!panel.classList.contains('open')) openChat();

          appendMessage('user', 'Track my latest order automatically', {
            text: 'Track my latest order automatically'
          });

          const typingNode = appendMessage('chatbot-typing', '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span> Tracking your latest order...', {
            skipState: true,
            skipPersist: true
          });

          fetch('/api/chatbot/track-latest', {
            headers: {
              Accept: 'application/json'
            }
          })
            .then((res) => {
              if (!res.ok && res.status !== 401) {
                throw new Error('Track API failed');
              }
              return res.json();
            })
            .then((payload) => {
              const html = formatTrackingTimelineMessage(payload);
              appendMessage('bot', html, { text: htmlToPlainText(html) });
            })
            .catch(() => {
              const html = withLinks(
                'I could not track your order automatically right now. Please use the Track Order page.',
                [{ label: '📍 Track Order Page', href: '/track-order' }]
              );
              appendMessage('bot', html, { text: 'Could not track order automatically.' });
            })
            .finally(() => {
              if (typingNode && typingNode.parentNode) {
                typingNode.parentNode.removeChild(typingNode);
              }
              persistChatState();
            });
          return;
        }

        const question = button.getAttribute('data-question');
        if (!question) return;
        if (!panel.classList.contains('open')) openChat();
        askQuestion(question);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      askQuestion(text);
    });
  }

  function toggleWishlist(productId) {
    const btn = document.getElementById('addToWishlistBtn');
    const messageDiv = document.getElementById('wishlistMessage');

    if (!productId) {
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    const currentlyWishlisted = btn && btn.dataset.wishlisted === 'true';
    const endpoint = currentlyWishlisted ? `/wishlist/remove/${productId}` : `/wishlist/add/${productId}`;

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => {
        if (res.status === 401 || res.redirected) {
          window.location.href = '/auth/signin';
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) {
          return;
        }

        const nextState = !!data.isWishlisted;
        setWishlistButtonState(btn, nextState);

        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = data.success
            ? nextState
              ? 'Added to wishlist.'
              : 'Removed from wishlist.'
            : 'Could not update wishlist item.';
        }
      })
      .catch(() => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = 'Could not update wishlist item.';
        }
      })
      .finally(() => {
        if (btn) {
          btn.disabled = false;
          const isWishlisted = btn.dataset.wishlisted === 'true';
          setWishlistButtonState(btn, isWishlisted);
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupInfoPopup();
    setupFlavourDetailModal();
    setupScrollAnimations();
    setupClickableCards();
    setupHomepageFlavourSlider();
    setupFlavourLimiter('customAddToCartForm', 'scoopCount', 'selectedFlavours', 'productSelectionStatus', 'productSelectionHelp', 'addToCartBtn');
    setupCustomAddToCartForm();
    setupWishlistCardForms();
    setupWishlistToggleForm();
    setupCartDrawer();
    setupBuildYourBox();
    setupChatbotWidget();
  });

  window.toggleWishlist = toggleWishlist;
  window.addToWishlistCard = addToWishlistCard;
})();
