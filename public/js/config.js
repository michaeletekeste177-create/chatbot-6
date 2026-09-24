// public/js/config.js
//
// Single source of truth for non-secret, front-end-only configuration.
// Nothing in this file is sensitive — it only ever talks to our own
// backend's public API, never to Supabase or Stripe directly.
//
// Hibretfamily is a multi-vendor MARKETPLACE: independent sellers list
// and price their own products; Hibretfamily takes a commission and
// never holds a buyer's payment even briefly (see server/routes/checkout.js
// for the Stripe Connect split that makes that true).

export const SITE = {
  name: 'Hibretfamily',
  tagline: 'Eritrea’s marketplace, connecting local sellers to the world',
  email: 'michaeletekeste177@gmail.com',
  phone: '+31 6 84100875',
  social: {
    instagram: '#',
    facebook: '#',
    tiktok: '#',
  },
};

// The landmarks Hibretfamily's brand and store honors are drawn from
// (see STORE_LOCATIONS below and the "Our inspiration" note in
// index.html's about section).
export const INSPIRATION = ['Harnet Avenue (Asmara)', 'Massawa Port Heritage', 'Sematat Avenue'];

// The two seller plans (business_model.tiers). `costLabelKey`/
// `targetKey` resolve through I18N; the actual commission percentages
// and subscription price live on the backend (server/routes/checkout.js,
// server/routes/subscriptions.js) and in your Stripe Dashboard — both
// are placeholders pending a real pricing decision.
export const SELLER_TIERS = [
  {
    id: 'freemium',
    nameKey: 'tier_freemium_name',
    targetKey: 'tier_freemium_target',
    priceKey: 'tier_freemium_price',
  },
  {
    id: 'subscription',
    nameKey: 'tier_subscription_name',
    targetKey: 'tier_subscription_target',
    priceKey: 'tier_subscription_price',
  },
];

// Shown verbatim, in both languages at once (not toggled), on the
// "Sell on Hibretfamily" registration form — sellers, not the
// platform, are liable for what they list, and a registrant must
// acknowledge this before server/routes/sellers.js will create their
// account (see the required checkbox in the form).
export const SELLER_LIABILITY_STATEMENT = {
  ti: 'ዝዀነ ይኹን ትካል ይኹን ውልቀሰብ ዘየድልይ ንብረት እንተ ሰቒሉ ንዝመጽእ ክሳራ ባዕሉ ሙሉእ ብሙሉእ ተሓታቲ እዩ።',
  en: 'Any business or individual is solely and fully liable for any damages caused by uploading unauthorized items.',
};

// The post-checkout welcome, shown together (not toggled) on
// success.html — see digital_welcome in the platform identity spec.
export const DIGITAL_WELCOME = { ti: 'የቐንየልና', en: 'Thank You' };

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

    banner_badge: 'New This Season',
    banner_eyebrow: 'Discover More',
    banner_heading: 'Fresh Finds Across Every Department',
    banner_subcopy: "Independent sellers across Women's, Men's and Kids' fashion, plus Cosmetics, Books and Electronics — all in one marketplace, one checkout.",
    shop_now: 'Shop Now',
    add_to_cart: 'Add to Cart',

    nav_sell: 'Sell With Us',
    seller_hero_eyebrow: 'Global Marketplace',
    seller_hero_heading: 'Bring your business to the world',
    seller_cta: 'Register as a Seller',
    tier_freemium_name: 'Freemium',
    tier_freemium_target: 'For new and small sellers',
    tier_freemium_price: 'Free to join',
    tier_subscription_name: 'Premium',
    tier_subscription_target: 'For large merchants',
    tier_subscription_price: 'Lower commission with a monthly plan',
    liability_heading: 'Seller Responsibility',
    liability_checkbox_label: 'I have read and agree to the seller liability terms.',
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

    banner_badge: 'ሓድሽ ወቕቲ',
    banner_eyebrow: 'ብዙሕ ምረጻ ርኸቡ',
    banner_heading: 'ሓደስቲ ፍርያት ኣብ ኩሉ ክፍልታት',
    banner_subcopy: 'ካብ ክዳውንቲ ደቂ ኣንስትዮ፡ ደቂ ተባዕትዮን ቆልዑን፡ ክሳብ ኮስመቲክስ፡ መጻሕፍትን ኤሌክትሮኒክስን — ብሓደ ዕዳጋ፡ ብሓደ ክፍሊት።',
    shop_now: 'ሕጂ ዓድግ',
    add_to_cart: 'ግዛእ',

    nav_sell: 'ንግድኹም ጀምሩ',
    seller_hero_eyebrow: 'ዓለምለኸ ዕዳጋ',
    seller_hero_heading: 'ንግድኹም ምስ ዓለም ኣተሓሕዙ',
    seller_cta: 'ከም ሽያጣይ ተመዝገቡ',
    tier_freemium_name: 'ብነጻ ደረጃ',
    tier_freemium_target: 'ንሓደስቲን ንኣሽቱን ሸየጥቲ',
    tier_freemium_price: 'ብነጻ ይጅመር',
    tier_subscription_name: 'ፕሪምየም ደረጃ',
    tier_subscription_target: 'ንዓበይቲ ነጋዶ',
    tier_subscription_price: 'ብወርሓዊ ክፍሊት፡ ትሑት ኮሚሽን',
    liability_heading: 'ሓላፍነት ሽያጣይ',
    liability_checkbox_label: 'ነዚ ሓላፍነት ሽያጣይ ኣንቢበ ተሰማሚዐ ኣለኹ።',
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
    quote: 'I stopped opening five different apps to compare sellers — Hibretfamily already brings the kids’ shoes, a book, and a new blender together in one checkout.',
    author: 'Selam T.',
    role: 'Verified shopper',
    rating: 5,
  },
  {
    quote: 'I sell handmade crafts from Asmara and get paid the same day, straight to my own account. Hibretfamily never touches my money — I can see exactly what their commission is.',
    author: 'Dawit M.',
    role: 'Verified seller',
    rating: 5,
  },
  {
    quote: 'Their cosmetics sellers are surprisingly well curated, and checkout takes seconds.',
    author: 'Rahel A.',
    role: 'Verified shopper',
    rating: 4,
  },
];

