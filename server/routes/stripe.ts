import express from 'express';
import * as StripeModule from 'stripe';
import { db } from '../db';
import { members } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

const Stripe = (StripeModule as any).default || StripeModule;
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const DOMAIN = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
    : 'http://localhost:5000';

router.post('/create-checkout-session', async (req, res) => {
  const { priceId } = req.body;
  const user = (req.session as any).user;

  if (!user) return res.status(401).json({ error: 'Please log in' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, 
      },
      customer_email: user.email,
      success_url: `${DOMAIN}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/`,
      metadata: {
        userId: String(user.id),
      },
    });

    res.json({ url: session.url });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/success', async (req, res) => {
  const { session_id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(String(session_id));

    if (session.payment_status === 'paid' || session.status === 'open') {
      const userId = session.metadata?.userId;
      
      // Update members table, set membershipTier to 'PREMIUM'
      await db
        .update(members)
        .set({ membershipTier: 'PREMIUM' })
        .where(eq(members.id, userId));
      
      if ((req.session as any).user) {
        (req.session as any).user.membershipTier = 'PREMIUM'; // Drizzle uses camelCase
        (req.session as any).user.tier = 'PREMIUM'; // Backward compatibility
      }

      res.redirect(`/?upgrade=success`);
    } else {
      res.redirect('/?upgrade=failed');
    }
  } catch (e) {
    console.error("Upgrade failed:", e);
    res.redirect('/?upgrade=error');
  }
});

router.post('/create-portal-session', async (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: 'Log in required' });

  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: "No billing history found." });
    }

    const customerId = customers.data[0].id;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${DOMAIN}/`,
    });

    res.json({ url: portalSession.url });

  } catch (e: any) {
    console.error("Portal Error:", e);
    res.status(500).json({ error: "Could not access billing portal" });
  }
});

// Stripe Webhook Endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret!);
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('💰 Stripe Webhook Received:', event.type);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (userId) {
        try {
          // Update membership_tier to 'PREMIUM' using Drizzle
          await db
            .update(members)
            .set({ membershipTier: 'PREMIUM' })
            .where(eq(members.id, parseInt(userId)));

          console.log(`✅ User ${userId} upgraded to PREMIUM via webhook`);
        } catch (error) {
          console.error('❌ Failed to update user membership:', error);
          return res.status(500).json({ error: 'Failed to update membership' });
        }
      }
      break;

    default:
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
