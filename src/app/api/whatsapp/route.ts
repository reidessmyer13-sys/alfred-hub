import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/claude';
import { sendWhatsAppMessage, validateTwilioSignature } from '@/lib/twilio';

// Store conversation history in memory (in production, use Redis or DB)
const conversationHistory: Map<string, { role: 'user' | 'assistant'; content: string }[]> = new Map();

export async function POST(request: NextRequest) {
  try {
    // Parse the form data from Twilio
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries()) as Record<string, string>;

    const { Body: messageBody, From: from, To: to } = body;

    if (!messageBody || !from) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Skip signature validation for now (Twilio sandbox doesn't always send valid signatures)
    // TODO: Re-enable for production with proper URL handling
    // if (process.env.NODE_ENV === 'production') {
    //   const signature = request.headers.get('x-twilio-signature') || '';
    //   const url = `https://${process.env.VERCEL_URL}/api/whatsapp`;
    //   if (!validateTwilioSignature(signature, url, body)) {
    //     return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    //   }
    // }

    console.log(`WhatsApp message from ${from}: ${messageBody}`);

    // Get or create conversation history for this user
    if (!conversationHistory.has(from)) {
      conversationHistory.set(from, []);
    }
    const history = conversationHistory.get(from)!;

    // Get response from Claude
    const response = await chat(messageBody, history, 'whatsapp');

    // Update conversation history (keep last 10 exchanges)
    history.push({ role: 'user', content: messageBody });
    history.push({ role: 'assistant', content: response });
    if (history.length > 20) {
      history.splice(0, 2); // Remove oldest exchange
    }

    // Send response back via WhatsApp
    await sendWhatsAppMessage(from, response);

    // Return TwiML response (empty is fine, we're sending via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    console.error('WhatsApp webhook error:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Twilio needs GET to verify webhook
export async function GET() {
  return NextResponse.json({ status: 'WhatsApp webhook active' });
}
