// server/lib/mail.js
//
// Email sending for the "resend my dashboard link" recovery flow (see
// POST /api/sellers/recover-link in routes/sellers.js). Resend is
// optional infrastructure, the same pattern as Twilio in notify.js —
// with RESEND_API_KEY or MAIL_FROM unset, this silently does nothing
// rather than erroring, so the recovery route still returns its
// generic response either way (see that route's comment on why).

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendMail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error('email send failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('email send failed:', err.message);
  }
}

function buildDashboardLinkEmail(dashboardUrl) {
  return (
    `Here is the link to your Hibretfamily seller dashboard. Bookmark it — ` +
    `it's your only way in, there is no password yet:\n\n${dashboardUrl}\n\n` +
    `Didn't request this? You can safely ignore this email.\n\n` +
    `---\n\n` +
    `እዚ'ዩ ናብ ናትካ ናይ Hibretfamily ሸያጣይ dashboard ዝወስድ link። Bookmark ግበሮ — ` +
    `ድሒርካ ናይ ምእታው ጥራይ መገድኻ እዩ፡ ሕጂ password የለን፦\n\n${dashboardUrl}\n\n` +
    `ንስኻ ዘይሓተትካዮ እንተኾይኑ፡ ብዘይ ስክፍታ ክትግድፎ ትኽእል ኢኻ።`
  );
}

async function sendDashboardLinkEmail(seller, dashboardUrl) {
  await sendMail({
    to: seller.email,
    subject: 'Your Hibretfamily dashboard link / ናይ Hibretfamily dashboard ሊንክካ',
    text: buildDashboardLinkEmail(dashboardUrl),
  });
}

module.exports = { sendDashboardLinkEmail };
