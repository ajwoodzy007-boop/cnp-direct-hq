import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    
    // In production, sync is disabled to avoid backfill errors
    // Webhooks are acknowledged but not processed for local DB sync
    if (!sync) {
      console.log('Stripe webhook received but sync is disabled in production');
      return;
    }
    
    await sync.processWebhook(payload, signature, uuid);
  }
}
