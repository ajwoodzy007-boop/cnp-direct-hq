import Stripe from 'stripe';
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover' as any,
});

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string, secret: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err: any) {
      console.error(`❌ Webhook Signature Verification Failed: ${err.message}`);
      throw new Error(`Webhook Signature Verification Failed: ${err.message}`);
    }

    console.log(`✅ Webhook Verified: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email;

        if (customerEmail) {
          console.log(`💰 Upgrading ${customerEmail} to PRO tier...`);
          try {
            await db.update(users)
              .set({ tier: 'PRO' })
              .where(eq(users.email, customerEmail));
            console.log(`🚀 Successfully upgraded user: ${customerEmail}`);
          } catch (dbErr) {
            console.error(`❌ Database update failed for ${customerEmail}:`, dbErr);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Optional: Downgrade user back to FREE if they cancel
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  }
}
