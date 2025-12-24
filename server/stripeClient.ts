import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

export function getStripeClient() {
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in environment variables');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover' as any,
  });
}

export async function getStripePublishableKey() {
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY not found in environment variables');
  }
  return publishableKey;
}

// We export a dummy function to prevent errors in other files that might still call it
export async function getStripeSync() {
  return null;
}
