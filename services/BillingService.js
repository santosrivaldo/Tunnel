const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Plan = require('../models/Plan');

class BillingService {
  constructor() {
    this.stripe = stripe;
  }

  async createCustomer(user) {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });

      // Update user with Stripe customer ID
      user.subscription.stripeCustomerId = customer.id;
      await user.save();

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async createSubscription(user, planId, paymentMethodId) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get or create Stripe customer
      let customerId = user.subscription.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(user);
        customerId = customer.id;
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Set as default payment method
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          {
            price: plan.stripe.monthlyPriceId,
          },
        ],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user subscription
      user.plan = plan.name;
      user.subscription.stripeSubscriptionId = subscription.id;
      user.subscription.status = 'active';
      user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      user.subscription.cancelAtPeriodEnd = false;

      // Update user limits based on plan
      user.limits = plan.getLimits();
      await user.save();

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(user) {
    try {
      const subscriptionId = user.subscription.stripeSubscriptionId;
      if (!subscriptionId) {
        throw new Error('No active subscription found');
      }

      // Cancel subscription at period end
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      // Update user
      user.subscription.cancelAtPeriodEnd = true;
      await user.save();

      return subscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  async reactivateSubscription(user) {
    try {
      const subscriptionId = user.subscription.stripeSubscriptionId;
      if (!subscriptionId) {
        throw new Error('No subscription found');
      }

      // Reactivate subscription
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update user
      user.subscription.cancelAtPeriodEnd = false;
      await user.save();

      return subscription;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  async updateSubscription(user, newPlanId) {
    try {
      const newPlan = await Plan.findById(newPlanId);
      if (!newPlan) {
        throw new Error('Plan not found');
      }

      const subscriptionId = user.subscription.stripeSubscriptionId;
      if (!subscriptionId) {
        throw new Error('No active subscription found');
      }

      // Get current subscription
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription
      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPlan.stripe.monthlyPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });

      // Update user
      user.plan = newPlan.name;
      user.limits = newPlan.getLimits();
      await user.save();

      return updatedSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  async getSubscription(user) {
    try {
      const subscriptionId = user.subscription.stripeSubscriptionId;
      if (!subscriptionId) {
        return null;
      }

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  async getInvoices(user) {
    try {
      const customerId = user.subscription.stripeCustomerId;
      if (!customerId) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: 10,
      });

      return invoices.data;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  async createPaymentIntent(user, amount, currency = 'usd') {
    try {
      const customerId = user.subscription.stripeCustomerId;
      if (!customerId) {
        throw new Error('No Stripe customer found');
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        customer: customerId,
        metadata: {
          userId: user._id.toString()
        }
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handleSubscriptionCreated(subscription) {
    try {
      const user = await User.findOne({
        'subscription.stripeSubscriptionId': subscription.id
      });

      if (user) {
        user.subscription.status = 'active';
        user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        await user.save();
      }
    } catch (error) {
      console.error('Error handling subscription created:', error);
    }
  }

  async handleSubscriptionUpdated(subscription) {
    try {
      const user = await User.findOne({
        'subscription.stripeSubscriptionId': subscription.id
      });

      if (user) {
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await user.save();
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error);
    }
  }

  async handleSubscriptionDeleted(subscription) {
    try {
      const user = await User.findOne({
        'subscription.stripeSubscriptionId': subscription.id
      });

      if (user) {
        user.plan = 'free';
        user.subscription.status = 'canceled';
        user.subscription.stripeSubscriptionId = null;
        user.subscription.currentPeriodEnd = null;
        user.subscription.cancelAtPeriodEnd = false;
        
        // Reset to free plan limits
        user.limits.maxTunnels = 1;
        user.limits.maxAgents = 1;
        user.limits.bandwidthLimit = 1024 * 1024 * 1024; // 1GB
        
        await user.save();
      }
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
    }
  }

  async handlePaymentSucceeded(invoice) {
    try {
      const user = await User.findOne({
        'subscription.stripeCustomerId': invoice.customer
      });

      if (user) {
        user.subscription.status = 'active';
        await user.save();
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error);
    }
  }

  async handlePaymentFailed(invoice) {
    try {
      const user = await User.findOne({
        'subscription.stripeCustomerId': invoice.customer
      });

      if (user) {
        user.subscription.status = 'past_due';
        await user.save();
      }
    } catch (error) {
      console.error('Error handling payment failed:', error);
    }
  }

  async getPlans() {
    try {
      const plans = await Plan.getActivePlans();
      return plans;
    } catch (error) {
      console.error('Error getting plans:', error);
      throw error;
    }
  }

  async getPlan(planId) {
    try {
      const plan = await Plan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }
      return plan;
    } catch (error) {
      console.error('Error getting plan:', error);
      throw error;
    }
  }
}

module.exports = BillingService;
