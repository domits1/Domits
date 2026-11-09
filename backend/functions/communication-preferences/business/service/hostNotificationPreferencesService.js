import { HostNotificationPreferencesRepository } from "../../data/hostNotificationPreferencesRepository.js";
import { HttpError, badRequest } from "../../util/httpErrors.js";

export const HOST_NOTIFICATION_EVENT_KEYS = Object.freeze({
  bookings: Object.freeze([
    "bookingInquiryReceived", "bookingCreated", "bookingConfirmed", "bookingModified",
    "bookingCancelledByGuest", "bookingCancelledByHost", "cancellationRefundInitiated",
    "cancellationRefundCompleted", "bookingPaymentFailed", "bookingPaymentReceived",
    "paymentPartiallyReceived", "paymentOverdue", "bookingDateApproaching",
    "checkInApproaching", "checkOutApproaching", "guestNoShow", "bookingCompleted",
  ]),
  propertyManager: Object.freeze([
    "newBooking", "bookingModification", "cancellation", "paymentFailure",
    "doubleBookingRisk", "channelDisconnected", "calendarSyncFailed", "listingMappingError",
    "newGuestMessage", "unansweredMessage", "cleaningTaskCreated", "cleaningTaskOverdue",
    "maintenanceIssue", "checkInIssue", "reviewReceived", "lowReview", "payoutGenerated",
    "payoutFailed", "kycRequired", "propertyUnpublished",
  ]),
  staff: Object.freeze([
    "staffNewBooking", "cleaningRequired", "cleaningAssigned", "cleaningOverdue",
    "staffMaintenanceIssue", "guestArrival", "guestDeparture", "guestRequest",
    "emergencyPropertyIssue", "taskCompleted",
  ]),
  propertyOwner: Object.freeze([
    "ownerNewBooking", "ownerBookingCancelled", "revenueReceived", "ownerPayoutGenerated",
    "payoutCompleted", "ownerPayoutFailed", "propertyUnavailable", "majorMaintenance",
    "negativeReview", "monthlyPerformanceReport", "monthlyStatement", "contractIssue",
  ]),
  finance: Object.freeze([
    "guestPaymentReceived", "financePaymentFailed", "refundInitiated", "refundCompleted",
    "financeOwnerPayoutGenerated", "financeOwnerPayoutFailed", "commissionCalculated",
    "reconciliationMismatch", "unmatchedTransaction", "chargeback", "taxReportingEvent",
    "accountingExportFailed",
  ]),
  distribution: Object.freeze([
    "listingPublished", "listingUnpublished", "channelConnected", "distributionChannelDisconnected",
    "apiAuthenticationFailed", "propertyMappingFailed", "rateSyncFailed",
    "availabilitySyncFailed", "reservationSyncFailed", "webhookFailed", "webhookDelayed",
    "duplicateReservationDetected", "inventoryMismatch", "channelApiOutage",
  ]),
  engineering: Object.freeze([
    "apiDowntime", "databaseFailure", "authenticationFailureSpike", "paymentServiceFailure",
    "bookingServiceFailure", "channelServiceFailure", "queueBacklog", "webhookBacklog",
    "errorRateSpike", "latencySpike", "securityIncident", "dataIntegrityIssue",
    "backupFailure", "deploymentFailure", "criticalTestFailure",
  ]),
  compliance: Object.freeze([
    "kycRequested", "kycReminder", "kycApproved", "kycRejected", "proofOfAddressRequired",
    "identityVerificationFailed", "complianceDocumentExpired", "suspiciousActivityDetected",
    "accountRestricted",
  ]),
});

const SECTION_KEYS = Object.freeze(Object.keys(HOST_NOTIFICATION_EVENT_KEYS));
const USER_ID_KEYS = Object.freeze(["userId", "user_id", "cognitoUserId", "sub"]);

const cloneDefaults = () => Object.fromEntries(
  SECTION_KEYS.map((sectionKey) => [
    sectionKey,
    Object.fromEntries(HOST_NOTIFICATION_EVENT_KEYS[sectionKey].map((eventKey) => [eventKey, true])),
  ])
);

const getClaimRoles = (claims = {}) => [
  claims["custom:group"],
  claims["custom:role"],
  claims.role,
  claims["cognito:groups"],
].flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
  .map((value) => String(value).trim().toLowerCase())
  .filter(Boolean);

