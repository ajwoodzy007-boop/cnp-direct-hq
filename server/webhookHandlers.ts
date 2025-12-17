// Stripe sync disabled - webhooks are acknowledged but not processed
export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, uuid: string): Promise<void> {
    console.log('Stripe webhook received - sync disabled');
  }
}
