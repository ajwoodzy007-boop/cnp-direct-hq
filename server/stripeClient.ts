import * as StripeModule from 'stripe';
const Stripe = (StripeModule as any).default || StripeModule;

// We use the standard environment variables you set in Railway
const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

export async function getUncachableStripeClient() {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in environment variables');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

export async function getStripePublishableKey() {
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY not found in environment variables');
  }
  return publishableKey;
}

export async function getStripeSecretKey() {
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    // We check if the sync library is installed, otherwise we skip it for Railway
    try {
      const { StripeSync } = await import('stripe-replit-sync');
      const key = await getStripeSecretKey();

      stripeSync = new StripeSync({
        poolConfig: {
          connectionString: process.env.DATABASE_URL!,
          max: 2,
        },
        stripeSecretKey: key,
      });
    } catch (e) {
      console.log("StripeSync skipped or not available on this platform.");
      return null;
    }
  }
  return stripeSync;
}
