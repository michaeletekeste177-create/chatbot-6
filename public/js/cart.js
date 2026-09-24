// public/js/cart.js
//
// Cart state, persisted to localStorage. A Stripe destination charge
// has exactly one payout destination, so a cart can only ever hold ONE
// seller's products at a time — adding a product from a different
// seller replaces the cart rather than mixing sellers into an order
// the backend would reject anyway (see server/routes/checkout.js).

const STORAGE_KEY = 'hibretfamily_cart_v2';

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
    this.sellerSwitchListeners = new Set();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Fired when adding a product silently clears a different seller's
  // items, so the UI can surface it (a toast, not a silent surprise).
  onSellerSwitch(fn) {
    this.sellerSwitchListeners.add(fn);
    return () => this.sellerSwitchListeners.delete(fn);
  }

  _emit() {
    save(this.items);
    this.listeners.forEach((fn) => fn(this));
  }

  get sellerId() {
    return this.items[0]?.sellerId || null;
  }

  add(product, quantity = 1) {
    if (this.items.length > 0 && this.sellerId && this.sellerId !== product.seller_id) {
      const previousSellerName = this.items[0].sellerName;
      this.items = [];
      this.sellerSwitchListeners.forEach((fn) => fn({ previousSellerName, product }));
    }

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
        sellerId: product.seller_id,
        sellerName: product.sellerName || '',
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
