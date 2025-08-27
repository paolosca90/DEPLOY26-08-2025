-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment intents table
CREATE TABLE IF NOT EXISTS payment_intents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'eur',
    status VARCHAR(50) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table (mirrors Stripe subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_subscription_id VARCHAR(255),
    amount_paid INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'eur',
    status VARCHAR(50) NOT NULL,
    invoice_pdf VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

-- Payment audit log
CREATE TABLE IF NOT EXISTS payment_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    event_type VARCHAR(100) NOT NULL, -- 'payment_intent.created', 'invoice.paid', etc.
    stripe_event_id VARCHAR(255),
    amount INTEGER,
    currency VARCHAR(3),
    status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_stripe_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE INDEX idx_payment_audit_user_id ON payment_audit_log(user_id);
CREATE INDEX idx_payment_audit_event_type ON payment_audit_log(event_type);
CREATE INDEX idx_payment_audit_created_at ON payment_audit_log(created_at);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stripe_customers_updated_at BEFORE UPDATE ON stripe_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();