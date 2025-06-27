const { setGlobalOptions } = require("firebase-functions");
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getStorage } = require("firebase-admin/storage");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const stripe = require("stripe");

// Initialize Firebase Admin SDK once
admin.initializeApp();

// Secrets
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

setGlobalOptions({ maxInstances: 10 });

// ✅ 1. Create Stripe Checkout Session
exports.createCheckoutSession = onCall({
  cors: true,
  secrets: [stripeSecretKey],
}, async (request) => {
  try {
    const stripeInstance = stripe(stripeSecretKey.value().trim());

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Premium Upload Access',
          },
          unit_amount: 999,
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
    logger.error('❌ Error creating Stripe session:', error);
    throw new Error(`Unable to create checkout session: ${error.message}`);
  }
});

// ✅ 2. Stripe Webhook Handler
exports.handleStripeWebhook = onRequest({
  secrets: [stripeWebhookSecret, stripeSecretKey],
}, async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const stripeInstance = stripe(stripeSecretKey.value().trim());
    const event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.userId;

      // Update Firestore with payment status
      await admin.firestore().collection("payments").doc(userId).set({
        hasPaid: true,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ✅ 3. Serve Protected Image (Only for Paying Users)
exports.serveProtectedImage = onRequest(async (req, res) => {
  const { imagePath, uid } = req.query;

  if (!uid) return res.status(401).send("Missing user ID");

  try {
    const paymentSnap = await admin.firestore().collection("payments").doc(uid).get();

    if (!paymentSnap.exists || !paymentSnap.data().hasPaid) {
      return res.status(403).send("Access denied: User has not paid");
    }

    const bucket = getStorage().bucket();
    const file = bucket.file(`protected-images/${imagePath}`);
    const [exists] = await file.exists();

    if (!exists) return res.status(404).send("Image not found");

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return res.redirect(url);
  } catch (err) {
    logger.error("Error serving image:", err);
    return res.status(500).send("Internal server error");
  }
});

