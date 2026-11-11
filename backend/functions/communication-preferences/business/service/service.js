import { CommunicationPreferencesRepository } from "../../data/repository.js";
import { HostNotificationPreferencesRepository } from "../../data/hostNotificationPreferencesRepository.js";
import { DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES, DEFAULT_HOST_NOTIFICATION_PREFERENCES, HOST_NOTIFICATION_EVENT_KEYS, isRequiredHostNotificationEmail } from "../hostNotificationMatrixConfig.js";
import { badRequest } from "../../util/httpErrors.js";

export const DEFAULT_COMMUNICATION_PREFERENCES = Object.freeze({
  reservation: Object.freeze({ email: true, sms: false, push: true }),
  cancellation: Object.freeze({ email: true, sms: true, push: true }),
  messages: Object.freeze({ email: true, sms: false, push: true }),
});

export const ALLOWED_COMMUNICATION_PREFERENCE_PERSONAS = Object.freeze(["HOST", "GUEST"]);

const EVENT_KEYS = ["reservation", "cancellation", "messages"];
const CHANNEL_KEYS = ["email", "sms", "push"];
const SPOOFED_USER_ID_KEYS = ["userId", "user_id", "cognitoUserId", "sub"];
const HOST_NOTIFICATION_CHANNEL_KEYS = ["inApp", "email", "sms"];
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const cloneHostNotificationDefaults = () => Object.fromEntries(
  Object.entries(DEFAULT_HOST_NOTIFICATION_PREFERENCES).map(([eventKey, channels]) => [
    eventKey,
    { ...channels },
  ])
);

const normalizeStoredHostNotificationChannels = (eventKey, storedChannels) => {
  let channels;
  if (typeof storedChannels === "boolean") {
    channels = storedChannels
      ? { ...DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES }
      : { inApp: false, email: false, sms: false };
  } else if (!storedChannels || typeof storedChannels !== "object" || Array.isArray(storedChannels)) {
    channels = { ...DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES };
  } else {
    channels = Object.fromEntries(HOST_NOTIFICATION_CHANNEL_KEYS.map((channelKey) => [
      channelKey,
      typeof storedChannels[channelKey] === "boolean"
        ? storedChannels[channelKey]
        : DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES[channelKey],
    ]));
  }

  if (isRequiredHostNotificationEmail(eventKey)) channels.email = true;
  return channels;
};

const LEGACY_EVENT_PREFERENCE_MAP = Object.freeze({
  manager_new_booking: "reservation",
  manager_booking_modification: "reservation",
  manager_cancellation: "cancellation",
  booking_inquiry_received: "reservation",
  booking_created: "reservation",
  booking_confirmed: "reservation",
  booking_modified: "reservation",
  booking_cancelled_by_guest: "cancellation",
  booking_cancelled_by_host: "cancellation",
  booking_cancellation_refund_initiated: "cancellation",
  booking_cancellation_refund_completed: "cancellation",
  owner_new_booking: "reservation",
  owner_booking_cancelled: "cancellation",
  manager_new_guest_message: "messages",
  manager_unanswered_message: "messages",
});

const getLegacyChannels = (record, eventKey) => {
  const defaults = DEFAULT_COMMUNICATION_PREFERENCES[eventKey];
  return {
    email: eventKey === "messages"
      ? record.messages_email ?? defaults.email
      : true,
    sms: record[`${eventKey}_sms`] ?? defaults.sms,
    push: record[`${eventKey}_push`] ?? defaults.push,
  };
};

const mapLegacyHostPreferences = (record) => Object.fromEntries(
  HOST_NOTIFICATION_EVENT_KEYS.map((eventKey) => {
    const legacyEvent = LEGACY_EVENT_PREFERENCE_MAP[eventKey];
    if (!legacyEvent) return [eventKey, { ...DEFAULT_HOST_NOTIFICATION_CHANNEL_PREFERENCES }];

    const channels = getLegacyChannels(record, legacyEvent);
    return [eventKey, {
      inApp: channels.push,
      email: isRequiredHostNotificationEmail(eventKey) ? true : channels.email,
      sms: channels.sms,
    }];
  })
);

const cloneDefaults = () => Object.fromEntries(
  EVENT_KEYS.map((eventKey) => [eventKey, { ...DEFAULT_COMMUNICATION_PREFERENCES[eventKey] }])
);

export const normalizePersona = (persona) => {
  const normalized = String(persona || "").trim().toUpperCase();
  if (!ALLOWED_COMMUNICATION_PREFERENCE_PERSONAS.includes(normalized)) {
    throw badRequest("persona must be one of HOST or GUEST.");
  }
  return normalized;
};

export class CommunicationPreferencesService {
  constructor({ repository = new CommunicationPreferencesRepository(), hostNotificationRepository = new HostNotificationPreferencesRepository(), now = () => Date.now() } = {}) {
    this.repository = repository;
    this.hostNotificationRepository = hostNotificationRepository;
    this.now = now;
  }

  async getPreferences(userId, persona) {
    const normalizedPersona = normalizePersona(persona);
    const record = await this.repository.findByUserIdAndPersona(userId, normalizedPersona);
    if (!record) return cloneDefaults();
    return this.toApi(record);
  }

