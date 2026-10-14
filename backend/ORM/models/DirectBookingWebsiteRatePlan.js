import { EntitySchema } from "typeorm";

export const DirectBookingWebsiteRatePlan = new EntitySchema({
  name: "DirectBookingWebsiteRatePlan",
  tableName: "direct_booking_website_rate_plans",
  columns: {
    id: { primary: true, type: "uuid", generated: "uuid", nullable: false },
    account_id: { type: "varchar", length: 255, nullable: false },
    plan: { type: "varchar", length: 20, nullable: false },
    price_cents: { type: "integer", nullable: false },
    currency: { type: "varchar", length: 3, nullable: false, default: "EUR" },
    billing_frequency: { type: "varchar", length: 20, nullable: false, default: "monthly" },
    status: { type: "varchar", length: 20, nullable: false, default: "ACTIVE" },
    effective_from: { type: "timestamp with time zone", nullable: false, default: () => "CURRENT_TIMESTAMP" },
    effective_until: { type: "timestamp with time zone", nullable: true },
    stripe_customer_id: { type: "varchar", length: 255, nullable: true },
    stripe_subscription_id: { type: "varchar", length: 255, nullable: true },
    created_at: { type: "timestamp with time zone", nullable: false, default: () => "CURRENT_TIMESTAMP" },
    updated_at: { type: "timestamp with time zone", nullable: false, default: () => "CURRENT_TIMESTAMP" },
  },
});
