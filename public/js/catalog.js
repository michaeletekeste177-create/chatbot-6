// public/js/catalog.js
//
// Loads the product catalog from the backend. If the backend can't be
// reached (e.g. previewing the frontend before the backend is
// deployed), falls back to DEMO_PRODUCTS so the storefront still
// looks and works fully — every demo item is clearly flagged
// (`demo: true`) so real integrations are never confused with it.

import { API_BASE, DEMO_PRODUCTS } from './config.js';

let cache = null;
let usingDemoData = false;

export async function fetchProducts({ category = '', audience = '' } = {}) {
  if (!cache) {
    cache = await loadAll();
  }

  return cache.filter((p) => {
    if (category && p.category !== category) return false;
    if (audience && p.audience && p.audience !== audience && p.audience !== 'unisex') return false;
    return true;
  });
}

export function isUsingDemoData() {
  return usingDemoData;
}

export function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q || !cache) return [];
  return cache.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
  );
}

export function getProductById(id) {
  return (cache || []).find((p) => p.id === id);
}

async function loadAll() {
  try {
    const res = await fetch(`${API_BASE}/products?limit=100`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const { products } = await res.json();
    if (!Array.isArray(products) || products.length === 0) throw new Error('Empty catalog');
    usingDemoData = false;
    return products;
  } catch (err) {
    console.warn('[Hibretfamily] Falling back to demo catalog — backend not reachable:', err.message);
    usingDemoData = true;
    return DEMO_PRODUCTS;
  }
}
