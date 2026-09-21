// public/js/i18n.js
//
// Minimal English/Tigrinya toggle for navigation and department labels.
// Anything marked `data-i18n="key"` in the DOM gets its text swapped on
// language change; anything rendered dynamically (department cards,
// product category chips) should call `t(key)` itself and re-render on
// the `languagechange` event.

import { I18N } from './config.js';

const STORAGE_KEY = 'hibretfamily_lang';
let currentLang = safeGet() || 'en';

function safeGet() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore — language just won't persist across visits
  }
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  return I18N[currentLang]?.[key] ?? I18N.en[key] ?? key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

export function setLang(lang) {
  if (!I18N[lang] || lang === currentLang) return;
  currentLang = lang;
  safeSet(lang);
  document.documentElement.lang = lang === 'ti' ? 'ti' : 'en';
  applyTranslations();
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

export function initLanguageToggle() {
  document.documentElement.lang = currentLang === 'ti' ? 'ti' : 'en';
  applyTranslations();
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}
