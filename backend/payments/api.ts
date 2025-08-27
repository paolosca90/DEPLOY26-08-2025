import { api } from "encore.dev/api";

// Servizio Pagamenti Semplificato
// Questo è una versione di test che non usa Stripe per evitare errori di compilazione

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

export interface SubscriptionStatus {
  userId: number;
  plan: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Prezzi in centesimi (€97.00 = 9700 centesimi)
const PRICING = {
  professional: {
    monthly: 9700, // €97.00 mensile
    yearly: 93600,  // €936.00 annuale (sconto 20%)
  },
  enterprise: {
    monthly: 29700, // €297.00 mensile  
    yearly: 285120, // €2851.20 annuale (sconto 20%)
  }
};

// Mock: Crea un "pagamento" di test (in realtà solo simula)
export const createPaymentIntent = api<CreatePaymentIntentRequest, CreatePaymentIntentResponse>({
  method: "POST",
  path: "/payments/create-intent",
  expose: true,
}, async ({ userId, plan, billingCycle }) => {
  console.log(`💳 Mock payment per User ${userId}: Piano ${plan} (${billingCycle})`);
  
  // Calcola l'importo in base al piano scelto
  const amount = PRICING[plan][billingCycle];
  const amountInEuros = amount / 100; // Converte centesimi in euro
  
  console.log(`💰 Importo: €${amountInEuros}`);
  
  // Simula la creazione di un pagamento (non vero)
  const mockClientSecret = `pi_mock_${Date.now()}_secret_test123`;
  const mockPaymentIntentId = `pi_mock_${Date.now()}`;
  
  return {
    success: true,
    clientSecret: mockClientSecret,
    paymentIntentId: mockPaymentIntentId,
  };
});

// Mock: Ottiene lo stato dell'abbonamento (simulato)
export const getSubscriptionStatus = api<{ userId: number }, { status: SubscriptionStatus | null }>({
  method: "GET",
  path: "/payments/subscription/:userId",
  expose: true,
}, async ({ userId }) => {
  console.log(`📊 Mock subscription status per User ${userId}`);
  
  // Simula un abbonamento attivo per test
  const mockStatus: SubscriptionStatus = {
    userId,
    plan: "professional",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 giorni da oggi
    cancelAtPeriodEnd: false
  };
  
  return { status: mockStatus };
});

// Mock: Gestisce webhook di Stripe (simulato)
export const stripeWebhook = api<{ signature: string, payload: string }, { success: boolean }>({
  method: "POST",
  path: "/payments/stripe-webhook",
  expose: true,
}, async ({ signature, payload }) => {
  console.log("🔔 Mock Stripe webhook ricevuto");
  console.log(`Signature: ${signature.substring(0, 20)}...`);
  console.log(`Payload length: ${payload.length} chars`);
  
  return { success: true };
});