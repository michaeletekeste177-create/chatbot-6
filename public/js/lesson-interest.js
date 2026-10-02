// public/js/lesson-interest.js
//
// Pre-launch interest signup for online lessons — see the comment on
// lesson_interest in supabase/schema.sql. No payment, no Zoom link yet,
// just capturing whether enough people want this before building it.

import { API_BASE } from './config.js';

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const stateEl = document.getElementById('interest-state');

  stateEl.hidden = false;
  stateEl.textContent = 'Saving…';

  try {
    const res = await fetch(`${API_BASE}/lesson-interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value.trim(),
        contact: form.contact.value.trim(),
        course: form.course.value,
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong.');

    stateEl.textContent = "Thank you! We'll reach out once lessons are ready.";
    form.reset();
  } catch (err) {
    stateEl.textContent =
      err instanceof TypeError
        ? 'Could not reach the Hibretfamily backend — try again shortly.'
        : err.message || 'Something went wrong. Please try again.';
  }
}

function init() {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  document.getElementById('interest-form')?.addEventListener('submit', handleSubmit);
}

document.addEventListener('DOMContentLoaded', init);
