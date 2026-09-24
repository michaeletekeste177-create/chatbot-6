// public/js/main.js
//
// Wires config + cart + catalog + generic UI helpers together and
// renders the actual product markup. This is the only module that
// knows both the DOM structure of index.html and the shape of
// product data.
//
// Hibretfamily is a multi-vendor marketplace: every product belongs
// to a seller, and checkout is a single Stripe destination charge, so
// a cart can only ever hold one seller's items at a time (see
// public/js/cart.js). Checkout hands off to Stripe's own hosted page;
// nothing here ever sees a card number.

import { API_BASE, CATEGORIES, DEPARTMENTS, STORE_LOCATIONS, TESTIMONIALS } from './config.js';
import { Cart, formatPrice } from './cart.js';
import { fetchProducts, getProductById, isUsingDemoData } from './catalog.js';
import { t, initLanguageToggle } from './i18n.js';
import {
  initHeaderScroll,
  initMobileNav,
  initDrawer,
  initModal,
  initScrollReveal,
  initHeroSlider,
  initTestimonialSlider,
  initBackToTop,
  showToast,
} from './ui.js';

const cart = new Cart();
let activeCategory = '';
let activeAudience = '';

const el = {
  grid: document.getElementById('product-grid'),
  gridState: document.getElementById('grid-state'),
  categoryPills: document.getElementById('category-pills'),
  audiencePills: document.getElementById('audience-pills'),
  cartItems: document.getElementById('cart-items'),
  cartTotal: document.getElementById('cart-total'),
  cartCount: document.querySelectorAll('.cart-count'),
  checkoutBtn: document.getElementById('checkout-button'),
  checkoutState: document.getElementById('checkout-state'),
  quickView: document.getElementById('quick-view-body'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  newsletterForm: document.getElementById('newsletter-form'),
  demoBanner: document.getElementById('demo-banner'),
  yearEl: document.getElementById('current-year'),
};

// ---------------------------------------------------------------------
// Label helpers (translated where we have a mapping, raw fallback)
// ---------------------------------------------------------------------

function categoryIconSvg(category) {
  const meta = CATEGORIES.find((c) => c.id === category);
  const icon = meta?.icon || 'shirt';
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${icon}"></use></svg>`;
}

function categoryLabel(category) {
  return t(`cat_${category}`);
}

function audienceLabel(audience) {
  if (!audience) return '';
  return t(`aud_${audience}`);
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function productCardHTML(product) {
  const audienceTag = product.audience && product.audience !== 'unisex' ? audienceLabel(product.audience) : '';
  return `
    <article class="product-card" data-reveal>
      <button class="product-card__media" data-quick-view="${product.id}" aria-label="Quick view ${product.name}">
        ${
          product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy" />`
            : `<span class="product-card__placeholder product-card__placeholder--${product.category}">${categoryIconSvg(product.category)}</span>`
        }
        ${audienceTag ? `<span class="product-card__audience">${audienceTag}</span>` : ''}
        <span class="product-card__quickview">Quick view</span>
      </button>
      <div class="product-card__body">
        <span class="product-card__category">${categoryLabel(product.category)}</span>
        <h3 class="product-card__name">${product.name}</h3>
        ${product.sellerName ? `<span class="product-card__seller">${product.sellerName}</span>` : ''}
        <div class="product-card__row">
          <span class="price-tag">${formatPrice(product.price_cents, product.currency)}</span>
          <button class="btn btn--icon btn--add" data-add-to-cart="${product.id}" aria-label="${t('add_to_cart')}: ${product.name}">
            <svg class="icon" aria-hidden="true"><use href="#icon-cart"></use></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

async function renderGrid() {
  if (!el.grid) return;
  el.grid.setAttribute('aria-busy', 'true');
  el.gridState.textContent = 'Loading products…';
  el.gridState.hidden = false;
  el.grid.innerHTML = '';

  const products = await fetchProducts({ category: activeCategory, audience: activeAudience });

  if (isUsingDemoData() && el.demoBanner) {
    el.demoBanner.hidden = false;
  }

  if (products.length === 0) {
    el.gridState.textContent = 'No products in this selection yet — try another category.';
    el.grid.setAttribute('aria-busy', 'false');
    return;
  }

  el.gridState.hidden = true;
  el.grid.innerHTML = products.map(productCardHTML).join('');
  el.grid.setAttribute('aria-busy', 'false');
  initScrollReveal();
}

function renderCategoryTiles() {
  const container = document.getElementById('category-tiles');
  if (!container) return;
  container.innerHTML = DEPARTMENTS.map(
    (d) => `
    <a class="category-tile category-tile--${d.id} dept-link" href="#shop" data-category="${d.category}" data-audience="${d.audience}" data-reveal>
      <span class="category-tile__icon">${categoryIconSvg(d.category || 'apparel')}</span>
      <span class="category-tile__text">
        <span class="category-tile__label">${t(d.labelKey)}</span>
        <span class="category-tile__blurb">${t(d.blurbKey)}</span>
      </span>
      <span class="category-tile__cta">Shop now <svg class="icon icon--sm"><use href="#icon-arrow-right"></use></svg></span>
    </a>
  `
  ).join('');
}

function renderAdBannerCategories() {
  const container = document.getElementById('ad-banner-categories');
  if (!container) return;
  container.innerHTML = DEPARTMENTS.map(
    (d) => `
    <a class="ad-banner__chip dept-link" href="#shop" data-category="${d.category}" data-audience="${d.audience}">
      ${categoryIconSvg(d.category || 'apparel')}
      <span>${t(d.labelKey)}</span>
    </a>
  `
  ).join('');
}

function renderStoreLocations() {
  const container = document.getElementById('store-list');
  if (!container) return;
  container.innerHTML = STORE_LOCATIONS.map(
    (s) => `
    <div class="store-card" data-reveal>
      <h3>${s.name}</h3>
      ${s.honorTi ? `<p class="store-card__honor" lang="ti">${s.honorTi}</p>` : ''}
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-map-pin"></use></svg>${s.address}${s.addressTi ? ` <span class="store-card__gloss" lang="ti">(${s.addressTi})</span>` : ''}</p>
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-clock"></use></svg>${s.hours}</p>
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-phone"></use></svg>${s.phone}</p>
    </div>
  `
  ).join('');
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function renderTestimonials() {
  const track = document.querySelector('.testimonial-track');
  if (!track) return;
  track.innerHTML = TESTIMONIALS.map(
    (tm) => `
    <div class="testimonial-card">
      <span class="testimonial-card__quotemark" aria-hidden="true">“</span>
      <div class="testimonial-card__stars" aria-hidden="true">
        ${Array.from({ length: 5 }, (_, i) => `<svg class="icon icon--sm ${i < tm.rating ? 'is-filled' : 'is-empty'}"><use href="#icon-star"></use></svg>`).join('')}
      </div>
      <p class="testimonial-card__quote">${tm.quote}</p>
      <div class="testimonial-card__byline">
        <span class="testimonial-card__avatar">${initials(tm.author)}</span>
        <p class="testimonial-card__author">${tm.author} <span>${tm.role}</span></p>
      </div>
    </div>
  `
  ).join('');
}

function renderCart() {
  el.cartCount.forEach((elm) => (elm.textContent = String(cart.count)));

  if (cart.items.length === 0) {
    el.cartItems.innerHTML = '<p class="state-message">Your cart is empty. Start shopping to add items.</p>';
    el.checkoutBtn.disabled = true;
  } else {
    el.cartItems.innerHTML = `
      ${cart.items[0]?.sellerName ? `<p class="cart-drawer__seller">Seller: <strong>${cart.items[0].sellerName}</strong></p>` : ''}
      ${cart.items
        .map(
          (item) => `
      <div class="cart-item">
        <div class="cart-item__info">
          <strong>${item.name}</strong>
          <span class="cart-item__category">${categoryLabel(item.category)}</span>
        </div>
        <div class="cart-item__controls">
          <button class="qty-btn" data-qty="-1" data-id="${item.productId}" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-qty="1" data-id="${item.productId}" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-item__price">${formatPrice(item.price_cents * item.quantity, item.currency)}</div>
        <button class="cart-item__remove" data-remove="${item.productId}" aria-label="Remove ${item.name}">
          <svg class="icon icon--sm" aria-hidden="true"><use href="#icon-close"></use></svg>
        </button>
      </div>
    `
        )
        .join('')}
    `;
    el.checkoutBtn.disabled = false;
  }

  el.cartTotal.textContent = formatPrice(cart.totalCents, cart.currency);
}

function renderQuickView(product) {
  if (!el.quickView) return;
  const audienceTag = audienceLabel(product.audience);
  el.quickView.innerHTML = `
    <div class="quick-view__media">
      ${
        product.image_url
          ? `<img src="${product.image_url}" alt="${product.name}" />`
          : `<span class="product-card__placeholder product-card__placeholder--${product.category}">${categoryIconSvg(product.category)}</span>`
      }
    </div>
    <div class="quick-view__info">
      <span class="product-card__category">${categoryLabel(product.category)}${audienceTag && product.audience !== 'unisex' ? ` · ${audienceTag}` : ''}</span>
      <h2>${product.name}</h2>
      ${product.sellerName ? `<p class="quick-view__seller">Sold by <strong>${product.sellerName}</strong></p>` : ''}
      <p class="price-tag price-tag--lg">${formatPrice(product.price_cents, product.currency)}</p>
      <button class="btn btn--primary" data-add-to-cart="${product.id}" data-close-modal>${t('add_to_cart')}</button>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------

// Set true by the onSellerSwitch handler in wireEvents() for the
// duration of one cart.add() call, so addToCart() below knows to skip
// the routine "Added to cart" toast — otherwise it immediately
// overwrites the more important "cart was cleared" warning, since
// both use the same single toast element.
let justSwitchedSeller = false;

async function addToCart(id) {
  let product = getProductById(id);
  if (!product) {
    await fetchProducts();
    product = getProductById(id);
  }
  if (!product) return;
  justSwitchedSeller = false;
  cart.add(product);
  if (!justSwitchedSeller) {
    showToast(`Added “${product.name}” to your cart`);
  }
}

function animateAddButton(btn) {
  const use = btn.querySelector('use');
  if (!use) return;
  const original = use.getAttribute('href');
  btn.classList.add('btn--added');
  use.setAttribute('href', '#icon-check');
  setTimeout(() => {
    btn.classList.remove('btn--added');
    use.setAttribute('href', original);
  }, 1100);
}

async function startCheckout() {
  if (cart.items.length === 0) return;
  el.checkoutBtn.disabled = true;
  el.checkoutState.textContent = 'Redirecting to secure checkout…';
  el.checkoutState.hidden = false;

  try {
    const res = await fetch(`${API_BASE}/checkout/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Checkout request failed');
    }
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error(err);
    el.checkoutState.textContent = isUsingDemoData()
      ? 'This is a demo catalog — connect the Hibretfamily backend to enable real checkout.'
      : err.message || 'Could not start checkout. Please try again in a moment.';
    el.checkoutBtn.disabled = false;
  }
}

function handleSearch(query) {
  if (!el.searchResults) return;
  if (!query.trim()) {
    el.searchResults.innerHTML = '';
    el.searchResults.hidden = true;
    return;
  }
  import('./catalog.js').then(({ searchProducts }) => {
    const results = searchProducts(query).slice(0, 6);
    el.searchResults.hidden = false;
    el.searchResults.innerHTML = results.length
      ? results
          .map(
            (p) => `
        <button class="search-result" data-quick-view="${p.id}">
          <span>${p.name}</span>
          <span class="search-result__price">${formatPrice(p.price_cents, p.currency)}</span>
        </button>
      `
          )
          .join('')
      : '<p class="state-message">No matches found.</p>';
  });
}

const NEWSLETTER_KEY = 'hibretfamily_newsletter_subscribers';

function subscribeToNewsletter(email) {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) || '[]');
  } catch {
    list = [];
  }
  const alreadySubscribed = list.includes(email);
  if (!alreadySubscribed) {
    list.push(email);
    try {
      localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(list));
    } catch {
      // ignore — subscription still "succeeds" for this session
    }
  }
  return { alreadySubscribed };
}

