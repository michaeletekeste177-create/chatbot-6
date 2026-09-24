// public/js/i18n.js
//
// Minimal English/Eritrean-Tigrinya toggle for navigation and
// department labels. Anything marked `data-i18n="key"` in the DOM
// gets its text swapped on language change; anything rendered
// dynamically (department cards, product category chips) should call
// `t(key)` itself and re-render on the `languagechange` event.
//
// Internally the language code stays the short 'ti' (matches
// I18N/localStorage/data-lang everywhere), but the `<html lang>`
// attribute we publish is the fuller BCP47 tag 'ti-ER' — Tigrinya as
// used in Eritrea — so browsers, screen readers and search engines see
// the country context explicitly.

import { I18N } from './config.js';

const STORAGE_KEY = 'hibretfamily_lang';
const HTML_LANG_TAG = { en: 'en', ti: 'ti-ER' };
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
  document.documentElement.lang = HTML_LANG_TAG[lang] || lang;
  applyTranslations();
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

export function initLanguageToggle() {
  document.documentElement.lang = HTML_LANG_TAG[currentLang] || currentLang;
  applyTranslations();
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}
