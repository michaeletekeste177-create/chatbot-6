// public/js/config.js
//
// Single source of truth for non-secret, front-end-only configuration.
// Nothing in this file is sensitive — it only ever talks to our own
// backend's public API, never to Supabase or Stripe directly.

export const SITE = {
  name: 'Hibretfamily',
  tagline: 'Fashion, tech and everyday essentials for the whole family',
  email: 'hello@hibretfamily.com',
  phone: '+291 7 123 456',
  social: {
    instagram: '#',
    facebook: '#',
    tiktok: '#',
  },
};

// Point this at your deployed backend. Falls back to localhost for
// local development against `server/`.
export const API_BASE = window.HIBRETFAMILY_API_BASE || 'http://localhost:4000/api';

export const CATEGORIES = [
  { id: 'apparel',     label: 'Apparel',     icon: 'shirt',   blurb: 'Everyday & occasion wear' },
  { id: 'shoes',       label: 'Shoes',       icon: 'shoe',    blurb: 'Sneakers, heels & boots' },
  { id: 'electronics', label: 'Electronics', icon: 'device',  blurb: 'Audio, gadgets & accessories' },
  { id: 'books',       label: 'Books',       icon: 'book',    blurb: 'Stories for every age' },
  { id: 'cosmetics',   label: 'Cosmetics',   icon: 'sparkle', blurb: 'Skincare & beauty' },
];

export const AUDIENCES = [
  { id: 'women', label: 'Women' },
  { id: 'men',   label: 'Men' },
  { id: 'kids',  label: 'Kids' },
  { id: 'unisex', label: 'Everyone' },
];

// The six homepage "shop by department" cards. Women/Men/Kids filter by
// audience (spanning both apparel and shoes); the other three filter by
// category directly. `labelKey`/`blurbKey` resolve through I18N below,
// so switching language re-labels these cards without touching the data.
export const DEPARTMENTS = [
  { id: 'women',       category: '',            audience: 'women', icon: 'shirt',   labelKey: 'dept_women',       blurbKey: 'blurb_women' },
  { id: 'men',         category: '',            audience: 'men',   icon: 'shirt',   labelKey: 'dept_men',         blurbKey: 'blurb_men' },
  { id: 'kids',        category: '',            audience: 'kids',  icon: 'shirt',   labelKey: 'dept_kids',        blurbKey: 'blurb_kids' },
  { id: 'cosmetics',   category: 'cosmetics',    audience: '',      icon: 'sparkle', labelKey: 'dept_cosmetics',   blurbKey: 'blurb_cosmetics' },
  { id: 'books',       category: 'books',        audience: '',      icon: 'book',    labelKey: 'dept_books',       blurbKey: 'blurb_books' },
  { id: 'electronics', category: 'electronics',  audience: '',      icon: 'device',  labelKey: 'dept_electronics', blurbKey: 'blurb_electronics' },
];

