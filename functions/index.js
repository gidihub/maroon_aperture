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
    logger.info('🚀 Checkout session request received');
    logger.info('Request data:', request.data);
    logger.info('Request auth:', request.auth ? 'authenticated' : 'not authenticated');

    if (!request.auth || !request.auth.uid) {
      throw new Error('User must be authenticated');
    }

    const stripeInstance = stripe(stripeSecretKey.value().trim());
    logger.info('Secret key length:', stripeSecretKey.value().trim().length);
    logger.info('Secret key prefix:', stripeSecretKey.value().trim().substring(0, 10) + '...');

    logger.info('✅ Stripe instance created successfully');
    logger.info('📝 Creating checkout session...');

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Image: ${request.data.imageName}`,
            description: 'High-quality image download',
          },
          unit_amount: 500, // $5.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${request.data.origin}/dashboard?payment=success&image=${encodeURIComponent(request.data.imageName)}`,
      cancel_url: `${request.data.origin}/dashboard?payment=cancelled`,
      metadata: {
        userId: request.auth.uid,
        imageName: request.data.imageName,
        imageUrl: request.data.imageUrl,
      },
    });

    logger.info('✅ Checkout session created successfully:', session.id);
    logger.info('🔗 Session URL:', session.url);

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
    logger.info('🎣 Webhook received');
    const sig = req.headers['stripe-signature'];
    const stripeInstance = stripe(stripeSecretKey.value().trim());
    
    logger.info('📝 Constructing webhook event...');
    const event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());
    
    logger.info('✅ Webhook event constructed:', event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const imageName = session.metadata.imageName;

      logger.info('💰 Payment completed for user:', userId, 'image:', imageName);

      // Update Firestore with payment status
      await admin.firestore().collection("payments").doc(userId).set({
        hasPaid: true,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidImages: admin.firestore.FieldValue.arrayUnion(imageName),
        sessionId: session.id,
      }, { merge: true });

      logger.info('✅ Payment record updated in Firestore');
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('❌ Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ✅ 3. Serve Protected Image (Only for Paying Users)
exports.serveProtectedImage = onRequest(async (req, res) => {
  logger.info('🖼️ Protected image request received');
  const { imagePath, uid } = req.query;

  logger.info('Request params:', { imagePath, uid });

  if (!uid) {
    logger.warn('❌ Missing user ID');
    return res.status(401).send("Missing user ID");
  }

  try {
    logger.info('🔍 Checking payment status for user:', uid);
    const paymentSnap = await admin.firestore().collection("payments").doc(uid).get();

    if (!paymentSnap.exists) {
      logger.warn('❌ No payment record found for user:', uid);
      return res.status(403).send("Access denied: No payment record found");
    }

    const paymentData = paymentSnap.data();
    logger.info('💳 Payment data:', paymentData);

    if (!paymentData.hasPaid) {
      logger.warn('❌ User has not paid:', uid);
      return res.status(403).send("Access denied: User has not paid");
    }

    // Check if user has paid for this specific image
    if (paymentData.paidImages && !paymentData.paidImages.includes(imagePath)) {
      logger.warn('❌ User has not paid for this specific image:', imagePath);
      return res.status(403).send("Access denied: User has not paid for this image");
    }

    logger.info('✅ Payment verified, serving image');

    const bucket = getStorage().bucket();
    // Try both protected-images and images folders
    let file = bucket.file(`protected-images/${imagePath}`);
    let [exists] = await file.exists();

    if (!exists) {
      logger.info('🔍 Image not found in protected-images, trying images folder');
      file = bucket.file(`images/${imagePath}`);
      [exists] = await file.exists();
    }

    if (!exists) {
      logger.error('❌ Image not found in any folder:', imagePath);
      return res.status(404).send("Image not found");
    }

    logger.info('✅ Image found, generating signed URL');

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    logger.info('🔗 Signed URL generated, redirecting');
    return res.redirect(url);
  } catch (err) {
    logger.error("❌ Error serving image:", err);
    return res.status(500).send("Internal server error");
  }
});

// ✅ 4. Check Payment Status (for frontend)
exports.checkPaymentStatus = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new Error('User must be authenticated');
  }

  try {
    const paymentSnap = await admin.firestore().collection("payments").doc(request.auth.uid).get();
    
    if (!paymentSnap.exists) {
      return { hasPaid: false, paidImages: [] };
    }

    const paymentData = paymentSnap.data();
    return {
      hasPaid: paymentData.hasPaid || false,
      paidImages: paymentData.paidImages || [],
      paidAt: paymentData.paidAt,
    };
  } catch (error) {
    logger.error('Error checking payment status:', error);
    throw new Error('Unable to check payment status');
  }
});

