import { api } from "encore.dev/api";
import { Secret } from "encore.dev/config";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const db = new SQLDatabase("payments", {
  migrations: "./migrations",
});

// Stripe configuration (disabled for testing)
const STRIPE_SECRET_KEY = new Secret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = new Secret("STRIPE_WEBHOOK_SECRET");
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === "true"; // false by default

// Types
export interface CreatePaymentIntentRequest {
  userId: number;
  plan: "professional" | "enterprise";
  billingCycle: "monthly" | "yearly";
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface PaymentWebhookRequest {
  signature: string;
  payload: string;
}

export interface PaymentWebhookResponse {
  success: boolean;
  error?: string;
}

export interface SubscriptionStatus {
  userId: number;
  plan: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Pricing configuration
const PRICING = {
  professional: {
    monthly: 9700, // €97.00 in cents
    yearly: 93600,  // €936.00 in cents (20% discount)
  },
  enterprise: {
    monthly: 29700, // €297.00 in cents  
    yearly: 285120, // €2851.20 in cents (20% discount)
  }
};

// Mock Stripe functions (for testing without real payments)
async function createStripeCustomerMock(email: string, name: string): Promise<{ id: string }> {
  console.log(`[MOCK STRIPE] Creating customer: ${name} (${email})`);
  return { id: `cus_mock_${Date.now()}` };
}

async function createPaymentIntentMock(
  amount: number, 
  currency: string, 
  customerId: string,
  metadata: any
): Promise<{ id: string, client_secret: string }> {
  console.log(`[MOCK STRIPE] Creating payment intent: €${amount/100} for customer ${customerId}`);
  return {
    id: `pi_mock_${Date.now()}`,
    client_secret: `pi_mock_${Date.now()}_secret_test123`
  };
}

async function createSubscriptionMock(
  customerId: string,
  priceId: string,
  metadata: any
): Promise<{ id: string, status: string, current_period_end: number }> {
  console.log(`[MOCK STRIPE] Creating subscription for customer ${customerId} with price ${priceId}`);
  return {
    id: `sub_mock_${Date.now()}`,
    status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
  };
}

// Real Stripe integration (when enabled)
async function createStripeCustomerReal(email: string, name: string): Promise<{ id: string }> {
  const stripeKey = await STRIPE_SECRET_KEY();
  
  const response = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email,
      name,
      metadata: JSON.stringify({
        source: "ai-encore-registration"
      })
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe customer creation failed: ${error}`);
  }

  return await response.json();
}

// API Endpoints

// Create payment intent for subscription
export const createPaymentIntent = api<CreatePaymentIntentRequest, CreatePaymentIntentResponse>({
  method: "POST",
  path: "/payments/create-intent",
  expose: true,
}, async ({ userId, plan, billingCycle }) => {
  try {
    if (!PAYMENTS_ENABLED) {
      // Mock response for testing
      console.log(`[MOCK] Payment intent for User ${userId}, Plan: ${plan}, Cycle: ${billingCycle}`);
      
      const mockAmount = PRICING[plan][billingCycle];
      const mockClientSecret = `pi_mock_${Date.now()}_secret_test123`;
      
      return {
        success: true,
        clientSecret: mockClientSecret,
        paymentIntentId: `pi_mock_${Date.now()}`,
      };
    }

    // Get user information
    const authService = await import("../auth/api");
    const { user } = await authService.getProfile({ userId });
    
    if (!user) {
      return { success: false, error: "Utente non trovato" };
    }

    // Get or create Stripe customer
    let stripeCustomerId = await getStripeCustomerId(userId);
    
    if (!stripeCustomerId) {
      const customer = await createStripeCustomerReal(user.email, `${user.firstName} ${user.lastName}`);
      stripeCustomerId = customer.id;
      
      // Save customer ID to database
      await db.query`
        INSERT INTO stripe_customers (user_id, stripe_customer_id, created_at)
        VALUES (${userId}, ${stripeCustomerId}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${stripeCustomerId}
      `;
    }

    // Calculate amount
    const amount = PRICING[plan][billingCycle];
    
    // Create payment intent
    const paymentIntent = await createPaymentIntentReal(
      amount,
      "eur",
      stripeCustomerId,
      {
        user_id: userId.toString(),
        plan,
        billing_cycle: billingCycle,
        source: "ai-encore"
      }
    );

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };

  } catch (error: any) {
    console.error("Create payment intent error:", error);
    return {
      success: false,
      error: "Errore durante la creazione del pagamento"
    };
  }
});

// Stripe webhook handler
export const stripeWebhook = api<PaymentWebhookRequest, PaymentWebhookResponse>({
  method: "POST",
  path: "/payments/stripe-webhook", 
  expose: true,
}, async ({ signature, payload }) => {
  try {
    if (!PAYMENTS_ENABLED) {
      console.log("[MOCK] Stripe webhook received (payments disabled)");
      return { success: true };
    }

    // Verify webhook signature
    const webhookSecret = await STRIPE_WEBHOOK_SECRET();
    // TODO: Implement Stripe webhook signature verification
    
    const event = JSON.parse(payload);
    
    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return { success: true };

  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Get subscription status
export const getSubscriptionStatus = api<{ userId: number }, { status: SubscriptionStatus | null }>({
  method: "GET",
  path: "/payments/subscription/:userId",
  expose: true,
}, async ({ userId }) => {
  try {
    const result = await db.query`
      SELECT plan, status, current_period_end, cancel_at_period_end
      FROM user_subscriptions 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return { status: null };
    }

    const sub = result[0];
    
    return {
      status: {
        userId,
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end || false
      }
    };

  } catch (error: any) {
    console.error("Get subscription status error:", error);
    return { status: null };
  }
});

// Helper functions
async function getStripeCustomerId(userId: number): Promise<string | null> {
  const result = await db.query`
    SELECT stripe_customer_id 
    FROM stripe_customers 
    WHERE user_id = ${userId}
  `;
  
  return result.length > 0 ? result[0].stripe_customer_id : null;
}

async function createPaymentIntentReal(
  amount: number,
  currency: string,
  customerId: string,
  metadata: any
): Promise<{ id: string, client_secret: string }> {
  const stripeKey = await STRIPE_SECRET_KEY();
  
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: amount.toString(),
      currency,
      customer: customerId,
      "metadata[user_id]": metadata.user_id,
      "metadata[plan]": metadata.plan,
      "metadata[billing_cycle]": metadata.billing_cycle,
      "metadata[source]": metadata.source,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Stripe payment intent creation failed: ${error}`);
  }

  return await response.json();
}

async function handlePaymentSucceeded(paymentIntent: any): Promise<void> {
  const userId = parseInt(paymentIntent.metadata.user_id);
  const plan = paymentIntent.metadata.plan;
  const billingCycle = paymentIntent.metadata.billing_cycle;

  console.log(`Payment succeeded for user ${userId}: ${plan} (${billingCycle})`);

  // Update user subscription in database
  const authService = await import("../auth/api");
  // TODO: Update subscription status to active
}

async function handleSubscriptionUpdated(subscription: any): Promise<void> {
  console.log(`Subscription updated: ${subscription.id}`);
  // TODO: Update subscription in database
}

async function handleSubscriptionCancelled(subscription: any): Promise<void> {
  console.log(`Subscription cancelled: ${subscription.id}`);
  // TODO: Update subscription status to cancelled
}

async function handlePaymentFailed(invoice: any): Promise<void> {
  console.log(`Payment failed for invoice: ${invoice.id}`);
  // TODO: Send payment failure notification to user
}