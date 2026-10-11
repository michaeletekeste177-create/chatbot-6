// server/server.js
//
// Hibretfamily backend entry point.
// Hibretfamily is a multi-vendor marketplace: sellers list and price
// their own products, and every sale is split instantly between the
// seller's own Stripe-connected account and Hibretfamily's commission
// — the platform's own account never holds a buyer's money. Supabase
// is accessed only from here, with the service-role key; the frontend
// never sees that key, a seller's Stripe account id, or raw order data.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const productsRouter = require('./routes/products');
const sellersRouter = require('./routes/sellers');
const sellerProductsRouter = require('./routes/seller-products');
const sellerOrdersRouter = require('./routes/seller-orders');
const checkoutRouter = require('./routes/checkout');
const subscriptionsRouter = require('./routes/subscriptions');
const ordersRouter = require('./routes/orders');
const webhooksRouter = require('./routes/webhooks');
const lessonInterestRouter = require('./routes/lesson-interest');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// Render (and most hosts) put the app behind a reverse proxy — without
// this, every request looks like it comes from the proxy's own IP, and
// the rate limiter below would throttle all visitors together instead
// of one abusive IP at a time.
app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: CLIENT_URL }));

// A generous ceiling against scraping/DoS-ish traffic on the whole API —
// high enough that no real shopper or seller ever notices it.
app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })
);

// A tighter limit on the few public endpoints that are cheap to spam
// (no payment, no auth) and would otherwise let someone flood the
// database with junk seller accounts or lesson-interest signups.
const strictSignupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/sellers/register', strictSignupLimiter);
app.use('/api/lesson-interest', strictSignupLimiter);

// Stripe's webhook signature check needs the exact raw request body,
// so it's mounted BEFORE the JSON body parser and given its own raw
// parser — every other route gets normal parsed JSON.
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'hibretfamily-backend' });
});

app.use('/api/products', productsRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/seller-products', sellerProductsRouter);
app.use('/api/seller-orders', sellerOrdersRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/lesson-interest', lessonInterestRouter);

// A request for an API route that doesn't exist should get a clean
// JSON 404, not Express's default HTML error page — this backend is
// API-only, so every response should be JSON.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Hibretfamily backend running on http://localhost:${PORT}`);
});