// ---------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------

function wireEvents({ cartDrawer, quickViewModal }) {
  cart.onSellerSwitch(({ previousSellerName, product }) => {
    justSwitchedSeller = true;
    showToast(
      `A cart can only hold one seller's items — cleared ${previousSellerName || 'the previous seller'}'s items and added “${product.name}” from ${product.sellerName || 'this seller'}.`
    );
  });

  document.body.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      addToCart(addBtn.dataset.addToCart);
      if (addBtn.classList.contains('btn--icon')) animateAddButton(addBtn);
      return;
    }

    const quickViewBtn = e.target.closest('[data-quick-view]');
    if (quickViewBtn) {
      const product = getProductById(quickViewBtn.dataset.quickView);
      if (product) {
        renderQuickView(product);
        quickViewModal.open();
      }
      return;
    }

    const deptTile = e.target.closest('.dept-link[data-category][data-audience]');
    if (deptTile) {
      e.preventDefault();
      activeCategory = deptTile.dataset.category;
      activeAudience = deptTile.dataset.audience;
      syncPillState();
      renderGrid();
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const filterBtn = e.target.closest('[data-filter-category]');
    if (filterBtn) {
      e.preventDefault();
      activeCategory = filterBtn.dataset.filterCategory;
      activeAudience = '';
      syncPillState();
      renderGrid();
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      cart.remove(removeBtn.dataset.remove);
      return;
    }

    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const item = cart.items.find((i) => i.productId === qtyBtn.dataset.id);
      if (item) cart.updateQuantity(item.productId, item.quantity + Number(qtyBtn.dataset.qty));
    }
  });

  el.categoryPills?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    syncPillState();
    renderGrid();
  });

  el.audiencePills?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-audience]');
    if (!btn) return;
    activeAudience = btn.dataset.audience;
    syncPillState();
    renderGrid();
  });

  el.checkoutBtn?.addEventListener('click', startCheckout);
  cart.onChange(renderCart);

  el.searchForm?.addEventListener('submit', (e) => e.preventDefault());
  el.searchInput?.addEventListener('input', (e) => handleSearch(e.target.value));
  document.addEventListener('click', (e) => {
    if (el.searchResults && !e.target.closest('.search-box')) {
      el.searchResults.hidden = true;
    }
  });

  el.newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[type="email"]');
    const email = input?.value.trim();
    if (!email) return;

    const { alreadySubscribed } = subscribeToNewsletter(email);
    const form = e.target;
    const successEl = document.getElementById('newsletter-success');
    form.hidden = true;
    if (successEl) {
      successEl.hidden = false;
      successEl.textContent = alreadySubscribed
        ? `${email} is already on the list — thanks for being a Hibretfamily regular!`
        : `You're in! We'll send new arrivals and offers to ${email}.`;
    }
    showToast(alreadySubscribed ? 'Already subscribed' : 'Subscribed to Hibretfamily updates');
  });

  document.addEventListener('languagechange', () => {
    renderCategoryTiles();
    renderAdBannerCategories();
    renderGrid();
    renderCart();
  });
}

function syncPillState() {
  el.categoryPills?.querySelectorAll('[data-category]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === activeCategory);
  });
  el.audiencePills?.querySelectorAll('[data-audience]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.audience === activeAudience);
  });
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

function init() {
  if (el.yearEl) el.yearEl.textContent = String(new Date().getFullYear());

  initLanguageToggle();

  renderCategoryTiles();
  renderAdBannerCategories();
  renderStoreLocations();
  renderTestimonials();
  renderCart();
  renderGrid();

  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initHeroSlider('hero-slider');
  initTestimonialSlider('testimonials');
  initBackToTop();

  const cartDrawer = initDrawer({ toggleId: 'cart-toggle', drawerId: 'cart-drawer', closeId: 'cart-close' });
  const quickViewModal = initModal('quick-view-modal');

  wireEvents({ cartDrawer, quickViewModal });
}

document.addEventListener('DOMContentLoaded', init);
