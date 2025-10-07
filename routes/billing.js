const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/billing/plans
// @desc    Get available plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = await req.billingService.getPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/billing/plans/:id
// @desc    Get plan details
// @access  Public
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await req.billingService.getPlan(req.params.id);
    res.json({ plan });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/billing/subscription
// @desc    Get user subscription
// @access  Private
router.get('/subscription', auth, async (req, res) => {
  try {
    const subscription = await req.billingService.getSubscription(req.user);
    res.json({ subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/billing/subscription
// @desc    Create subscription
// @access  Private
router.post('/subscription', [
  auth,
  body('planId').isMongoId().withMessage('Valid plan ID is required'),
  body('paymentMethodId').isString().withMessage('Payment method ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planId, paymentMethodId } = req.body;
    const subscription = await req.billingService.createSubscription(req.user, planId, paymentMethodId);

    res.json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   PUT /api/billing/subscription
// @desc    Update subscription
// @access  Private
router.put('/subscription', [
  auth,
  body('planId').isMongoId().withMessage('Valid plan ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { planId } = req.body;
    const subscription = await req.billingService.updateSubscription(req.user, planId);

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   DELETE /api/billing/subscription
// @desc    Cancel subscription
// @access  Private
router.delete('/subscription', auth, async (req, res) => {
  try {
    const subscription = await req.billingService.cancelSubscription(req.user);
    res.json({
      message: 'Subscription canceled successfully',
      subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/billing/subscription/reactivate
// @desc    Reactivate subscription
// @access  Private
router.post('/subscription/reactivate', auth, async (req, res) => {
  try {
    const subscription = await req.billingService.reactivateSubscription(req.user);
    res.json({
      message: 'Subscription reactivated successfully',
      subscription
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   GET /api/billing/invoices
// @desc    Get user invoices
// @access  Private
router.get('/invoices', auth, async (req, res) => {
  try {
    const invoices = await req.billingService.getInvoices(req.user);
    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/billing/payment-intent
// @desc    Create payment intent
// @access  Private
router.post('/payment-intent', [
  auth,
  body('amount').isNumeric().withMessage('Amount is required'),
  body('currency').optional().isString().withMessage('Currency must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency = 'usd' } = req.body;
    const paymentIntent = await req.billingService.createPaymentIntent(req.user, amount, currency);

    res.json({
      message: 'Payment intent created successfully',
      paymentIntent
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   POST /api/billing/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = req.billingService.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    await req.billingService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook error' });
  }
});

module.exports = router;
