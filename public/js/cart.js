// public/js/cart.js
//
// Cart state, persisted to localStorage. Holds only what's needed to
// render the drawer and to send { productId, quantity } pairs to the
// backend at checkout — prices are always re-verified server-side,
// so nothing here needs to be trusted.

const STORAGE_KEY = 'hibretfamily_cart_v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode, quota) — cart just won't persist.
  }
}

export class Cart {
  constructor() {
    this.items = load();
    this.listeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    save(this.items);
    this.listeners.forEach((fn) => fn(this));
  }

  add(product, quantity = 1) {
    const existing = this.items.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        productId: product.id,
        name: product.name,
        price_cents: product.price_cents,
        currency: product.currency || 'usd',
        category: product.category,
        quantity,
      });
    }
    this._emit();
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find((i) => i.productId === productId);
    if (!item) return;
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    item.quantity = quantity;
    this._emit();
  }

  remove(productId) {
    this.items = this.items.filter((i) => i.productId !== productId);
    this._emit();
  }

  clear() {
    this.items = [];
    this._emit();
  }

  get count() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  get totalCents() {
    return this.items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
  }

  get currency() {
    return this.items[0]?.currency || 'usd';
  }
}

export function formatPrice(cents, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((cents || 0) / 100);
}