  async savePreferences(userId, persona, payload) {
    const normalizedPersona = normalizePersona(persona);
    const preferences = this.validateCompleteMatrix(payload);
    const existing = await this.repository.findByUserIdAndPersona(userId, normalizedPersona);
    const now = this.now();
    const record = {
      user_id: userId,
      persona: normalizedPersona,
      ...this.toRecordColumns(preferences),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await this.repository.save(record);
    return this.toApi(record);
  }

  async getHostNotificationPreferences(userId) {
    const record = await this.hostNotificationRepository.findByUserId(userId);
    if (!record) {
      const legacyRecord = await this.repository.findByUserIdAndPersona(userId, "HOST");
      return legacyRecord ? mapLegacyHostPreferences(legacyRecord) : cloneHostNotificationDefaults();
    }

    let stored;
    try {
      stored = JSON.parse(record.preferences || "{}");
    } catch {
      throw new Error("Stored host notification preferences are invalid.");
    }

    return Object.fromEntries(
      HOST_NOTIFICATION_EVENT_KEYS.map((eventKey) => [
        eventKey,
        normalizeStoredHostNotificationChannels(eventKey, stored?.[eventKey]),
      ])
    );
  }

  async saveHostNotificationPreferences(userId, payload) {
    const preferences = this.validateHostNotificationPreferences(payload);
    const existing = await this.hostNotificationRepository.findByUserId(userId);
    const now = this.now();

    await this.hostNotificationRepository.save({
      user_id: userId,
      preferences: JSON.stringify(preferences),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    });

    return preferences;
  }

  validateHostNotificationPreferences(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw badRequest("Request body must be a host notification preferences object.");
    }

    for (const key of Object.keys(payload)) {
      if (!HOST_NOTIFICATION_EVENT_KEYS.includes(key)) {
        throw badRequest(`Unknown host notification preference: ${key}.`);
      }
    }

    const preferences = {};
    for (const eventKey of HOST_NOTIFICATION_EVENT_KEYS) {
      const eventChannels = payload[eventKey];
      if (!eventChannels || typeof eventChannels !== "object" || Array.isArray(eventChannels)) {
        throw badRequest(`Host notification channels for ${eventKey} are required.`);
      }

      for (const channelKey of Object.keys(eventChannels)) {
        if (!HOST_NOTIFICATION_CHANNEL_KEYS.includes(channelKey)) {
          throw badRequest(`Unknown host notification channel: ${channelKey}.`);
        }
      }

      preferences[eventKey] = {};
      for (const channelKey of HOST_NOTIFICATION_CHANNEL_KEYS) {
        if (!hasOwn(eventChannels, channelKey)) {
          throw badRequest(`Host notification channel ${eventKey}.${channelKey} is required.`);
        }
        if (typeof eventChannels[channelKey] !== "boolean") {
          throw badRequest(`Host notification channel ${eventKey}.${channelKey} must be a boolean.`);
        }
        preferences[eventKey][channelKey] = eventChannels[channelKey];
      }

      if (isRequiredHostNotificationEmail(eventKey)) preferences[eventKey].email = true;
    }

    return preferences;
  }

  validateCompleteMatrix(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw badRequest("Request body must be a communication preferences object.");
    }

    for (const key of Object.keys(payload)) {
      if (SPOOFED_USER_ID_KEYS.includes(key)) {
        throw badRequest("userId must not be provided for communication preferences.");
      }
      if (!EVENT_KEYS.includes(key)) {
        throw badRequest(`Unknown communication preferences field: ${key}.`);
      }
    }

    const preferences = {};
    for (const eventKey of EVENT_KEYS) {
      const eventValue = payload[eventKey];
      if (!eventValue || typeof eventValue !== "object" || Array.isArray(eventValue)) {
        throw badRequest(`${eventKey} preferences are required.`);
      }

      for (const key of Object.keys(eventValue)) {
        if (!CHANNEL_KEYS.includes(key)) {
          throw badRequest(`Unknown ${eventKey} preference field: ${key}.`);
        }
      }

      preferences[eventKey] = {};
      for (const channelKey of CHANNEL_KEYS) {
        if (!hasOwn(eventValue, channelKey)) {
          throw badRequest(`${eventKey}.${channelKey} is required.`);
        }
        if (typeof eventValue[channelKey] !== "boolean") {
          throw badRequest(`${eventKey}.${channelKey} must be a boolean.`);
        }
        preferences[eventKey][channelKey] = eventValue[channelKey];
      }
    }

    preferences.reservation.email = true;
    preferences.cancellation.email = true;
    return preferences;
  }

  toApi(record) {
    return Object.fromEntries(
      EVENT_KEYS.map((eventKey) => [eventKey, getLegacyChannels(record, eventKey)])
    );
  }

  toRecordColumns(preferences) {
    return {
      reservation_email: true,
      reservation_sms: preferences.reservation.sms,
      reservation_push: preferences.reservation.push,
      cancellation_email: true,
      cancellation_sms: preferences.cancellation.sms,
      cancellation_push: preferences.cancellation.push,
      messages_email: preferences.messages.email,
      messages_sms: preferences.messages.sms,
      messages_push: preferences.messages.push,
    };
  }
}
