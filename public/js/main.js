// public/js/main.js
//
// Wires config + cart + catalog + generic UI helpers together and
// renders the actual product markup. This is the only module that
// knows about both the DOM structure of index.html and the shape of
// product data.

import { API_BASE, CATEGORIES, STORE_LOCATIONS, TESTIMONIALS } from './config.js';
import { Cart, formatPrice } from './cart.js';
import { fetchProducts, getProductById, isUsingDemoData } from './catalog.js';
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
// Rendering
// ---------------------------------------------------------------------

function categoryIconSvg(category) {
  const meta = CATEGORIES.find((c) => c.id === category);
  const icon = meta?.icon || 'shirt';
  return `<svg class="icon" aria-hidden="true"><use href="#icon-${icon}"></use></svg>`;
}

function productCardHTML(product) {
  return `
    <article class="product-card" data-reveal>
      <button class="product-card__media" data-quick-view="${product.id}" aria-label="Quick view ${product.name}">
        ${
          product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}" loading="lazy" />`
            : `<span class="product-card__placeholder product-card__placeholder--${product.category}">${categoryIconSvg(product.category)}</span>`
        }
        <span class="product-card__quickview">Quick view</span>
      </button>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3 class="product-card__name">${product.name}</h3>
        <div class="product-card__row">
          <span class="product-card__price">${formatPrice(product.price_cents, product.currency)}</span>
          <button class="btn btn--icon btn--add" data-add-to-cart="${product.id}" aria-label="Add ${product.name} to cart">
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
  container.innerHTML = CATEGORIES.map(
    (c) => `
    <a class="category-tile" href="#shop" data-filter-category="${c.id}" data-reveal>
      <span class="category-tile__icon">${categoryIconSvg(c.id)}</span>
      <span class="category-tile__label">${c.label}</span>
      <span class="category-tile__blurb">${c.blurb}</span>
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
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-map-pin"></use></svg>${s.address}</p>
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-clock"></use></svg>${s.hours}</p>
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-phone"></use></svg>${s.phone}</p>
    </div>
  `
  ).join('');
}

function renderTestimonials() {
  const track = document.querySelector('.testimonial-track');
  if (!track) return;
  track.innerHTML = TESTIMONIALS.map(
    (t) => `
    <div class="testimonial-card">
      <div class="testimonial-card__stars" aria-hidden="true">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
      <p class="testimonial-card__quote">“${t.quote}”</p>
      <p class="testimonial-card__author">${t.author} <span>${t.role}</span></p>
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
    el.cartItems.innerHTML = cart.items
      .map(
        (item) => `
      <div class="cart-item">
        <div class="cart-item__info">
          <strong>${item.name}</strong>
          <span class="cart-item__category">${item.category}</span>
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
      .join('');
    el.checkoutBtn.disabled = false;
  }

  el.cartTotal.textContent = formatPrice(cart.totalCents, cart.currency);
}

function renderQuickView(product) {
  if (!el.quickView) return;
  el.quickView.innerHTML = `
    <div class="quick-view__media">
      ${
        product.image_url
          ? `<img src="${product.image_url}" alt="${product.name}" />`
          : `<span class="product-card__placeholder product-card__placeholder--${product.category}">${categoryIconSvg(product.category)}</span>`
      }
    </div>
    <div class="quick-view__info">
      <span class="product-card__category">${product.category}${product.audience ? ` · ${product.audience}` : ''}</span>
      <h2>${product.name}</h2>
      <p class="quick-view__price">${formatPrice(product.price_cents, product.currency)}</p>
      <p class="quick-view__desc">${product.description || 'No description available yet.'}</p>
      <button class="btn btn--primary" data-add-to-cart="${product.id}" data-close-modal>Add to cart</button>
    </div>
  `;
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------

async function addToCart(id) {
  let product = getProductById(id);
  if (!product) {
    await fetchProducts();
    product = getProductById(id);
  }
  if (!product) return;
  cart.add(product);
  showToast(`Added “${product.name}” to your cart`);
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
    if (!res.ok) throw new Error('Checkout request failed');
    const { url } = await res.json();
    window.location.href = url;
  } catch (err) {
    console.error(err);
    el.checkoutState.textContent = isUsingDemoData()
      ? 'This is a demo catalog — connect the Hibretfamily backend to enable real checkout.'
      : 'Could not start checkout. Please try again in a moment.';
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

// ---------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------

function wireEvents({ cartDrawer, quickViewModal }) {
  document.body.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      addToCart(addBtn.dataset.addToCart);
      renderCart();
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

    const filterBtn = e.target.closest('[data-filter-category]');
    if (filterBtn) {
      e.preventDefault();
      activeCategory = filterBtn.dataset.filterCategory;
      syncPillState();
      renderGrid();
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
    showToast('Thanks for subscribing! Watch your inbox for Hibretfamily updates.');
    e.target.reset();
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

  renderCategoryTiles();
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
