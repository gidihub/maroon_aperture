const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const stripe = require("stripe");
const functions = require("firebase-functions");

// For cost control
setGlobalOptions({ maxInstances: 10 });

// Create Stripe checkout session
exports.createCheckoutSession = onCall({
  cors: true,
}, async (request) => {
  try {
    // Get Stripe secret key from Firebase config
    const stripeSecretKey = functions.config().stripe.secret;
    const stripeInstance = stripe(stripeSecretKey);

    // Create checkout session
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

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    logger.error('Error creating Stripe session:', error);
    throw new functions.https.HttpsError('internal', 'Unable to create checkout session');
  }
});
