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

const productsRouter = require('./routes/products');
const sellersRouter = require('./routes/sellers');
const sellerProductsRouter = require('./routes/seller-products');
const checkoutRouter = require('./routes/checkout');
const subscriptionsRouter = require('./routes/subscriptions');
const ordersRouter = require('./routes/orders');
const webhooksRouter = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: CLIENT_URL }));

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
app.use('/api/checkout', checkoutRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/webhooks', webhooksRouter);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Hibretfamily backend running on http://localhost:${PORT}`);
});
