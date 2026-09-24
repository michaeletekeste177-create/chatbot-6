// public/js/contact-widget.js
//
// A floating "Contact us" button, shown on every page. This is the
// simple version of customer support: two direct links (WhatsApp,
// email) — no in-page live chat, no support ticket system. Update
// SITE.phone / SITE.email in config.js with your real details before
// launch; the demo values here are placeholders.

import { SITE } from './config.js';

function whatsappUrl(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

export function initContactWidget() {
  if (document.getElementById('contact-widget')) return;

  const wrap = document.createElement('div');
  wrap.className = 'contact-widget';
  wrap.id = 'contact-widget';
  wrap.innerHTML = `
    <div class="contact-widget__menu" id="contact-widget-menu" hidden>
      <a href="${whatsappUrl(SITE.phone)}" target="_blank" rel="noopener" class="contact-widget__link">
        <span class="contact-widget__icon">💬</span> WhatsApp
      </a>
      <a href="mailto:${SITE.email}" class="contact-widget__link">
        <span class="contact-widget__icon">✉️</span> Email
      </a>
    </div>
    <button type="button" class="contact-widget__toggle" id="contact-widget-toggle" aria-label="Contact us" aria-expanded="false">
      <span class="contact-widget__icon">💬</span>
    </button>
  `;
  document.body.appendChild(wrap);

  const toggle = document.getElementById('contact-widget-toggle');
  const menu = document.getElementById('contact-widget-menu');
  toggle.addEventListener('click', () => {
    const isOpen = !menu.hidden;
    menu.hidden = isOpen;
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });
}

document.addEventListener('DOMContentLoaded', initContactWidget);
