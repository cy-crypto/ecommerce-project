(function () {
  'use strict';

  if (typeof document === 'undefined') {
    return;
  }

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

    function getTier() {
      const selectedTier = tierInputs.find((input) => input.checked);
      return selectedTier ? Number(selectedTier.value) : 3;
    }

    function getSelectedFlavours() {
      return flavourInputs.filter((input) => input.checked);
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
          messageDiv.textContent = data && data.success ? 'Added to cart.' : 'Could not add item.';
        }
      })
      .catch(() => {
        if (messageDiv) {
          messageDiv.style.display = 'block';
          messageDiv.textContent = 'Could not add item.';
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
        trigger.textContent = 'Wishlisted';
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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

    const faq = [
      {
        pattern: /(wishlist|save)/i,
        answer: 'To use wishlist, open any product and tap Add to Wishlist. You can view saved items from the Wishlist link in the top menu.'
      },
      {
        pattern: /(recommend|best|popular|suggest)/i,
        answer: 'Top picks right now: Midnight Cocoa Swirl, Hazelnut Praline, and Vanilla Berry Ripple. They are great first-time choices.'
      },
      {
        pattern: /(delivery|shipping|plan|subscription)/i,
        answer: 'You can choose One-Time Order or Weekly Subscription during checkout. Shipping is calculated in your order summary.'
      },
      {
        pattern: /(price|cost|how much)/i,
        answer: 'Most pints are in the $9.95 to $12.15 range depending on flavour profile and rarity.'
      },
      {
        pattern: /(flavour|flavor|scoop|custom)/i,
        answer: 'Each pint supports custom flavour selection. Pick a product and choose your 3 or 4 flavour mix before adding to cart.'
      },
      {
        pattern: /(cart|checkout|payment|coupon)/i,
        answer: 'After adding products, open Cart to review quantities, then Checkout to confirm shipping details, order plan, and optional coupon code.'
      },
      {
        pattern: /(order|track|status)/i,
        answer: 'After signing in, open My Orders from the header to track your order history and current status.'
      },
      {
        pattern: /(admin|dashboard|manage)/i,
        answer: 'If your account is Admin or Manager, use the Dashboard link in the header to manage products, orders, users, and SEO settings.'
      },
      {
        pattern: /(support|contact|help|issue)/i,
        answer: 'You can reach support from the Contact page. Include your email and order details so we can resolve issues quickly.'
      },
      {
        pattern: /(hello|hi|hey)/i,
        answer: 'Hi! I can help with products, flavours, wishlist, cart, checkout, and order tracking.'
      },
      {
        pattern: /(thank|thanks)/i,
        answer: 'Happy to help. If you want, I can suggest a 3-flavour and 4-flavour combo next.'
      }
    ];

    function appendMessage(role, text) {
      const row = document.createElement('div');
      row.className = `chatbot-msg ${role}`;
      row.innerHTML = `<p>${escapeHtml(text)}</p>`;
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      return row;
    }

    function getReply(text) {
      const match = faq.find((item) => item.pattern.test(text));
      return match
        ? match.answer
        : 'I can help with recommendations, flavours, wishlist, shipping, checkout, subscriptions, and order tracking. Try one of the quick buttons.';
    }

    function replyWithTyping(text) {
      const typingNode = appendMessage('chatbot-typing', 'Assistant is typing...');
      window.setTimeout(function () {
        if (typingNode && typingNode.parentNode) {
          typingNode.parentNode.removeChild(typingNode);
        }
        appendMessage('bot', getReply(text));
      }, 260);
    }

    function askQuestion(text) {
      appendMessage('user', text);
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
      if (panel.classList.contains('open')) {
        closeChat();
      } else {
        openChat();
      }
    });

    if (close) {
      close.addEventListener('click', closeChat);
    }

    promptButtons.forEach((button) => {
      button.addEventListener('click', function () {
        const question = button.getAttribute('data-question');
        if (!question) {
          return;
        }

        if (!panel.classList.contains('open')) {
          openChat();
        }
        askQuestion(question);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) {
        return;
      }

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
    setupFlavourLimiter('customAddToCartForm', 'scoopCount', 'selectedFlavours', 'productSelectionStatus', 'productSelectionHelp', 'addToCartBtn');
    setupCustomAddToCartForm();
    setupWishlistCardForms();
    setupWishlistToggleForm();
    setupChatbotWidget();
  });

  window.toggleWishlist = toggleWishlist;
  window.addToWishlistCard = addToWishlistCard;
})();
