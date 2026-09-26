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

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  if (!twilioClient) {
    const Twilio = require('twilio');
    twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

function buildOrderConfirmedMessage(order) {
  const total = (order.subtotal_cents / 100).toFixed(2);
  const currency = (order.currency || 'usd').toUpperCase();
  return (
    `Hibretfamily: your order is confirmed! Total ${total} ${currency}. Thank you for shopping with us. / ` +
    `ሂብረትፋሚሊ፦ ትእዛዝካ ተረጋጊጹ! ጠቅላላ ${total} ${currency}። ምሳና ብምግዛእካ ነመስግነካ።`
  );
}

// Best-effort only: a failed notification never blocks or retries the
// checkout/webhook flow — the sale itself already succeeded.
async function notifyBuyerOrderConfirmed(order) {
  const client = getTwilioClient();
  if (!client || !order?.buyer_phone) return;

  const body = buildOrderConfirmedMessage(order);

  if (process.env.TWILIO_WHATSAPP_FROM) {
    try {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        to: `whatsapp:${order.buyer_phone}`,
        body,
      });
      return;
    } catch (err) {
      console.error('WhatsApp order notification failed, trying SMS instead:', err.message);
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
      console.error('SMS order notification failed:', err.message);
    }
  }
}

module.exports = { notifyBuyerOrderConfirmed, buildOrderConfirmedMessage };
