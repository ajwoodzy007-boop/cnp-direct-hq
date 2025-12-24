import { getStripeClient } from './stripeClient';

export class StripeService {
  /**
   * Creates a Stripe Checkout Session for the Pro Trader subscription.
   */
  static async createCheckoutSession(userId: number, userEmail: string, priceId: string) {
    const stripe = getStripeClient();
    
    // Use the Railway URL for redirects
    const domain = `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'cnp-direct-hq-production.up.railway.app'}`;

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${domain}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/pricing`,
      metadata: {
        userId: userId.toString(),
      },
    });

    return session;
  }

  /**
   * Retrieves a customer's subscription status.
   */
  static async getSubscriptionStatus(customerId: string) {
    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    return subscriptions.data[0];
  }
}
