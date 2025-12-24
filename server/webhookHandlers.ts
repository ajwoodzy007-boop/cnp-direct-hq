import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
});

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, secret: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Ensure webhook route is registered with express.raw().'
      );
    }

    let event: Stripe.Event;

    try {
      // Standard signature verification using the whsec_... key from Railway
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err: any) {
      console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
      throw new Error(`Webhook Signature Verification Failed: ${err.message}`);
    }

    console.log(`✅ Webhook Verified: ${event.type} [${event.id}]`);

    // Handle the specific events for Pro Trader
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`💰 Payment Successful for Customer: ${session.customer_email}`);
        // Add your database update logic here to grant user access
        break;
        
      case 'invoice.payment_succeeded':
        console.log('📈 Subscription payment succeeded');
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }
}