// ---------------------------------------------------------------------
// i18n — English + Eritrean Tigrinya (ትግርኛ). Scoped to navigation,
// department and filter labels per the storefront's bilingual
// requirement. Every label a customer uses to browse departments has
// a Tigrinya mapping; product data itself stays in whatever language
// the catalog is entered in.
//
// Wording follows the standard Tigrinya spoken and written in Eritrea
// (e.g. "ድኳን" for shop/store, "ዕዳጋ" for market — everyday Eritrean
// usage — rather than Tigray-region conventions). This was drafted by
// an AI assistant, not a certified native speaker: it's a solid
// starting point, but a native Eritrean Tigrinya speaker should still
// proofread these strings before they go live in production. All of
// it lives in this one object, so a reviewer only has to edit the
// `ti` block below.
// ---------------------------------------------------------------------
export const I18N = {
  en: {
    nav_women: 'Women', nav_men: 'Men', nav_kids: 'Kids', nav_shop: 'Shop all',
    nav_stores: 'Stores', nav_about: 'About', nav_stores_full: 'Our stores',
    nav_about_full: 'About Hibretfamily', nav_contact: 'Contact',

    dept_women: 'Women', dept_men: 'Men', dept_kids: 'Kids',
    dept_cosmetics: 'Cosmetics', dept_books: 'Books', dept_electronics: 'Electronics',
    blurb_women: 'Dresses, tailoring & shoes',
    blurb_men: 'Shirts, trousers & shoes',
    blurb_kids: 'Playful, durable everyday wear',
    blurb_cosmetics: 'Skincare & beauty',
    blurb_books: 'Stories for every age',
    blurb_electronics: 'Audio, gadgets & home tech',

    pill_all: 'All departments', pill_everyone: 'Everyone',
    cat_apparel: 'Apparel', cat_shoes: 'Shoes', cat_electronics: 'Electronics',
    cat_books: 'Books', cat_cosmetics: 'Cosmetics',
    aud_women: 'Women', aud_men: 'Men', aud_kids: 'Kids', aud_unisex: 'Everyone',

    banner_badge: '30% OFF',
    banner_eyebrow: 'Limited-Time Offer',
    banner_heading: 'Season Sale — Up to 30% Off',
    banner_subcopy: "Fresh season markdowns across Women's, Men's and Kids' fashion, plus Cosmetics, Books and Electronics — for a limited time only.",
  },
  ti: {
    nav_women: 'ደቂ ኣንስትዮ', nav_men: 'ደቂ ተባዕትዮ', nav_kids: 'ቆልዑ', nav_shop: 'ኩሉ ዕዳጋ',
    nav_stores: 'ድኳናት', nav_about: 'ብዛዕባና', nav_stores_full: 'ድኳናትና',
    nav_about_full: 'ብዛዕባ ሂብረትፋሚሊ', nav_contact: 'ርኸቡና',

    dept_women: 'ደቂ ኣንስትዮ', dept_men: 'ደቂ ተባዕትዮ', dept_kids: 'ቆልዑ',
    dept_cosmetics: 'ኮስመቲክስ', dept_books: 'መጻሕፍቲ', dept_electronics: 'ኤሌክትሮኒክስ',
    blurb_women: 'ቀሚሽን ጫማን ንደቂ ኣንስትዮ',
    blurb_men: 'ካምቻን ስረን ጫማን',
    blurb_kids: 'ምችው ክዳውንትን ጫማን ንቆልዑ',
    blurb_cosmetics: 'መሸለምያን ክንክን ቆርበትን',
    blurb_books: 'ዛንታታት ንዅሎም ዕድመታት',
    blurb_electronics: 'ናይ ገዛ ኤሌክትሮኒክስ',

    pill_all: 'ኩሉ ክፍልታት', pill_everyone: 'ንኹሉ',
    cat_apparel: 'ክዳውንቲ', cat_shoes: 'ጫማ', cat_electronics: 'ኤሌክትሮኒክስ',
    cat_books: 'መጻሕፍቲ', cat_cosmetics: 'ኮስመቲክስ',
    aud_women: 'ደቂ ኣንስትዮ', aud_men: 'ደቂ ተባዕትዮ', aud_kids: 'ቆልዑ', aud_unisex: 'ንኹሉ',

    banner_badge: 'ክሳብ 30% ቅናሽ',
    banner_eyebrow: 'ፍሉይ ቅናሽ',
    banner_heading: 'ናይ ወቕቲ ቅናሽ — ክሳብ 30%',
    banner_subcopy: 'ሓድሽ ናይ ወቕቲ ቅናሽ ኣብ ክዳውንቲ ደቂ ኣንስትዮ፡ ደቂ ተባዕትዮን ቆልዑን፡ ከምኡውን ኣብ ኮስመቲክስ፡ መጻሕፍትን ኤሌክትሮኒክስን — ንውሱን ግዜ ጥራይ።',
  },
};

// Offline / in-person store locations. Edit freely — this list is
// rendered as-is on the "Visit us" section and needs no backend.
export const STORE_LOCATIONS = [
  {
    name: 'Hibretfamily — Harnet Flagship',
    address: 'Harnet Avenue, near Cinema Roma, Asmara',
    hours: 'Mon–Sat 9:00–20:00, Sun 10:00–18:00',
    phone: '+291 7 123 457',
  },
  {
    name: 'Hibretfamily — Sematat',
    address: 'Sematat Avenue, Asmara',
    hours: 'Mon–Sat 9:00–19:00',
    phone: '+291 7 123 458',
  },
  {
    name: 'Hibretfamily — Massawa',
    address: 'Taulud Island, Massawa',
    hours: 'Mon–Sat 9:00–19:00',
    phone: '+291 7 123 459',
  },
];

