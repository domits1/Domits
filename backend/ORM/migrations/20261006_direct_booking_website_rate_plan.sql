CREATE TABLE IF NOT EXISTS main.direct_booking_website_rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id VARCHAR(255) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT direct_booking_website_rate_plan_plan_check CHECK (plan IN ('essentials', 'elite')),
    CONSTRAINT direct_booking_website_rate_plan_price_check CHECK (price_cents >= 0)
);

CREATE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_account_idx
ON main.direct_booking_website_rate_plans (account_id, effective_from DESC);

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_current_unique
ON main.direct_booking_website_rate_plans (account_id)
WHERE status IN ('ACTIVE', 'PAST_DUE', 'TRIALING');

CREATE UNIQUE INDEX ASYNC IF NOT EXISTS direct_booking_website_rate_plan_subscription_unique
ON main.direct_booking_website_rate_plans (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;
