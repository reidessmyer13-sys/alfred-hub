import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Only create client if credentials are configured
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!client || !twilioWhatsAppNumber) {
    console.log('[Twilio] Not configured, skipping WhatsApp message');
    return;
  }

  // Clean and ensure the number is in WhatsApp format
  const cleanTo = to.trim().replace(/\s+/g, '');
  const toNumber = cleanTo.startsWith('whatsapp:') ? cleanTo : `whatsapp:${cleanTo}`;

  await client.messages.create({
    body,
    from: twilioWhatsAppNumber,
    to: toNumber,
  });
}

export async function sendReminder(body: string): Promise<void> {
  const userNumber = process.env.USER_WHATSAPP_NUMBER;
  if (!userNumber || !client) {
    console.log('[Twilio] USER_WHATSAPP_NUMBER or client not configured');
    return;
  }
  await sendWhatsAppMessage(userNumber, body);
}

// Validate Twilio webhook signature
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}
