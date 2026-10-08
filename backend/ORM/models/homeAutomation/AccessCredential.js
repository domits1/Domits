import { EntitySchema } from "typeorm";

const bigintNumber = {
  type: "bigint",
  transformer: {
    from: (value) => (value === null || value === undefined ? value : Number(value)),
    to: (value) => value,
  },
};

// A guest's access to one device for one booking. The PIN or code itself is never stored here, only the
// provider's id for it (providerCredentialId, null until the provider has created it).
// failureReason says why a credential could not be created or revoked. It must never contain a PIN, an
// access code, a token or any other secret, only the reason for the failure.
// Status values live in ACCESS_CREDENTIAL_STATUS (functions/.shared/homeAutomation), which the ORM package
// cannot import, so the default below is a literal that a test keeps in step.
export const AccessCredential = new EntitySchema({
  name: "AccessCredential",
  tableName: "access_credential",
  columns: {
    id: { primary: true, type: "varchar", generated: false, nullable: false },
    integrationAccountId: { name: "integration_account_id", type: "varchar", nullable: false },
    bookingId: { name: "booking_id", type: "varchar", nullable: false },
    propertyId: { name: "property_id", type: "varchar", nullable: false },
    deviceId: { name: "device_id", type: "varchar", nullable: false },
    guestId: { name: "guest_id", type: "varchar", nullable: true },
    providerCredentialId: { name: "provider_credential_id", type: "varchar", nullable: true },
    credentialType: { name: "credential_type", type: "varchar", nullable: false },
    status: { type: "varchar", nullable: false, default: "PENDING" },
    validFrom: { name: "valid_from", ...bigintNumber, nullable: false },
    validUntil: { name: "valid_until", ...bigintNumber, nullable: false },
    revokedAt: { name: "revoked_at", ...bigintNumber, nullable: true },
    failureReason: { name: "failure_reason", type: "text", nullable: true },
    createdAt: { name: "created_at", ...bigintNumber, nullable: false },
    updatedAt: { name: "updated_at", ...bigintNumber, nullable: false },
  },
});
