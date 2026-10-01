// server/lib/notify.js
//
// Order-confirmation SMS/WhatsApp for the buyer, sent right after
// Stripe confirms payment (see routes/webhooks.js). Twilio is optional
// infrastructure — a real Twilio account, phone number, and (for
// WhatsApp) an approved message template a seller/owner sets up
// themselves, exactly like Stripe Connect or mNakfa. With no TWILIO_*
// env vars set, everything here silently does nothing, so
// checkout/webhooks keep working fine without it.
//
// WhatsApp policy note: a business-initiated WhatsApp message (the
// buyer didn't just message this number) must use a template approved
// in the Twilio/Meta console — free-form text like the string below
// only works once such a template exists and TWILIO_WHATSAPP_FROM is
// set to a WhatsApp-enabled sender. See the README for the setup
// checklist. SMS has no such requirement.

let twilioClient;

// Two ways to authenticate, either is fine: the account's own Auth Token
// (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN), or an API Key (TWILIO_ACCOUNT_SID +
// TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET) — the latter is easier to copy
// correctly since Twilio shows the Secret in plain text once, right when you
// create it, instead of behind a reveal-then-copy step.
function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const Twilio = require('twilio');
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET) {
    twilioClient = new Twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID });
  } else if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient || null;
}

function buildOrderConfirmedMessage(order) {
  const total = (order.subtotal_cents / 100).toFixed(2);
  const currency = (order.currency || 'usd').toUpperCase();
  return (
    `Hibretfamily: your order is confirmed! Total ${total} ${currency}. Thank you for shopping with us. / ` +
    `ሂብረትፋሚሊ፦ ትእዛዝካ ተረጋጊጹ! ጠቅላላ ${total} ${currency}። ምሳና ብምግዛእካ ነመስግነካ።`
  );
}

// Shared send: WhatsApp first (if configured), falling back to SMS.
// Best-effort only — a failed notification never blocks or retries
// whatever flow called it (checkout, shipping) since the underlying
// action already succeeded.
async function sendToBuyer(order, body) {
  const client = getTwilioClient();
  if (!client || !order?.buyer_phone) return;

  if (process.env.TWILIO_WHATSAPP_FROM) {
    try {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: `whatsapp:${order.buyer_phone}`,
        body,
      });
      return;
    } catch (err) {
      console.error('WhatsApp notification failed, trying SMS instead:', err.message);
    }
  }

  if (process.env.TWILIO_SMS_FROM) {
    try {
      await client.messages.create({
        from: process.env.TWILIO_SMS_FROM,
        to: order.buyer_phone,
        body,
      });
    } catch (err) {
      console.error('SMS notification failed:', err.message);
    }
  }
}

async function notifyBuyerOrderConfirmed(order) {
  await sendToBuyer(order, buildOrderConfirmedMessage(order));
}

// Sent when a seller marks an order "shipped" from their dashboard —
// the manual, non-Stripe delivery-confirmation path (mNakfa orders have
// no webhook to trigger anything automatically). confirmUrl carries the
// order's delivery_confirmation_token; the buyer tapping "I received
// it" on that page is the only "login" this needs, same unguessable-UUID
// model as the receipt route in routes/orders.js.
function buildOrderShippedMessage(order, confirmUrl) {
  return (
    `Hibretfamily: your order is on its way! When it arrives, confirm receipt here: ${confirmUrl} / ` +
    `ሕብረትፋሚሊ፦ ትእዛዝካ ኣብ መገዲ ኣሎ! ምስ በጽሓካ፡ ኣብዚ ርኸቦ፦ ${confirmUrl}`
  );
}

async function notifyBuyerOrderShipped(order, confirmUrl) {
  await sendToBuyer(order, buildOrderShippedMessage(order, confirmUrl));
}

module.exports = {
  notifyBuyerOrderConfirmed,
  buildOrderConfirmedMessage,
  notifyBuyerOrderShipped,
  buildOrderShippedMessage,
};
