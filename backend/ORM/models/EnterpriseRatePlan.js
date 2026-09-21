import { EntitySchema } from "typeorm";

export const EnterpriseRatePlan = new EntitySchema({
  name: "EnterpriseRatePlan",
  tableName: "enterprise_rate_plans",
  columns: {
    id: {
      primary: true,
      type: "uuid",
      generated: false,
      nullable: false,
    },
    enterprise_id: {
      type: "varchar",
      nullable: false,
    },
    price_per_property: {
      type: "numeric",
      precision: 10,
      scale: 2,
      nullable: false,
      default: 49.00,
    },
    currency: {
      type: "varchar",
      length: 3,
      nullable: false,
      default: "EUR",
    },
    billing_frequency: {
      type: "varchar",
      length: 20,
      nullable: false,
      default: "monthly",
    },
    status: {
      type: "varchar",
      length: 20,
      nullable: false,
      default: "active",
    },
    effective_from: {
      type: "timestamp with time zone",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP",
    },
    effective_until: {
      type: "timestamp with time zone",
      nullable: true,
    },
    created_at: {
      type: "timestamp with time zone",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP",
    },
    updated_at: {
      type: "timestamp with time zone",
      nullable: false,
      default: () => "CURRENT_TIMESTAMP",
    },
  },
});