export const TESTIMONIALS = [
  {
    quote: 'The only store where I can grab school shoes for the kids, a book for myself and a new blender — all in one trip.',
    author: 'Selam T.',
    role: 'Verified customer',
    rating: 5,
  },
  {
    quote: 'Ordered online in the evening, picked it up at the Harnet Avenue store the next morning. Genuinely convenient.',
    author: 'Dawit M.',
    role: 'Verified customer',
    rating: 5,
  },
  {
    quote: 'Their cosmetics section is surprisingly well curated, and checkout is fast and secure.',
    author: 'Rahel A.',
    role: 'Verified customer',
    rating: 4,
  },
];

// ---------------------------------------------------------------------
// Demo catalog — used ONLY when the backend can't be reached, so the
// storefront still looks and works fully when previewed on its own
// (e.g. opened as a static site before the backend is deployed).
// Shape matches exactly what GET /api/products returns.
// ---------------------------------------------------------------------
export const DEMO_PRODUCTS = [
  p('Tailored Wool Blazer', 'apparel', 'women', 8900, 'Warm-tone tailored blazer, fully lined.'),
  p('Classic Oxford Shirt', 'apparel', 'men', 3200, 'Crisp cotton oxford, regular fit.'),
  p('Kids Rainbow Hoodie', 'apparel', 'kids', 1800, 'Soft fleece hoodie with front pocket.'),
  p('Everyday Linen Dress', 'apparel', 'women', 4200, 'Breathable linen blend, midi length.'),
  p('Slim Chino Trousers', 'apparel', 'men', 2900, 'Stretch-cotton chino, tapered leg.'),
  p('Kids Denim Overalls', 'apparel', 'kids', 2100, 'Durable denim, adjustable straps.'),
  p('Cropped Puffer Jacket', 'apparel', 'women', 5600, 'Lightweight fill, water-resistant shell.'),
  p('Merino Wool Sweater', 'apparel', 'men', 4700, 'Breathable merino, crew neck.'),

  p('Leather Ankle Boots', 'shoes', 'women', 6200, 'Genuine leather, block heel.'),
  p('Classic Court Sneakers', 'shoes', 'men', 3900, 'Everyday low-top sneaker.'),
  p('Kids Light-Up Trainers', 'shoes', 'kids', 2500, 'Cushioned sole, light-up heel.'),
  p('Suede Chelsea Boots', 'shoes', 'unisex', 5400, 'Elastic side panel, pull tab.'),

  p('Noise-Cancelling Headphones', 'electronics', 'unisex', 7900, 'Over-ear, 30-hour battery life.'),
  p('Smart Fitness Watch', 'electronics', 'unisex', 6500, 'Heart-rate, sleep & activity tracking.'),
  p('Portable Bluetooth Speaker', 'electronics', 'unisex', 3400, 'Water-resistant, 12-hour playback.'),
  p('4-Slice Toaster', 'electronics', 'unisex', 2800, 'Wide slots, 6 browning settings.'),

  p('The Art of Everyday Cooking', 'books', 'unisex', 1500, 'Illustrated recipes for busy families.'),
  p('Bedtime Tales for Little Ones', 'books', 'kids', 900, 'A collection of gentle bedtime stories.'),
  p('Habits That Stick', 'books', 'unisex', 1200, 'Practical guide to lasting habits.'),
  p('Atlas of the World', 'books', 'kids', 1700, 'Large-format illustrated atlas for young explorers.'),

  p('Hydrating Face Serum', 'cosmetics', 'women', 2200, 'Vitamin C + hyaluronic acid blend.'),
  p('Matte Lipstick Set', 'cosmetics', 'women', 1800, 'Set of 3 long-wear matte shades.'),
  p('Men’s Grooming Kit', 'cosmetics', 'men', 2600, 'Beard oil, balm and travel comb.'),
  p('Gentle Kids Shampoo', 'cosmetics', 'kids', 900, 'Tear-free formula, chamomile scent.'),
];

function p(name, category, audience, price_cents, description) {
  return {
    id: `demo-${slug(name)}`,
    name,
    category,
    audience,
    price_cents,
    currency: 'usd',
    description,
    stock: 12,
    image_url: null,
    demo: true,
  };
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
