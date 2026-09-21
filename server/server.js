// server/server.js
//
// Hibretfamily backend entry point.
// Responsibilities: serve the catalog, create Stripe Checkout
// sessions with server-verified prices, and reconcile payment
// status via Stripe webhooks. Supabase is accessed only from here,
// with the service-role key — the frontend never sees that key.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const productsRouter = require('./routes/products');
const checkoutRouter = require('./routes/checkout');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: CLIENT_URL }));

// The Stripe webhook needs the raw request body for signature
// verification, so it's mounted BEFORE the JSON body parser and
// given its own raw parser.
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'hibretfamily-backend' });
});

app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutRouter);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Hibretfamily backend running on http://localhost:${PORT}`);
});
