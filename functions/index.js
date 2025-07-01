// functions/index.js
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
    if (!request.auth?.uid) {
      throw new Error('User must be authenticated');
    }

    const stripeInstance = stripe(stripeSecretKey.value().trim());
    logger.info('✅ Stripe instance initialized');

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Image: ${request.data.imageName}`,
            description: 'High-quality image download',
          },
          unit_amount: 500,
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

    logger.info('✅ Session created:', session.id);
    return { sessionId: session.id, url: session.url };

  } catch (error) {
    logger.error('❌ Checkout session error:', error);
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
    const event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());

    logger.info('✅ Webhook event:', event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { userId, imageName } = session.metadata;
      logger.info('💰 Payment:', userId, imageName);

      await admin.firestore().collection("payments").doc(userId).set({
        hasPaid: true,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidImages: admin.firestore.FieldValue.arrayUnion(imageName),
        sessionId: session.id,
      }, { merge: true });

      logger.info('✅ Payment recorded in Firestore');
    }

    res.json({ received: true });

  } catch (error) {
    logger.error('❌ Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// ✅ 3. Serve Protected Image
exports.serveProtectedImage = onRequest(async (req, res) => {
  logger.info('🖼️ Protected image request', req.query);
  const { imagePath, uid } = req.query;

  if (!uid) {
    logger.warn('❌ Missing UID');
    return res.status(401).send("Missing user ID");
  }

  try {
    const paymentSnap = await admin.firestore().collection("payments").doc(uid).get();

    if (!paymentSnap.exists) {
      logger.warn('❌ No payment record for', uid);
      return res.status(403).send("Access denied: No payment record");
    }

    const paymentData = paymentSnap.data();
    if (!paymentData.hasPaid || !paymentData.paidImages.includes(imagePath)) {
      logger.warn('❌ Unauthorized image request:', imagePath);
      return res.status(403).send("Access denied: Payment not found");
    }

    const bucket = getStorage().bucket();
    let file = bucket.file(`protected-images/${imagePath}`);
    let [exists] = await file.exists();

    if (!exists) {
      file = bucket.file(`images/${imagePath}`);
      [exists] = await file.exists();
    }

    if (!exists) {
      logger.error('❌ Image not found:', imagePath);
      return res.status(404).send("Image not found");
    }

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    logger.info('✅ Redirecting to signed URL');
    return res.redirect(url);

  } catch (err) {
    logger.error("❌ serveProtectedImage error:", err);
    return res.status(500).send("Internal server error");
  }
});

// ✅ 4. Check Payment Status
exports.checkPaymentStatus = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new Error('User must be authenticated');
  }

  try {
    const snap = await admin.firestore().collection("payments").doc(request.auth.uid).get();
    if (!snap.exists) return { hasPaid: false, paidImages: [] };

    const data = snap.data();
    return { hasPaid: data.hasPaid || false, paidImages: data.paidImages || [], paidAt: data.paidAt };
  } catch (error) {
    logger.error('❌ checkPaymentStatus error:', error);
    throw new Error('Unable to fetch payment status');
  }
});

// ✅ 5. Setup Admin Access
exports.setupAdmin = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new Error('User must be authenticated');
  }

  const uid = request.auth.uid;
  try {
    const userRef = admin.firestore().collection('users').doc(uid);
    const doc = await userRef.get();

    if (doc.exists) {
      if (doc.data().isAdmin) return { success: true, message: 'Already admin', isAdmin: true };
      await userRef.update({ isAdmin: true });
      return { success: true, message: 'Admin privileges granted', isAdmin: true };
    }

    await userRef.set({
      isAdmin: true,
      email: request.auth.token.email || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, message: 'Admin created', isAdmin: true };

  } catch (error) {
    logger.error('❌ setupAdmin error:', error);
    throw new Error('Unable to set up admin');
  }
});
