import { getUncachableStripeClient } from '../server/stripeClient';

async function seedProducts() {
  console.log('Creating subscription products in Stripe...');
  
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ 
    query: "name:'Pro Trader Pro'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed');
    return;
  }

  const proProduct = await stripe.products.create({
    name: 'Pro Trader Pro',
    description: 'Unlock AI-powered trading insights, unlimited predictions, and priority market alerts',
    metadata: {
      tier: 'pro',
      features: 'ai_playbook,unlimited_predictions,priority_alerts'
    }
  });
  console.log('Created product:', proProduct.id);

  const monthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { billing: 'monthly' }
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $9.99/month');

  const yearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 9900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { billing: 'yearly' }
  });
  console.log('Created yearly price:', yearlyPrice.id, '- $99/year (save 17%)');

  console.log('\nProducts created successfully!');
  console.log('Webhooks will sync them to your database automatically.');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error seeding products:', err);
    process.exit(1);
  });