export const hasHostNotificationAccess = (claims = {}) => {
  const allowedRoles = [
    "host",
    "staff",
    "admin",
    "engineer",
    "general manager",
    "reservation manager",
    "guest experience manager",
    "financial manager",
    "distribution manager",
    "revenue manager",
    "sales manager",
    "property operations manager",
    "housekeeping",
    "maintenance",
    "guest services",
  ];
  return getClaimRoles(claims).some((role) => allowedRoles.includes(role));
};

export const hasHostNotificationEngineeringAccess = (claims = {}) => {
  const roles = getClaimRoles(claims);
  return roles.includes("admin") || roles.includes("engineer");
};

const parseStoredPreferences = (record) => {
  if (!record) return cloneDefaults();

  let parsed;
  try {
    parsed = typeof record.preferences_json === "string"
      ? JSON.parse(record.preferences_json)
      : record.preferences_json;
  } catch {
    throw new Error("Stored host notification preferences contain invalid JSON.");
  }

  const defaults = cloneDefaults();
  return Object.fromEntries(
    SECTION_KEYS.map((sectionKey) => [
      sectionKey,
      Object.fromEntries(
        HOST_NOTIFICATION_EVENT_KEYS[sectionKey].map((eventKey) => [
          eventKey,
          typeof parsed?.[sectionKey]?.[eventKey] === "boolean"
            ? parsed[sectionKey][eventKey]
            : defaults[sectionKey][eventKey],
        ])
      ),
    ])
  );
};

const visiblePreferences = (preferences, canAccessEngineering) => {
  if (canAccessEngineering) return preferences;
  const { engineering, ...visible } = preferences;
  return visible;
};

export class HostNotificationPreferencesService {
  constructor({ repository = new HostNotificationPreferencesRepository(), now = () => Date.now() } = {}) {
    this.repository = repository;
    this.now = now;
  }

  async getPreferences(userId, claims = {}) {
    const canAccessEngineering = hasHostNotificationEngineeringAccess(claims);
    const record = await this.repository.findByUserId(userId);
    return visiblePreferences(parseStoredPreferences(record), canAccessEngineering);
  }

  validatePreferences(payload, canAccessEngineering) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw badRequest("Request body must be a host notification preferences object.");
    }

    for (const key of Object.keys(payload)) {
      if (USER_ID_KEYS.includes(key)) {
        throw badRequest("User identity must come from the authenticated session.");
      }
      if (!SECTION_KEYS.includes(key)) {
        throw badRequest(`Unknown host notification section: ${key}.`);
      }
      if (key === "engineering" && !canAccessEngineering) {
        throw new HttpError(403, "Engineering notification preferences require Admin or Engineer access.", "FORBIDDEN");
      }
    }

    const expectedSections = canAccessEngineering
      ? SECTION_KEYS
      : SECTION_KEYS.filter((key) => key !== "engineering");

    for (const sectionKey of expectedSections) {
      const section = payload[sectionKey];
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        throw badRequest(`${sectionKey} notification preferences are required.`);
      }

      const allowedEvents = HOST_NOTIFICATION_EVENT_KEYS[sectionKey];
      for (const eventKey of Object.keys(section)) {
        if (!allowedEvents.includes(eventKey)) {
          throw badRequest(`Unknown ${sectionKey} notification: ${eventKey}.`);
        }
      }

      for (const eventKey of allowedEvents) {
        if (typeof section[eventKey] !== "boolean") {
          throw badRequest(`${sectionKey}.${eventKey} must be a boolean.`);
        }
      }
    }

    return Object.fromEntries(
      expectedSections.map((sectionKey) => [
        sectionKey,
        Object.fromEntries(
          HOST_NOTIFICATION_EVENT_KEYS[sectionKey].map((eventKey) => [eventKey, payload[sectionKey][eventKey]])
        ),
      ])
    );
  }

  async savePreferences(userId, claims = {}, payload) {
    const canAccessEngineering = hasHostNotificationEngineeringAccess(claims);
    const submitted = this.validatePreferences(payload, canAccessEngineering);
    const existing = await this.repository.findByUserId(userId);
    const stored = parseStoredPreferences(existing);
    const preferences = {
      ...stored,
      ...submitted,
      ...(canAccessEngineering && submitted.engineering ? { engineering: submitted.engineering } : {}),
    };
    const now = this.now();

    await this.repository.save({
      user_id: userId,
      preferences_json: JSON.stringify(preferences),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });

    return visiblePreferences(preferences, canAccessEngineering);
  }
}
