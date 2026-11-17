import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// Written with raw SQL by CredentialLeaseRepository; the entity exists for the registration and the drift test.
export const CredentialLease = new EntitySchema({
  name: "CredentialLease",
  tableName: "home_automation_credential_lease",
  columns: {
    integrationAccountId: {
      name: "integration_account_id",
      primary: true,
      type: "varchar",
      length: 255,
      generated: false,
      nullable: false,
    },
    ownerId: { name: "owner_id", type: "varchar", length: 255, nullable: false },
    leaseExpiresAt: { name: "lease_expires_at", ...bigintNumber, nullable: false },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
    updatedAt: { name: "updated_at", ...bigintNumber, nullable: false },
  },
});
