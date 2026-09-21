// server/server.js
//
// Hibretfamily backend entry point.
// Hibretfamily is an affiliate storefront — it holds no inventory and
// takes no payments. This backend's two jobs are: serve the curated
// catalog, and log + redirect outbound clicks to each product's
// external affiliate link. Supabase is accessed only from here, with
// the service-role key — the frontend never sees that key or the raw
// affiliate URLs (see routes/track.js).

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const productsRouter = require('./routes/products');
const trackRouter = require('./routes/track');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'hibretfamily-backend' });
});

app.use('/api/products', productsRouter);
app.use('/api/track-click', trackRouter);

// Fallback error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(PORT, () => {
  console.log(`Hibretfamily backend running on http://localhost:${PORT}`);
});
