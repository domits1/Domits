import { CommunicationPreferencesRepository } from "../../data/repository.js";
import { badRequest } from "../../util/httpErrors.js";

export const DEFAULT_COMMUNICATION_PREFERENCES = Object.freeze({
  reservation: Object.freeze({
    email: true,
    sms: false,
    push: true,
  }),
  cancellation: Object.freeze({
    email: true,
    sms: true,
    push: true,
  }),
  messages: Object.freeze({
    email: true,
    sms: false,
    push: true,
  }),
});

export const ALLOWED_COMMUNICATION_PREFERENCE_PERSONAS = Object.freeze(["HOST", "GUEST"]);

const EVENT_KEYS = ["reservation", "cancellation", "messages"];
const CHANNEL_KEYS = ["email", "sms", "push"];
const SPOOFED_USER_ID_KEYS = ["userId", "user_id", "cognitoUserId", "sub"];

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const cloneDefaults = () => ({
  reservation: { ...DEFAULT_COMMUNICATION_PREFERENCES.reservation },
  cancellation: { ...DEFAULT_COMMUNICATION_PREFERENCES.cancellation },
  messages: { ...DEFAULT_COMMUNICATION_PREFERENCES.messages },
});

export const normalizePersona = (persona) => {
  const normalized = String(persona || "").trim().toUpperCase();
  if (!ALLOWED_COMMUNICATION_PREFERENCE_PERSONAS.includes(normalized)) {
    throw badRequest("persona must be one of HOST or GUEST.");
  }
  return normalized;
};

export class CommunicationPreferencesService {
  constructor({ repository = new CommunicationPreferencesRepository(), now = () => Date.now() } = {}) {
    this.repository = repository;
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
    return {
      reservation: {
        email: true,
        sms: record.reservation_sms ?? DEFAULT_COMMUNICATION_PREFERENCES.reservation.sms,
        push: record.reservation_push ?? DEFAULT_COMMUNICATION_PREFERENCES.reservation.push,
      },
      cancellation: {
        email: true,
        sms: record.cancellation_sms ?? DEFAULT_COMMUNICATION_PREFERENCES.cancellation.sms,
        push: record.cancellation_push ?? DEFAULT_COMMUNICATION_PREFERENCES.cancellation.push,
      },
      messages: {
        email: record.messages_email ?? DEFAULT_COMMUNICATION_PREFERENCES.messages.email,
        sms: record.messages_sms ?? DEFAULT_COMMUNICATION_PREFERENCES.messages.sms,
        push: record.messages_push ?? DEFAULT_COMMUNICATION_PREFERENCES.messages.push,
      },
    };
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