// Two demo sellers, so previewing the site (with no backend connected)
// still demonstrates the marketplace's core rule: a cart can only hold
// one seller's products at a time (see public/js/cart.js). Real
// sellers come from the `sellers` table once the backend is connected.
const DEMO_SELLERS = {
  asmaraStyle: { id: 'demo-seller-asmara-style', name: 'Asmara Style Co.' },
  redSeaTech: { id: 'demo-seller-red-sea-tech', name: 'Red Sea Tech & Books' },
};

// ---------------------------------------------------------------------
// Demo catalog — used ONLY when the backend can't be reached, so the
// storefront still looks and works fully when previewed on its own
// (e.g. opened as a static site before the backend is deployed). Shape
// matches what GET /api/products returns (price/stock included — this
// is a real marketplace, not a price-less catalog).
// ---------------------------------------------------------------------
export const DEMO_PRODUCTS = [
  p('Tailored Wool Blazer', 'apparel', 'women', 8900, DEMO_SELLERS.asmaraStyle),
  p('Classic Oxford Shirt', 'apparel', 'men', 3200, DEMO_SELLERS.asmaraStyle),
  p('Kids Rainbow Hoodie', 'apparel', 'kids', 1800, DEMO_SELLERS.asmaraStyle),
  p('Everyday Linen Dress', 'apparel', 'women', 4200, DEMO_SELLERS.asmaraStyle),
  p('Slim Chino Trousers', 'apparel', 'men', 2900, DEMO_SELLERS.asmaraStyle),
  p('Kids Denim Overalls', 'apparel', 'kids', 2100, DEMO_SELLERS.asmaraStyle),
  p('Cropped Puffer Jacket', 'apparel', 'women', 5600, DEMO_SELLERS.asmaraStyle),
  p('Merino Wool Sweater', 'apparel', 'men', 4700, DEMO_SELLERS.asmaraStyle),

  p('Leather Ankle Boots', 'shoes', 'women', 6200, DEMO_SELLERS.asmaraStyle),
  p('Classic Court Sneakers', 'shoes', 'men', 3900, DEMO_SELLERS.asmaraStyle),
  p('Kids Light-Up Trainers', 'shoes', 'kids', 2500, DEMO_SELLERS.asmaraStyle),
  p('Suede Chelsea Boots', 'shoes', 'unisex', 5400, DEMO_SELLERS.asmaraStyle),

  p('Noise-Cancelling Headphones', 'electronics', 'unisex', 7900, DEMO_SELLERS.redSeaTech),
  p('Smart Fitness Watch', 'electronics', 'unisex', 6500, DEMO_SELLERS.redSeaTech),
  p('Portable Bluetooth Speaker', 'electronics', 'unisex', 3400, DEMO_SELLERS.redSeaTech),
  p('4-Slice Toaster', 'electronics', 'unisex', 2800, DEMO_SELLERS.redSeaTech),

  p('The Art of Everyday Cooking', 'books', 'unisex', 1500, DEMO_SELLERS.redSeaTech),
  p('Bedtime Tales for Little Ones', 'books', 'kids', 900, DEMO_SELLERS.redSeaTech),
  p('Habits That Stick', 'books', 'unisex', 1200, DEMO_SELLERS.redSeaTech),
  p('Atlas of the World', 'books', 'kids', 1700, DEMO_SELLERS.redSeaTech),

  p('Hydrating Face Serum', 'cosmetics', 'women', 2200, DEMO_SELLERS.asmaraStyle),
  p('Matte Lipstick Set', 'cosmetics', 'women', 1800, DEMO_SELLERS.asmaraStyle),
  p('Men’s Grooming Kit', 'cosmetics', 'men', 2600, DEMO_SELLERS.asmaraStyle),
  p('Gentle Kids Shampoo', 'cosmetics', 'kids', 900, DEMO_SELLERS.asmaraStyle),
];

function p(name, category, audience, price_cents, seller) {
  return {
    id: `demo-${slug(name)}`,
    name,
    category,
    audience,
    price_cents,
    currency: 'usd',
    stock: 12,
    image_url: null,
    seller_id: seller.id,
    sellerName: seller.name,
    demo: true,
  };
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
