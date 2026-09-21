// public/js/ui.js
//
// Generic, DOM-only interaction helpers shared across the page:
// mobile nav, header scroll state, drawers/modals, a hero + testimonial
// slider, toast notifications and scroll-reveal animation. None of
// this touches cart or catalog data directly — main.js wires those in.

export function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

export function initMobileNav() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-nav');
  const closeBtn = document.getElementById('mobile-nav-close');
  if (!toggle || !menu) return;

  const open = () => {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  };
  const close = () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('no-scroll');
  };

  toggle.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  menu.addEventListener('click', (e) => {
    if (e.target === menu) close();
  });
}

export function initModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return { open: () => {}, close: () => {} };

  const open = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  };
  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  modal.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', close));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { open, close };
}

export function initScrollReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || targets.length === 0) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((el) => observer.observe(el));
}

export function initHeroSlider(rootId, { interval = 6000 } = {}) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dots = Array.from(root.querySelectorAll('.hero-dot'));
  if (slides.length <= 1) return;

  let index = 0;
  let timer;

  const show = (i) => {
    slides[index].classList.remove('active');
    dots[index]?.classList.remove('active');
    index = (i + slides.length) % slides.length;
    slides[index].classList.add('active');
    dots[index]?.classList.add('active');
  };

  const next = () => show(index + 1);
  const restart = () => {
    clearInterval(timer);
    timer = setInterval(next, interval);
  };

  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => {
      show(i);
      restart();
    })
  );

  restart();
}

export function initTestimonialSlider(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const track = root.querySelector('.testimonial-track');
  const prev = root.querySelector('.testimonial-nav--prev');
  const next = root.querySelector('.testimonial-nav--next');
  const cards = Array.from(root.querySelectorAll('.testimonial-card'));
  if (!track || cards.length === 0) return;

  let index = 0;
  const update = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  next?.addEventListener('click', () => {
    index = (index + 1) % cards.length;
    update();
  });
  prev?.addEventListener('click', () => {
    index = (index - 1 + cards.length) % cards.length;
    update();
  });
}

let toastTimer;
export function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

export function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  const onScroll = () => btn.classList.toggle('visible', window.scrollY > 600);
  window.addEventListener('scroll', onScroll, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}
