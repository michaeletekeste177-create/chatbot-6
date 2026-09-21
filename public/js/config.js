// public/js/config.js
//
// Single source of truth for non-secret, front-end-only configuration.
// Nothing in this file is sensitive — it only ever talks to our own
// backend's public API, never to Supabase directly. Hibretfamily is
// an affiliate storefront: it holds no inventory, so nothing here
// carries a price or stock count — every product is a curated link
// out to the store that actually sells it.

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
    shop_now: 'Shop Now',
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
    shop_now: 'ሕጂ ዓድግ',
  },
};

// Offline / in-person store locations. Edit freely — this list is
// rendered as-is on the "Visit us" section and needs no backend.
//
// `addressTi` is the Tigrinya gloss of `address`, shown alongside it in
// parentheses (see renderStoreLocations in main.js). Word order follows
// Tigrinya's noun-then-name construct — "ጎደና ሓርነት" (Avenue [of] Harnet),
// not the reversed "ሓርነት ጎደና" — the same pattern used for "ጎደና ሰማዕታት"
// (Sematat Avenue) and "ደሴት ጣውሎት" (Taulud Island) below.
//
// `honorTi` is each city's honorific tagline: Asmara's is often
// described as the country's foremost showcase of modernist
// architecture and national identity; Massawa, the historic Red Sea
// port, as its "pearl" and a hub of international transit traffic.
export const STORE_LOCATIONS = [
  {
    name: 'Hibretfamily — Harnet Flagship',
    address: 'Harnet Avenue, near Cinema Roma, Asmara',
    addressTi: 'ጎደና ሓርነት፣ ጥቓ ሲነማ ሮማ፣ ኣስመራ',
    honorTi: 'ቀንዲ ማእከል ንድፊ ሃገራዊ መንነት',
    hours: 'Mon–Sat 9:00–20:00, Sun 10:00–18:00',
    phone: '+291 7 123 457',
  },
  {
    name: 'Hibretfamily — Sematat',
    address: 'Sematat Avenue, Asmara',
    addressTi: 'ጎደና ሰማዕታት፣ ኣስመራ',
    honorTi: 'ቀንዲ ማእከል ንድፊ ሃገራዊ መንነት',
    hours: 'Mon–Sat 9:00–19:00',
    phone: '+291 7 123 458',
  },
  {
    name: 'Hibretfamily — Massawa',
    address: 'Taulud Island, Massawa',
    addressTi: 'ደሴት ጣውሎት፣ ምጽዋዕ',
    honorTi: 'ናይ ቀይሕ ባሕሪ ዕንቁ - ማእከል ኣህጉራዊ መተሓላለፊ ትራፊክ',
    hours: 'Mon–Sat 9:00–19:00',
    phone: '+291 7 123 459',
  },
];

export const TESTIMONIALS = [
  {
    quote: 'I stopped opening five different apps to compare deals — Hibretfamily already points me to the right one, for the kids’ shoes, a book, or a new blender.',
    author: 'Selam T.',
    role: 'Verified shopper',
    rating: 5,
  },
  {
    quote: 'I click "Shop Now" and I’m straight on the retailer’s page, ready to check out. No extra accounts, no middleman slowing things down.',
    author: 'Dawit M.',
    role: 'Verified shopper',
    rating: 5,
  },
  {
    quote: 'Their cosmetics picks are surprisingly well curated, and every link takes me somewhere I already trust.',
    author: 'Rahel A.',
    role: 'Verified shopper',
    rating: 4,
  },
];

// ---------------------------------------------------------------------
// Demo catalog — used ONLY when the backend can't be reached, so the
// storefront still looks and works fully when previewed on its own
// (e.g. opened as a static site before the backend is deployed). Shape
// matches what GET /api/products returns, PLUS an `affiliate_url` the
// real API deliberately never sends (see server/routes/products.js) —
// demo mode has no backend to proxy the click through, so it links
// straight out. Each `affiliate_url` here is a real, working Amazon
// *search* link (not a fabricated product page); wire up real
// product-specific affiliate links, including your own Associates
// tag, once you're editing actual catalog rows in Supabase.
// ---------------------------------------------------------------------
export const DEMO_PRODUCTS = [
  p('Tailored Wool Blazer', 'apparel', 'women'),
  p('Classic Oxford Shirt', 'apparel', 'men'),
  p('Kids Rainbow Hoodie', 'apparel', 'kids'),
  p('Everyday Linen Dress', 'apparel', 'women'),
  p('Slim Chino Trousers', 'apparel', 'men'),
  p('Kids Denim Overalls', 'apparel', 'kids'),
  p('Cropped Puffer Jacket', 'apparel', 'women'),
  p('Merino Wool Sweater', 'apparel', 'men'),

  p('Leather Ankle Boots', 'shoes', 'women'),
  p('Classic Court Sneakers', 'shoes', 'men'),
  p('Kids Light-Up Trainers', 'shoes', 'kids'),
  p('Suede Chelsea Boots', 'shoes', 'unisex'),

  p('Noise-Cancelling Headphones', 'electronics', 'unisex'),
  p('Smart Fitness Watch', 'electronics', 'unisex'),
  p('Portable Bluetooth Speaker', 'electronics', 'unisex'),
  p('4-Slice Toaster', 'electronics', 'unisex'),

  p('The Art of Everyday Cooking', 'books', 'unisex'),
  p('Bedtime Tales for Little Ones', 'books', 'kids'),
  p('Habits That Stick', 'books', 'unisex'),
  p('Atlas of the World', 'books', 'kids'),

  p('Hydrating Face Serum', 'cosmetics', 'women'),
  p('Matte Lipstick Set', 'cosmetics', 'women'),
  p('Men’s Grooming Kit', 'cosmetics', 'men'),
  p('Gentle Kids Shampoo', 'cosmetics', 'kids'),
];

function p(name, category, audience) {
  return {
    id: `demo-${slug(name)}`,
    name,
    category,
    audience,
    image_url: null,
    affiliate_url: `https://www.amazon.com/s?k=${encodeURIComponent(name)}`,
    demo: true,
  };
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
