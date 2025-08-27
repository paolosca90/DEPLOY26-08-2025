-- Drop triggers first
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
DROP TRIGGER IF EXISTS update_payment_intents_updated_at ON payment_intents;
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_stripe_customers_user_id;
DROP INDEX IF EXISTS idx_stripe_customers_stripe_id;
DROP INDEX IF EXISTS idx_payment_intents_user_id;
DROP INDEX IF EXISTS idx_payment_intents_stripe_id;
DROP INDEX IF EXISTS idx_payment_intents_status;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_stripe_id;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_invoices_user_id;
DROP INDEX IF EXISTS idx_invoices_stripe_id;
DROP INDEX IF EXISTS idx_invoices_status;
DROP INDEX IF EXISTS idx_payment_audit_user_id;
DROP INDEX IF EXISTS idx_payment_audit_event_type;
DROP INDEX IF EXISTS idx_payment_audit_created_at;

-- Drop tables in reverse order
DROP TABLE IF EXISTS payment_audit_log;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS payment_intents;
DROP TABLE IF EXISTS stripe_customers;