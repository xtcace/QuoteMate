const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook error: ${err.message}`
    };
  }

  if (stripeEvent.type === 'customer.subscription.created' ||
      stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object;
    const email = subscription.metadata?.email ||
                  subscription.customer_email;

    if (email) {
      await supabase
        .from('profiles')
        .update({ is_pro: true })
        .eq('email', email);
    }
  }

  if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;
    const email = subscription.metadata?.email ||
                  subscription.customer_email;

    if (email) {
      await supabase
        .from('profiles')
        .update({ is_pro: false })
        .eq('email', email);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
