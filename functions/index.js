const {setGlobalOptions} = require("firebase-functions");
const {onCall, onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const stripe = require("stripe");

// Define the secrets
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// For cost control
setGlobalOptions({ maxInstances: 10 });

// Create Stripe checkout session
exports.createCheckoutSession = onCall({
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    logger.info('🚀 Checkout session request received');
    logger.info('Request data:', request.data);
    logger.info('Request auth:', request.auth ? 'authenticated' : 'not authenticated');
    
    // Get Stripe secret key from environment
    const secretValue = stripeSecretKey.value().trim();
    logger.info('Secret key length:', secretValue ? secretValue.length : 'undefined');
    logger.info('Secret key prefix:', secretValue ? secretValue.substring(0, 10) + '...' : 'undefined');
    
    if (!secretValue) {
      throw new Error('Stripe secret key is not available');
    }
    
    const stripeInstance = stripe(secretValue);
    logger.info('✅ Stripe instance created successfully');

    // Create checkout session
    logger.info('📝 Creating checkout session...');
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Premium Upload Access',
            description: 'Unlimited image uploads',
          },
          unit_amount: 999, // $9.99 in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${request.data.origin}/dashboard?payment=success`,
      cancel_url: `${request.data.origin}/dashboard?payment=cancelled`,
      metadata: {
        userId: request.auth?.uid || 'anonymous',
      },
    });

    logger.info('✅ Checkout session created successfully:', session.id);
    logger.info('🔗 Session URL:', session.url);
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    logger.error('❌ Error creating Stripe session:', error);
    logger.error('Error message:', error.message);
    logger.error('Error stack:', error.stack);
    throw new Error(`Unable to create checkout session: ${error.message}`);
  }
});

// Handle Stripe webhook events
exports.handleStripeWebhook = onRequest({
  secrets: [stripeWebhookSecret, stripeSecretKey],
}, async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = stripeWebhookSecret.value().trim();
    
    // Verify webhook signature
    const stripeInstance = stripe(stripeSecretKey.value().trim());
    const event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    
    logger.info('Webhook event received:', event.type);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        logger.info("Payment succeeded for session:", session.id);
        logger.info("Customer email:", session.customer_details?.email);
        logger.info("Amount paid:", session.amount_total);
        
        // Here you can add logic to:
        // - Update user's subscription status
        // - Send confirmation email
        // - Grant premium access
        // - Update database with payment info
        
        break;
      }
      default:
        logger.info("Unhandled event type:", event.type);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
