import express from 'express';
import Stripe from 'stripe';
import { query } from '../db';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

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
      
      await query(`UPDATE users SET tier = 'PREMIUM' WHERE id = $1`, [userId]);
      
      if ((req.session as any).user) {
        (req.session as any).user.tier = 'PREMIUM';
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

export default router;
