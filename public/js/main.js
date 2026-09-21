// public/js/main.js
//
// Wires config + catalog + generic UI helpers together and renders
// the actual product markup. This is the only module that knows both
// the DOM structure of index.html and the shape of product data.
//
// Hibretfamily is an affiliate storefront: there is no cart, no
// checkout, no price of our own to show. Every product card is just a
// curated pointer — clicking "Shop Now / ሕጂ ዓድግ" sends the shopper
// straight to the external store (through our click-tracking redirect
// when a real backend is connected; straight to the demo link when
// previewing offline — see shopUrl() below).

import { API_BASE, CATEGORIES, DEPARTMENTS, STORE_LOCATIONS, TESTIMONIALS } from './config.js';
import { fetchProducts, getProductById, isUsingDemoData } from './catalog.js';
import { t, initLanguageToggle } from './i18n.js';
import {
  initHeaderScroll,
  initMobileNav,
  initModal,
  initScrollReveal,
  initHeroSlider,
  initTestimonialSlider,
  initBackToTop,
  showToast,
} from './ui.js';

let activeCategory = '';
let activeAudience = '';

const el = {
  grid: document.getElementById('product-grid'),
  gridState: document.getElementById('grid-state'),
  categoryPills: document.getElementById('category-pills'),
  audiencePills: document.getElementById('audience-pills'),
  quickView: document.getElementById('quick-view-body'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  searchResults: document.getElementById('search-results'),
  newsletterForm: document.getElementById('newsletter-form'),
  demoBanner: document.getElementById('demo-banner'),
  yearEl: document.getElementById('current-year'),
};

// ---------------------------------------------------------------------
// Label & link helpers (translated where we have a mapping, raw fallback)
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

// Demo products carry their own (Amazon search) link and have no
// backend to proxy through; real catalog products never expose their
// affiliate_url to the browser at all (see server/routes/products.js)
// — clicking always goes through the click-tracking redirect instead.
function shopUrl(product) {
  return product.demo ? product.affiliate_url : `${API_BASE}/track-click?productId=${encodeURIComponent(product.id)}`;
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function shopNowLinkHTML(product, { bilingual = false, extraClass = '' } = {}) {
  const label = bilingual
    ? `<span>Shop Now</span><span class="cta-divider" aria-hidden="true">/</span><span lang="ti">ሕጂ ዓድግ</span>`
    : `<span>${t('shop_now')}</span>`;
  return `
    <a class="btn btn--accent shop-now-link ${extraClass}" href="${shopUrl(product)}" target="_blank" rel="noopener noreferrer sponsored" aria-label="${t('shop_now')}: ${product.name}">
      <svg class="icon icon--sm" aria-hidden="true"><use href="#icon-external"></use></svg>
      ${label}
    </a>
  `;
}

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
        ${shopNowLinkHTML(product, { extraClass: 'btn--block' })}
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
      <p><svg class="icon icon--sm" aria-hidden="true"><use href="#icon-map-pin"></use></svg>${s.address}</p>
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
      <p class="quick-view__desc">Available now from a trusted external retailer. Clicking through opens their site in a new tab, where you'll complete your purchase directly with them.</p>
      ${shopNowLinkHTML(product, { bilingual: true, extraClass: 'quick-view__cta' })}
    </div>
  `;
  el.quickView.querySelector('.shop-now-link')?.setAttribute('data-close-modal', '');
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------

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
          <span class="search-result__category">${categoryLabel(p.category)}</span>
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

function wireEvents({ quickViewModal }) {
  document.body.addEventListener('click', (e) => {
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
  renderGrid();

  initHeaderScroll();
  initMobileNav();
  initScrollReveal();
  initHeroSlider('hero-slider');
  initTestimonialSlider('testimonials');
  initBackToTop();

  const quickViewModal = initModal('quick-view-modal');

  wireEvents({ quickViewModal });
}

document.addEventListener('DOMContentLoaded', init);
