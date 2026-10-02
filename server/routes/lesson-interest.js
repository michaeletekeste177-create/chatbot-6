// server/routes/lesson-interest.js
//
// A pre-launch signup for online lessons (English, Tigrinya, culture) —
// see supabase/schema.sql's comment on lesson_interest. Deliberately
// just a name + contact + which course: we're validating demand before
// building booking, payment, or a Zoom integration.

const express = require('express');
const { supabase } = require('../config/supabase');

const router = express.Router();

// POST /api/lesson-interest
// body: { name, contact, course }
router.post('/', async (req, res) => {
  const { name, contact, course } = req.body;

  if (!name || !contact || !course) {
    return res.status(400).json({ error: 'name, contact, and course are required.' });
  }

  const { error } = await supabase.from('lesson_interest').insert({ name, contact, course });

  if (error) {
    console.error('lesson interest insert error:', error.message);
    return res.status(500).json({ error: 'Could not save your interest. Please try again.' });
  }

  res.status(201).json({ ok: true });
});

module.exports = router;
