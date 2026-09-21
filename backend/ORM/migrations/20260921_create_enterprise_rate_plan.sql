CREATE TABLE IF NOT EXISTS enterprise_rate_plans (
                                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id VARCHAR(255) NOT NULL,
    price_per_property DECIMAL(10, 2) NOT NULL DEFAULT 49.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    billing_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE INDEX idx_enterprise_rate_plans_enterprise_id ON enterprise_rate_plans(enterprise_id);