import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../.shared/integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../.shared/integrations/repositories/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../.shared/integrations/repositories/integrationSyncRepository.js";
import ReservationLinkRepository from "../.shared/integrations/repositories/reservationLinkRepository.js";
import { shapeCredentialIntegrationForResponse } from "../.shared/integrations/integrationResponse.js";
import ChannexSyncEvidenceRepository from "../.shared/channelManagement/repositories/channexSyncEvidenceRepository.js";
import ChannexBookingRevisionRepository from "../.shared/channelManagement/repositories/channexBookingRevisionRepository.js";
import ChannexExternalBookingImportRepository from "../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";

import SyncRunner from "./syncRunner.js";
import WhatsAppCredentialStore from "./whatsappCredentialStore.js";
import HoliduCredentialStore from "../.shared/channelManagement/providers/holidu/credentialStore.js";
import HoliduProviderClient from "../.shared/channelManagement/providers/holidu/providerClient.js";
import ChannexCredentialStore from "../.shared/channelManagement/providers/channex/credentialStore.js";
import ChannexProviderClient from "../.shared/channelManagement/providers/channex/providerClient.js";
import ChannelManagementService from "../.shared/channelManagement/channelManagementService.js";
import ChannexBookingPollingService from "../.shared/channelManagement/services/channexBookingPollingService.js";
import ChannexBookingRevisionImportService from "../.shared/channelManagement/services/channexBookingRevisionImportService.js";
import ChannexAvailabilitySyncService from "../.shared/channelManagement/services/channexAvailabilitySyncService.js";
import ChannexMappingService from "../.shared/channelManagement/services/channexMappingService.js";
import ChannexAriPayloadService from "../.shared/channelManagement/services/channexAriPayloadService.js";
import ChannexAriExecutionService from "../.shared/channelManagement/services/channexAriExecutionService.js";
import ChannexAriOrchestrationService from "../.shared/channelManagement/services/channexAriOrchestrationService.js";
import ChannexFullSyncService from "../.shared/channelManagement/services/channexFullSyncService.js";
import ChannexCertificationService from "../.shared/channelManagement/services/channexCertificationService.js";
import ChannexDiagnosticsService from "../.shared/channelManagement/services/channexDiagnosticsService.js";
import {
  summarizeChannexGroupedPayloads,
} from "../.shared/channelManagement/utils/channexAriPayloadUtils.js";
import {
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  deriveEvidenceOutcome,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  resultListHasErrors,
  resultListHasWarnings,
} from "../.shared/channelManagement/utils/channexAriExecutionUtils.js";
import ChannexBookingAvailabilityBridge, {
  ChannexBookingAvailabilityRepository,
} from "../.shared/channelManagement/channexBookingAvailabilityBridge.js";

const nowMs = () => Date.now();
const daysToMs = (days) => days * 24 * 60 * 60 * 1000;
const TIME_WINDOWS_MS = Object.freeze({
  DAY: daysToMs(1),
  THREE_DAYS: daysToMs(3),
});
const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v22.0";
const PLACEHOLDER_REFRESH_STATUSES = new Set([
  "NEEDS_REAL_META_TOKEN_EXCHANGE",
  "PLACEHOLDER_REFRESHED",
]);

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });

const requireStr = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const requireEnv = (name) => {
  const value = requireStr(process.env[name]);
  if (!value) {
    const error = new Error(`Missing required env var: ${name}`);
    error.code = "MISSING_ENV";
    throw error;
  }
  return value;
};
const hasConfiguredEnvToken = () => !!requireStr(process.env.WHATSAPP_ACCESS_TOKEN);
const hasUsableSecretAccessToken = (secret) => !!requireStr(secret?.accessToken);
const isPlaceholderRefreshStatus = (value) => PLACEHOLDER_REFRESH_STATUSES.has(String(value || "").trim().toUpperCase());
const normalizeGraphPath = (path) => String(path || "").replace(/^\/+/, "");
const normalizeExpiresAt = (value) => {
  if (value == null) return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const normalizeExpiresIn = (value) => {
  if (value == null) return null;
  return Number(value);
};
const resolveTokenSource = (integration, secret) => {
  if (integration?.credentialsRef) {
    return hasUsableSecretAccessToken(secret) ? "SECRET" : "NONE";
  }

  return hasConfiguredEnvToken() ? "ENV" : "NONE";
};
const buildTokenState = ({
  status,
  needsReconnect,
  expiresAt,
  reliableExpiry,
  tokenSource,
  cause,
  message,
  shouldPersistReconnect,
}) => ({
  status,
  needsReconnect,
  expiresAt,
  reliableExpiry,
  tokenSource,
  cause,
  message,
  shouldPersistReconnect,
});
const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const out = [];

  for (const item of Array.isArray(items) ? items : []) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
};
const parseJsonSafely = (value) => {
  try {
    if (!value) return null;
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const parseTokenResponse = (rawText) => {
  const parsedJson = parseJsonSafely(rawText);
  if (parsedJson && typeof parsedJson === "object") return parsedJson;

  const params = new URLSearchParams(String(rawText || ""));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  return {
    access_token: accessToken,
    token_type: params.get("token_type") || null,
    expires_in: params.get("expires_in") || null,
  };
};
const categorizeMetaError = (error) => {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  if (code === "100" || message.includes("missing permission")) return "permission_denied";
  if (code === "190" || message.includes("invalid oauth")) return "invalid_token";
  if (message.includes("expired")) return "expired";
  if (message.includes("rate limit")) return "rate_limited";
  if (message.includes("not found") || message.includes("unsupported get request")) return "not_found";
  return "graph_request_failed";
};
const serializeRawPayload = (rawPayload) => {
  if (!rawPayload) return null;
  return typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload);
};

const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

const appendMissingMappingNotes = (notes, missingMappings) => {
  if (Array.isArray(missingMappings) && missingMappings.length) {
    return [...notes, `Missing mappings: ${missingMappings.join(", ")}`];
  }
  return notes;
};

const resolveSelectedWhatsAppNumber = (secret, integration) => {
  const selectableNumbers = Array.isArray(secret?.selectableNumbers) ? secret.selectableNumbers : [];
  const selectedPhoneNumberId =
    requireStr(secret?.selectedPhoneNumberId) || requireStr(integration?.externalAccountId) || null;
  if (!selectedPhoneNumberId) {
    return null;
  }

  return (
    selectableNumbers.find((item) => requireStr(item?.phoneNumberId) === selectedPhoneNumberId) || null
  );
};
const resolveWhatsAppPublicPhoneNumber = (secret, integration) =>
  requireStr(secret?.selectedPhoneNumber) || requireStr(resolveSelectedWhatsAppNumber(secret, integration)?.phoneNumber);
export default class IntegrationService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    ratePlans = new IntegrationRatePlanRepository(),
    roomTypes = new IntegrationRoomTypeRepository(),
    sync = new IntegrationSyncRepository(),
    resLinks = new ReservationLinkRepository(),
    channexEvidence = new ChannexSyncEvidenceRepository(),
    channexBookingRevisions = new ChannexBookingRevisionRepository(),
    bookingAvailabilityRepository = new ChannexBookingAvailabilityRepository(),
    externalBookingImportRepository = new ChannexExternalBookingImportRepository(),
    channexBookingAvailabilityBridge = new ChannexBookingAvailabilityBridge(),
    runner = new SyncRunner(),
    credentialStore = new WhatsAppCredentialStore(),
    holiduCredentialStore = new HoliduCredentialStore(),
    holiduProviderClient = new HoliduProviderClient(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
    channelManagementService = null,
    channexMappingService = null,
    channexAriPayloadService = null,
    channexAriExecutionService = null,
    channexAriOrchestrationService = null,
    channexFullSyncService = null,
    channexCertificationService = null,
    channexDiagnosticsService = null,
    channexBookingRevisionImportService = null,
    channexAvailabilitySyncService = null,
    channexBookingPollingService = null,
  } = {}) {
    this.accounts = accounts;
    this.props = props;
    this.ratePlans = ratePlans;
    this.roomTypes = roomTypes;
    this.sync = sync;
    this.resLinks = resLinks;
    this.channexEvidence = channexEvidence;
    this.channexBookingRevisions = channexBookingRevisions;
    this.bookingAvailabilityRepository = bookingAvailabilityRepository;
    this.externalBookingImportRepository = externalBookingImportRepository;
    this.channexBookingAvailabilityBridge = channexBookingAvailabilityBridge;
    this.runner = runner;
    this.credentialStore = credentialStore;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
    this.channelManagementService =
      channelManagementService ||
      new ChannelManagementService({
        accounts,
        sync,
        holiduCredentialStore,
        holiduProviderClient,
        channexCredentialStore,
        channexProviderClient,
      });
    this.channexMappingService =
      channexMappingService ||
      new ChannexMappingService({
        accounts,
        props,
        ratePlans,
        roomTypes,
        channexCredentialStore,
        channexProviderClient,
      });
    this.channexAriPayloadService =
      channexAriPayloadService ||
      new ChannexAriPayloadService({
        channexMappingService: this.channexMappingService,
        bookingAvailabilityRepository,
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      });
    this.channexDiagnosticsService =
      channexDiagnosticsService ||
      new ChannexDiagnosticsService({
        accounts,
        channexEvidence,
        getAccounts: () => this.accounts,
        getChannexEvidence: () => this.channexEvidence,
      });
    this.channexAriExecutionService =
      channexAriExecutionService ||
      new ChannexAriExecutionService({
        accounts,
        channexCredentialStore,
        channexProviderClient,
        finalizeChannexSyncResult: (result, evidenceInput, options) =>
          this.finalizeChannexSyncResult(result, evidenceInput, options),
        previewChannexAriPayloads: (...args) =>
          this.previewChannexAriPayloads(...args),
        previewChannexAvailabilityPayloads: (...args) =>
          this.previewChannexAvailabilityPayloads(...args),
        previewChannexRestrictionRatePayloads: (...args) =>
          this.previewChannexRestrictionRatePayloads(...args),
      });
    this.channexAriOrchestrationService =
      channexAriOrchestrationService ||
      new ChannexAriOrchestrationService({
        createChannexSyncFinalizer: (...args) => this.createChannexSyncFinalizer(...args),
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        syncChannexAvailability: (...args) => this.syncChannexAvailability(...args),
        syncChannexRestrictions: (...args) => this.syncChannexRestrictions(...args),
      });
    this.channexFullSyncService =
      channexFullSyncService ||
      new ChannexFullSyncService({
        channexProviderClient,
        normalizeChannexFullSyncDateContext: (...args) =>
          this.normalizeChannexFullSyncDateContext(...args),
        buildChannexFullSyncPayloadContext: (...args) =>
          this.buildChannexFullSyncPayloadContext(...args),
        buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
          this.buildChannexFullSyncAvailabilityPayloadContext(...args),
        buildChannexFullSyncRestrictionsPayloadContext: (...args) =>
          this.buildChannexFullSyncRestrictionsPayloadContext(...args),
        finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        buildChannexAriTargetsFailureEvidencePatch: (...args) =>
          this.buildChannexAriTargetsFailureEvidencePatch(...args),
        buildChannexMultiStepMappingSnapshot: (...args) =>
          this.buildChannexMultiStepMappingSnapshot(...args),
        buildBlockedChannexMultiStepSyncResult: (...args) =>
          this.buildBlockedChannexMultiStepSyncResult(...args),
        resolveChannexSyncCredentialContext: (...args) =>
          this.resolveChannexSyncCredentialContext(...args),
        logChannexFullCertificationSync: (...args) =>
          this.channexDiagnosticsService.logChannexFullCertificationSync(...args),
      });
    this.channexCertificationService =
      channexCertificationService ||
      new ChannexCertificationService({
        externalBookingImportRepository,
        channexBookingAvailabilityBridge,
        channexProviderClient,
        finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        buildChannexAriTargetsFailureEvidencePatch: (...args) =>
          this.buildChannexAriTargetsFailureEvidencePatch(...args),
        buildChannexMultiStepMappingSnapshot: (...args) =>
          this.buildChannexMultiStepMappingSnapshot(...args),
        buildBlockedChannexMultiStepSyncResult: (...args) =>
          this.buildBlockedChannexMultiStepSyncResult(...args),
        resolveChannexSyncCredentialContext: (...args) =>
          this.resolveChannexSyncCredentialContext(...args),
      });
    this.channexBookingRevisionImportService =
      channexBookingRevisionImportService ||
      new ChannexBookingRevisionImportService({
        accounts,
        props,
        ratePlans,
        roomTypes,
        resLinks,
        channexBookingRevisions,
        externalBookingImportRepository,
        channexBookingAvailabilityBridge,
        channexCredentialStore,
        channexProviderClient,
        finalizeChannexSyncResult: (result, evidenceInput, options) =>
          this.finalizeChannexSyncResult(result, evidenceInput, options),
      });
    this.channexAvailabilitySyncService =
      channexAvailabilitySyncService ||
      new ChannexAvailabilitySyncService({
        channexBookingAvailabilityBridge,
        channexProviderClient,
        createChannexSyncFinalizer: (config) => this.createChannexSyncFinalizer(config),
        buildSyncDateRangeValidationFailure,
        appendMissingMappingNotes,
        getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
        buildChannexAriTargetsFailureEvidencePatch: (...args) =>
          this.buildChannexAriTargetsFailureEvidencePatch(...args),
        buildChannexMultiStepMappingSnapshot: (...args) =>
          this.buildChannexMultiStepMappingSnapshot(...args),
        buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
          this.buildChannexFullSyncAvailabilityPayloadContext(...args),
        buildChannexFullSyncPayloadContext: (...args) =>
          this.buildChannexFullSyncPayloadContext(...args),
        resolveChannexSyncCredentialContext: (...args) =>
          this.resolveChannexSyncCredentialContext(...args),
        summarizeChannexGroupedPayloads,
        formatChannexAvailabilityProviderResult,
        formatChannexRestrictionProviderResult,
        collectTaskIdsFromResultList,
        collectWarningsFromResultList,
        collectErrorsFromResultList,
        resultListHasErrors,
        resultListHasWarnings,
        deriveEvidenceOutcome,
        describeLocalError,
      });
    this.channexBookingPollingService =
      channexBookingPollingService ||
      new ChannexBookingPollingService({
        accounts,
        props,
        sync,
        channexCredentialStore,
        pullLatestChannexBookingsForResolvedContext: (context) =>
          this.channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext(
            context
          ),
      });
  }

  logTokenLifecycle(level, message, integration, cause, extra = {}) {
    console[level](
      message,
      JSON.stringify({
        integrationAccountId: integration?.id || null,
        userId: integration?.userId || null,
        cause,
        ...extra,
      })
    );
  }

  evaluateWhatsAppTokenState(integration, secret) {
    const tokenSource = resolveTokenSource(integration, secret);

    if (!integration?.credentialsRef) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_credentials_ref",
        message: "WhatsApp credentials are not configured in Secrets Manager. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (!secret) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_secret",
        message: "WhatsApp credentials secret is missing. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (!hasUsableSecretAccessToken(secret)) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_access_token",
        message: "WhatsApp access token is missing from the stored credentials. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (isPlaceholderRefreshStatus(secret?.refreshStatus)) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: normalizeExpiresAt(secret?.expiresAt),
        reliableExpiry: false,
        tokenSource,
        cause: "placeholder_token_metadata",
        message: "WhatsApp token metadata is placeholder-only and cannot be trusted for lifecycle management.",
        shouldPersistReconnect: false,
      });
    }

    if (secret?.expiresAt == null) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "missing_expiry_metadata",
        message: "WhatsApp token expiry metadata is unavailable.",
        shouldPersistReconnect: false,
      });
    }

    const expiresAt = normalizeExpiresAt(secret?.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return buildTokenState({
        status: "UNKNOWN",
        needsReconnect: false,
        expiresAt: null,
        reliableExpiry: false,
        tokenSource,
        cause: "invalid_expiry_metadata",
        message: "WhatsApp token expiry metadata is invalid.",
        shouldPersistReconnect: false,
      });
    }

    const now = nowMs();
    if (expiresAt <= now) {
      return buildTokenState({
        status: "RECONNECT_REQUIRED",
        needsReconnect: true,
        expiresAt,
        reliableExpiry: true,
        tokenSource,
        cause: "expired_token",
        message: "WhatsApp token expired. Reconnect required.",
        shouldPersistReconnect: true,
      });
    }

    if (expiresAt - now <= TIME_WINDOWS_MS.THREE_DAYS) {
      return buildTokenState({
        status: "EXPIRING_SOON",
        needsReconnect: false,
        expiresAt,
        reliableExpiry: true,
        tokenSource,
        cause: "expiring_soon",
        message: "WhatsApp token is expiring soon.",
        shouldPersistReconnect: false,
      });
    }

    return buildTokenState({
      status: "HEALTHY",
      needsReconnect: false,
      expiresAt,
      reliableExpiry: true,
      tokenSource,
      cause: "healthy",
      message: "WhatsApp token is configured and expiry metadata is available.",
      shouldPersistReconnect: false,
    });
  }

  async persistReconnectRequired(integration, cause, message, errorCode = "WHATSAPP_RECONNECT_REQUIRED") {
    this.logTokenLifecycle("warn", "WhatsApp reconnect required", integration, cause, {
      status: "RECONNECT_REQUIRED",
    });

    await this.accounts.update(integration.id, {
      status: "RECONNECT_REQUIRED",
      lastErrorCode: errorCode,
      lastErrorMessage: message,
    });
  }

  async metaGraphRequest({ path, accessToken, method = "GET", query = {} }) {
    const token = requireStr(accessToken);
    if (!token) {
      const error = new Error("Missing Meta access token");
      error.code = "MISSING_ACCESS_TOKEN";
      throw error;
    }

    const normalizedPath = normalizeGraphPath(path);
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${normalizedPath}`);
    for (const [key, value] of Object.entries(query || {})) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const rawText = await response.text();
    const parsed = parseJsonSafely(rawText);

    if (!response.ok) {
      const error = new Error(parsed?.error?.message || `Meta Graph request failed with status ${response.status}`);
      error.code = parsed?.error?.code || "META_GRAPH_REQUEST_FAILED";
      error.details = parsed || rawText;
      error.graphPath = normalizedPath;
      error.responseCategory = categorizeMetaError(error);
      console.warn(
        "WhatsApp Graph request failed",
        JSON.stringify({
          path: error.graphPath,
          method,
          causeCode: error.code,
          responseCategory: error.responseCategory,
        })
      );
      throw error;
    }

    return parsed || {};
  }

  async exchangeWhatsAppCode({ code, redirectUri }) {
    const clientId = requireEnv("WHATSAPP_APP_ID");
    const clientSecret = requireEnv("WHATSAPP_APP_SECRET");

    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("code", code);

    const response = await fetch(url, { method: "GET" });
    const rawText = await response.text();
    const parsed = parseTokenResponse(rawText);

    if (!response.ok) {
      const details = parseJsonSafely(rawText) || rawText;
      const error = new Error(
        (typeof details === "object" && details?.error?.message) || `Meta token exchange failed with status ${response.status}`
      );
      error.code = (typeof details === "object" && details?.error?.code) || "META_TOKEN_EXCHANGE_FAILED";
      error.details = details;
      console.warn(
        "WhatsApp code exchange failed",
        JSON.stringify({
          causeCode: error.code,
          responseCategory: categorizeMetaError(error),
          hasExpiresIn: false,
          hasTokenType: false,
        })
      );
      throw error;
    }

    if (!parsed?.access_token) {
      const error = new Error("Meta token exchange succeeded but no access token was returned");
      error.code = "META_TOKEN_MISSING";
      throw error;
    }

    return {
      accessToken: parsed.access_token,
      tokenType: parsed.token_type || "bearer",
      expiresIn: normalizeExpiresIn(parsed.expires_in),
    };
  }

  async fetchBusinessWabasForBusinessId({ accessToken, businessId, businessName = null, source = "business_id" }) {
    const wabas = [];
    for (const edge of ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"]) {
      try {
        const response = await this.metaGraphRequest({
          path: `${businessId}/${edge}`,
          accessToken,
          query: {
            fields: "id,name",
            limit: 100,
          },
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        for (const row of rows) {
          const wabaId = requireStr(row?.id);
          if (!wabaId) continue;

          wabas.push({
            businessId,
            businessName: businessName || row?.name || null,
            wabaId,
            wabaName: row?.name || null,
            source,
          });
        }
      } catch (error) {
        console.warn(
          "WhatsApp asset edge lookup failed",
          JSON.stringify({
            path: `${businessId}/${edge}`,
            businessId,
            causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
            responseCategory: error?.responseCategory || categorizeMetaError(error),
          })
        );
      }
    }

    return uniqueBy(wabas, (item) => `${item.businessId}:${item.wabaId}`);
  }

  async fetchWhatsAppBusinessAccounts(accessToken) {
    const aggregated = [];
    const fallbackBusinessId = requireStr(process.env.WHATSAPP_BUSINESS_ID);
    const fallbackWabaId = requireStr(process.env.WHATSAPP_WABA_ID);
    let meBusinessesError = null;

    try {
      const businesses = await this.metaGraphRequest({
        path: "me/businesses",
        accessToken,
        query: {
          fields: "id,name",
          limit: 100,
        },
      });

      const businessRows = Array.isArray(businesses?.data) ? businesses.data : [];
      for (const business of businessRows) {
        const businessId = requireStr(business?.id);
        if (!businessId) continue;

        const wabas = await this.fetchBusinessWabasForBusinessId({
          accessToken,
          businessId,
          businessName: business?.name || null,
          source: "me/businesses",
        });

        aggregated.push(...wabas);
      }
    } catch (error) {
      meBusinessesError = error;
      console.warn(
        "WhatsApp business discovery failed on me/businesses",
        JSON.stringify({
          path: "me/businesses",
          causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
          responseCategory: error?.responseCategory || categorizeMetaError(error),
        })
      );
    }

    if (aggregated.length === 0 && fallbackBusinessId) {
      const wabas = await this.fetchBusinessWabasForBusinessId({
        accessToken,
        businessId: fallbackBusinessId,
        businessName: null,
        source: "env_business_id",
      });

      aggregated.push(...wabas);
    }

    if (aggregated.length === 0 && fallbackWabaId) {
      aggregated.push({
        businessId: fallbackBusinessId || null,
        businessName: null,
        wabaId: fallbackWabaId,
        wabaName: null,
        source: "env_waba_id",
      });
    }

    const uniqueAccounts = uniqueBy(aggregated, (item) => `${item.businessId || "none"}:${item.wabaId}`);
    if (uniqueAccounts.length > 0) {
      return uniqueAccounts;
    }

    const error = new Error(
      "WhatsApp code exchange succeeded, but business asset discovery failed due to permission or scope limitations in the current token flow."
    );
    error.code = meBusinessesError?.code || "WHATSAPP_ASSET_DISCOVERY_FAILED";
    error.responseCategory = meBusinessesError?.responseCategory || "permission_denied";
    error.details = {
      meBusinessesFailed: !!meBusinessesError,
      usedBusinessIdFallback: !!fallbackBusinessId,
      usedWabaIdFallback: !!fallbackWabaId,
    };
    throw error;
  }

  async fetchWhatsAppSelectableNumbers(accessToken) {
    const businessAccounts = await this.fetchWhatsAppBusinessAccounts(accessToken);
    const numbers = [];

    for (const account of businessAccounts) {
      try {
        const response = await this.metaGraphRequest({
          path: `${account.wabaId}/phone_numbers`,
          accessToken,
          query: {
            fields: "id,display_phone_number,verified_name",
            limit: 100,
          },
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        for (const row of rows) {
          const phoneNumberId = requireStr(row?.id);
          if (!phoneNumberId) continue;

          numbers.push({
            phoneNumberId,
            displayName: row?.verified_name || row?.display_phone_number || account.wabaName || "WhatsApp Business Number",
            businessAccountId: account.wabaId,
            businessId: account.businessId,
            businessName: account.businessName,
            phoneNumber: row?.display_phone_number || null,
          });
        }
      } catch (error) {
        console.warn(
          "WhatsApp phone number lookup failed",
          JSON.stringify({
            path: `${account.wabaId}/phone_numbers`,
            businessAccountId: account.wabaId,
            businessId: account.businessId,
            causeCode: error?.code || "META_GRAPH_REQUEST_FAILED",
            responseCategory: error?.responseCategory || categorizeMetaError(error),
          })
        );
      }
    }

    const uniqueNumbers = uniqueBy(numbers, (item) => item.phoneNumberId);
    if (uniqueNumbers.length > 0) {
      return uniqueNumbers;
    }

    const error = new Error(
      "WhatsApp code exchange succeeded, but no phone numbers could be discovered from the accessible business assets."
    );
    error.code = "WHATSAPP_PHONE_DISCOVERY_FAILED";
    error.responseCategory = "permission_denied";
    throw error;
  }

  async hydrateListedIntegration(item) {
    if (String(item?.channel || "").toUpperCase() !== "WHATSAPP") {
      return shapeCredentialIntegrationForResponse(item);
    }

    try {
      const secret = await this.credentialStore.readSecretOrNull(item.credentialsRef);
      const evaluation = this.evaluateWhatsAppTokenState(item, secret);
      const preservesExistingError =
        evaluation.status === "HEALTHY" || evaluation.status === "EXPIRING_SOON";
      const publicPhoneNumber = resolveWhatsAppPublicPhoneNumber(secret, item);

      return shapeCredentialIntegrationForResponse({
        ...item,
        status: evaluation.status === "EXPIRING_SOON" ? "TOKEN_EXPIRING_SOON" : evaluation.status,
        lastErrorMessage: preservesExistingError ? item.lastErrorMessage : evaluation.message,
        phoneNumber: publicPhoneNumber,
      });
    } catch (error) {
      this.logTokenLifecycle("warn", "WhatsApp token health evaluation failed during list", item, "health_check_error", {
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
      });
      return shapeCredentialIntegrationForResponse({
        ...item,
        status: "UNKNOWN",
        lastErrorMessage: item.lastErrorMessage || "Unable to evaluate WhatsApp token health.",
        phoneNumber: null,
      });
    }
  }

  async createIntegration(body) {
    const userId = requireStr(body.userId);
    const channel = requireStr(body.channel);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!channel) return bad(400, { error: "Missing required field: channel" });

    const id = randomUUID();
    const now = nowMs();

    const created = await this.accounts.create({
      id,
      userId,
      channel,
      externalAccountId: body.externalAccountId ?? null,
      displayName: body.displayName ?? null,
      status: body.status ?? "PENDING",
      credentialsRef: body.credentialsRef ?? null,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.sync.ensureStateRow(id, "MESSAGES");
    await this.sync.ensureStateRow(id, "RESERVATIONS");

    return ok(created);
  }

  async listIntegrations(userId) {
    if (!requireStr(userId)) return bad(400, { error: "Missing required query param: userId" });

    const items = await this.accounts.listByUserId(userId);
    const hydrated = await Promise.all(items.map((item) => this.hydrateListedIntegration(item)));
    return ok(hydrated);
  }

  async updateIntegration(integrationId, patch) {
    const id = requireStr(integrationId);
    if (!id) return bad(400, { error: "Missing integration id in path" });

    const updated = await this.accounts.update(id, {
      externalAccountId: patch.externalAccountId,
      displayName: patch.displayName,
      status: patch.status,
      credentialsRef: patch.credentialsRef,
      lastErrorCode: patch.lastErrorCode,
      lastErrorMessage: patch.lastErrorMessage,
    });

    if (!updated) return bad(404, { error: "Integration not found" });
    return ok(updated);
  }

  async getIntegrationLogs(integrationId, limit = 50) {
    const id = requireStr(integrationId);
    if (!id) return bad(400, { error: "Missing integration id in path" });

    const logs = await this.sync.listLogs(id, Math.max(1, Math.min(limit, 200)));
    return ok(logs);
  }

  async upsertIntegrationProperty(integrationId, body) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const domitsPropertyId = requireStr(body.domitsPropertyId);
    const externalPropertyId = requireStr(body.externalPropertyId);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });

    const mapping = await this.props.upsert({
      integrationAccountId: accountId,
      domitsPropertyId,
      externalPropertyId,
      externalPropertyName: body.externalPropertyName ?? null,
      status: body.status ?? "ACTIVE",
    });

    return ok(mapping);
  }

  async listIntegrationProperties(integrationId) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const items = await this.props.listByAccountId(accountId);
    return ok(items);
  }

  async triggerSync(integrationId, syncType, body = {}) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const result = await this.runner.run({
      integrationAccountId: accountId,
      syncType,
      maxAttempts: typeof body.maxAttempts === "number" ? body.maxAttempts : 3,
      jobFn: async () => {
        return {
          itemsProcessed: 0,
          lastCursor: body.lastCursor ?? null,
          lastSuccessfulItemAt: null,
        };
      },
    });

    return ok(result);
  }

  async linkReservation(integrationId, body) {
    const accountId = requireStr(integrationId);
    if (!accountId) return bad(400, { error: "Missing integration id in path" });

    const channel = requireStr(body.channel);
    const externalReservationId = requireStr(body.externalReservationId);

    if (!channel) return bad(400, { error: "Missing required field: channel" });
    if (!externalReservationId) return bad(400, { error: "Missing required field: externalReservationId" });

    const saved = await this.resLinks.upsert({
      integrationAccountId: accountId,
      channel,
      externalReservationId,
      externalThreadId: body.externalThreadId ?? null,
      domitsThreadId: body.domitsThreadId ?? null,
      domitsPropertyId: body.domitsPropertyId ?? null,
      guestName: body.guestName ?? null,
      checkInAt: body.checkInAt ?? null,
      checkOutAt: body.checkOutAt ?? null,
      reservationStatus: body.reservationStatus ?? null,
      ratePlan: body.ratePlan ?? null,
      paymentStatus: body.paymentStatus ?? null,
      rawPayload: serializeRawPayload(body.rawPayload),
    });

    return ok(saved);
  }

  async startWhatsAppConnect(body) {
    const userId = requireStr(body.userId);
    const callbackUrl = requireStr(body.callbackUrl);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!callbackUrl) return bad(400, { error: "Missing required field: callbackUrl" });

    const connectSessionId = randomUUID();

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connectSessionId,
      callbackUrl,
      nextStep: "meta_oauth",
    });
  }

  async connectHolidu(body) {
    return this.channelManagementService.connectHolidu(body);
  }

  async checkHoliduStatus(userId) {
    return this.channelManagementService.checkHoliduStatus(userId);
  }

  async disconnectHolidu(body) {
    return this.channelManagementService.disconnectHolidu(body);
  }

  async connectChannex(body) {
    return this.channelManagementService.connectChannex(body);
  }

  async checkChannexStatus(userId) {
    return this.channelManagementService.checkChannexStatus(userId);
  }

  async disconnectChannex(body) {
    return this.channelManagementService.disconnectChannex(body);
  }

  async resolveUsableChannexIntegration(...args) {
    return this.channexMappingService.resolveUsableChannexIntegration(...args);
  }

  async listChannexProperties(...args) {
    return this.channexMappingService.listChannexProperties(...args);
  }

  async listChannexRoomTypes(...args) {
    return this.channexMappingService.listChannexRoomTypes(...args);
  }

  async listChannexRatePlans(...args) {
    return this.channexMappingService.listChannexRatePlans(...args);
  }

  async linkChannexProperty(...args) {
    return this.channexMappingService.linkChannexProperty(...args);
  }

  async linkChannexRoomType(...args) {
    return this.channexMappingService.linkChannexRoomType(...args);
  }

  async linkChannexRatePlan(...args) {
    return this.channexMappingService.linkChannexRatePlan(...args);
  }

  async saveChannexSetupMapping(...args) {
    return this.channexMappingService.saveChannexSetupMapping(...args);
  }

  async listLinkedChannexRoomTypes(...args) {
    return this.channexMappingService.listLinkedChannexRoomTypes(...args);
  }

  async listLinkedChannexRatePlans(...args) {
    return this.channexMappingService.listLinkedChannexRatePlans(...args);
  }

  async getChannexAriTargets(...args) {
    return this.channexMappingService.getChannexAriTargets(...args);
  }

  async previewChannexAri(...args) {
    return this.channexAriPayloadService.previewChannexAri(...args);
  }

  async previewChannexAriPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAriPayloads(...args);
  }

  async previewChannexAvailabilityPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAvailabilityPayloads(...args);
  }

  async previewChannexRestrictionRatePayloads(...args) {
    return this.channexAriPayloadService.previewChannexRestrictionRatePayloads(...args);
  }

  formatChannexEvidenceRow(...args) {
    return this.channexDiagnosticsService.formatChannexEvidenceRow(...args);
  }

  formatChannexEvidenceLatestSummary(...args) {
    return this.channexDiagnosticsService.formatChannexEvidenceLatestSummary(...args);
  }

  async persistChannexSyncEvidence(...args) {
    return this.channexDiagnosticsService.persistChannexSyncEvidence(...args);
  }

  async finalizeChannexSyncResult(...args) {
    return this.channexDiagnosticsService.finalizeChannexSyncResult(...args);
  }

  async listChannexSyncEvidence(...args) {
    return this.channexDiagnosticsService.listChannexSyncEvidence(...args);
  }

  async getChannexSyncEvidence(...args) {
    return this.channexDiagnosticsService.getChannexSyncEvidence(...args);
  }

  async getLatestChannexSyncEvidenceSummary(...args) {
    return this.channexDiagnosticsService.getLatestChannexSyncEvidenceSummary(...args);
  }

  async listChannexBookingRevisions(userId, options = {}) {
    return this.channexBookingRevisionImportService.listChannexBookingRevisions(userId, options);
  }

  buildChannexCertificationCancelSkippedEvidence(...args) {
    return this.channexCertificationService.buildChannexCertificationCancelSkippedEvidence(...args);
  }

  async cancelChannexCertificationBooking(...args) {
    return this.channexCertificationService.cancelChannexCertificationBooking(...args);
  }

  async receiveChannexBookingRevisions(userId, domitsPropertyId, options = {}) {
    return this.channexBookingRevisionImportService.receiveChannexBookingRevisions(
      userId,
      domitsPropertyId,
      options
    );
  }

  async pullLatestChannexBookingsForResolvedContext(context) {
    return this.channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext(context);
  }

  async pullLatestChannexBookings(userId, domitsPropertyId, options = {}) {
    return this.channexBookingRevisionImportService.pullLatestChannexBookings(
      userId,
      domitsPropertyId,
      options
    );
  }

  async pollLatestChannexBookings(options = {}) {
    return this.channexBookingPollingService.pollLatestChannexBookings(options);
  }

  async acknowledgeChannexBookingRevisions(userId, domitsPropertyId, body = {}, options = {}) {
    return this.channexBookingRevisionImportService.acknowledgeChannexBookingRevisions(
      userId,
      domitsPropertyId,
      body,
      options
    );
  }

  resolveChannexSyncCredentialContext(...args) {
    return this.channexAriExecutionService.resolveChannexSyncCredentialContext(...args);
  }

  createChannexSyncFinalizer(...args) {
    return this.channexAriExecutionService.createChannexSyncFinalizer(...args);
  }

  async syncChannexBookingAvailability(body = {}) {
    return this.channexAvailabilitySyncService.syncChannexBookingAvailability(body);
  }

  async syncChannexCalendarChange(body = {}, options = {}) {
    return this.channexAvailabilitySyncService.syncChannexCalendarChange(body, options);
  }

  async syncChannexAvailability(...args) {
    return this.channexAriExecutionService.syncChannexAvailability(...args);
  }

  async syncChannexRestrictions(...args) {
    return this.channexAriExecutionService.syncChannexRestrictions(...args);
  }

  async runGatedChannexAriSteps({ userId, domitsPropertyId, dateFrom, dateTo, baseNotes }) {
    return this.channexAriOrchestrationService.runGatedChannexAriSteps({
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      baseNotes,
    });
  }

  normalizeChannexFullSyncDateContext(...args) {
    return this.channexAriPayloadService.normalizeChannexFullSyncDateContext(...args);
  }

  async buildChannexFullSyncPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncPayloadContext(...args);
  }

  async buildChannexFullSyncAvailabilityPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncAvailabilityPayloadContext(...args);
  }

  async buildChannexFullSyncRestrictionsPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncRestrictionsPayloadContext(...args);
  }

  buildChannexCertificationTestCasePayload(...args) {
    return this.channexCertificationService.buildChannexCertificationTestCasePayload(...args);
  }

  async syncChannexCertificationTestCase(...args) {
    return this.channexCertificationService.syncChannexCertificationTestCase(...args);
  }

  buildChannexMultiStepMappingSnapshot(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepMappingSnapshot(...args);
  }

  buildChannexAriTargetsFailureEvidencePatch(...args) {
    return this.channexAriOrchestrationService.buildChannexAriTargetsFailureEvidencePatch(...args);
  }

  buildBlockedChannexMultiStepSyncResult(...args) {
    return this.channexAriOrchestrationService.buildBlockedChannexMultiStepSyncResult(...args);
  }

  collectChannexMultiStepSyncResults(...args) {
    return this.channexAriOrchestrationService.collectChannexMultiStepSyncResults(...args);
  }

  buildChannexMultiStepValidationInput(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepValidationInput(...args);
  }

  buildChannexMultiStepSuccessResponseBody(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepSuccessResponseBody(...args);
  }

  buildChannexMultiStepResponse(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepResponse(...args);
  }

  buildChannexMultiStepRestrictionsContext(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepRestrictionsContext(...args);
  }

  buildChannexMultiStepRawDetails(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepRawDetails(...args);
  }

  buildChannexMultiStepCaughtRawDetails(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepCaughtRawDetails(...args);
  }

  async runChannexMultiStepSync(...args) {
    return this.channexAriOrchestrationService.runChannexMultiStepSync(...args);
  }

  async syncChannexAri(...args) {
    return this.channexAriOrchestrationService.syncChannexAri(...args);
  }

  async syncChannexFull(...args) {
    return this.channexFullSyncService.syncChannexFull(...args);
  }

  async completeWhatsAppConnect(body) {
    const userId = requireStr(body.userId);
    const connectSessionId = requireStr(body.connectSessionId);
    const code = requireStr(body.code);
    const callbackUrl = requireStr(body.callbackUrl);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!connectSessionId) return bad(400, { error: "Missing required field: connectSessionId" });
    if (!code) return bad(400, { error: "Missing required field: code" });
    if (!callbackUrl) return bad(400, { error: "Missing required field: callbackUrl" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    const integrationAccountId = existing?.id || randomUUID();
    const credentialsRef =
      existing?.credentialsRef ||
      this.credentialStore.buildSecretName({
        userId,
        integrationAccountId,
      });

    const exchanged = await this.exchangeWhatsAppCode({
      code,
      redirectUri: callbackUrl,
    });

    const selectableNumbers = await this.fetchWhatsAppSelectableNumbers(exchanged.accessToken);
    const issuedAt = nowMs();
    const expiresAt =
      Number.isFinite(exchanged.expiresIn) && exchanged.expiresIn > 0 ? issuedAt + exchanged.expiresIn * 1000 : null;

    await this.credentialStore.ensureSecret({
      userId,
      integrationAccountId,
      payload: {
        provider: "META_WHATSAPP",
        accessToken: exchanged.accessToken,
        tokenType: exchanged.tokenType,
        issuedAt,
        expiresAt,
        tokenMetadataSource: "META_CODE_EXCHANGE",
        selectedPhoneNumberId: null,
        selectedBusinessAccountId: null,
        selectableNumbers,
        lastAssetSyncAt: issuedAt,
      },
    });

    await this.credentialStore.savePendingConnectState(connectSessionId, {
      userId,
      integrationAccountId,
      credentialsRef,
      issuedAt,
      expiresAt,
      selectableNumbers,
    });

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connectSessionId,
      codeReceived: true,
      selectableNumbers,
      credentialsRef,
    });
  }

  async selectWhatsAppNumber(body) {
    const userId = requireStr(body.userId);
    const connectSessionId = requireStr(body.connectSessionId);
    const phoneNumberId = requireStr(body.phoneNumberId);
    const displayName = requireStr(body.displayName) || "WhatsApp Business Number";

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!connectSessionId) return bad(400, { error: "Missing required field: connectSessionId" });
    if (!phoneNumberId) return bad(400, { error: "Missing required field: phoneNumberId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    const pendingConnect = await this.credentialStore.readPendingConnectState(connectSessionId);
    if (!pendingConnect || requireStr(pendingConnect.userId) !== userId) {
      return bad(409, {
        error: "WhatsApp connect session was not found or does not belong to this user.",
      });
    }

    const integrationAccountId = requireStr(pendingConnect.integrationAccountId) || existing?.id || null;
    const credentialsRef = requireStr(pendingConnect.credentialsRef) || existing?.credentialsRef || null;

    if (!integrationAccountId || !credentialsRef) {
      return bad(409, {
        error: "WhatsApp connect session is incomplete. Missing pending integration credentials.",
      });
    }

    const existingSecret = await this.credentialStore.readSecretOrNull(credentialsRef);
    const accessToken = requireStr(existingSecret?.accessToken);
    if (!accessToken) {
      return bad(409, {
        error: "WhatsApp token exchange has not completed successfully. Missing access token in stored credentials.",
      });
    }

    const selectableNumbers = Array.isArray(existingSecret?.selectableNumbers) ? existingSecret.selectableNumbers : [];
    const selectedNumber = selectableNumbers.find((item) => requireStr(item?.phoneNumberId) === phoneNumberId);
    if (!selectedNumber) {
      return bad(400, {
        error: "Selected WhatsApp phone number is not available in the stored Meta assets.",
      });
    }

    await this.credentialStore.writeSecret(credentialsRef, {
      ...existingSecret,
      provider: "META_WHATSAPP",
      accessToken,
      selectedPhoneNumberId: selectedNumber.phoneNumberId,
      selectedPhoneNumber: selectedNumber.phoneNumber || null,
      selectedBusinessAccountId: selectedNumber.businessAccountId || null,
      selectedBusinessId: selectedNumber.businessId || null,
      selectedDisplayName: displayName || selectedNumber.displayName || null,
      refreshStatus: null,
    });

    let saved;
    if (existing) {
      saved = await this.accounts.update(existing.id, {
        externalAccountId: phoneNumberId,
        displayName,
        status: "CONNECTED",
        credentialsRef,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
    } else {
      const now = nowMs();

      saved = await this.accounts.create({
        id: integrationAccountId,
        userId,
        channel: "WHATSAPP",
        externalAccountId: phoneNumberId,
        displayName,
        status: "CONNECTED",
        credentialsRef,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        createdAt: now,
        updatedAt: now,
      });

      await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
      await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
    }

    await this.credentialStore.deletePendingConnectState(connectSessionId);

    return ok({
      mode: "embedded-signup",
      channel: "WHATSAPP",
      connected: true,
      integration: saved,
    });
  }

  async disconnectWhatsApp(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });

    const disconnected = await this.accounts.disconnect(existing.id);
    if (!disconnected) return bad(404, { error: "WhatsApp integration not found" });

    return ok({
      disconnected: true,
      integration: disconnected,
    });
  }

  async checkWhatsAppTokenHealth(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });

    const secret = await this.credentialStore.readSecretOrNull(existing.credentialsRef);
    const evaluation = this.evaluateWhatsAppTokenState(existing, secret);

    this.logTokenLifecycle(
      evaluation.status === "RECONNECT_REQUIRED" ? "warn" : "log",
      "WhatsApp token health evaluation",
      existing,
      evaluation.cause,
      {
        status: evaluation.status,
        tokenSource: evaluation.tokenSource,
        reliableExpiry: evaluation.reliableExpiry,
      }
    );

    if (evaluation.shouldPersistReconnect) {
      await this.persistReconnectRequired(existing, evaluation.cause, evaluation.message);
    }

    return ok({
      status: evaluation.status,
      expiresAt: evaluation.expiresAt,
      needsReconnect: evaluation.needsReconnect,
      message: evaluation.message,
      tokenSource: evaluation.tokenSource,
      reliableExpiry: evaluation.reliableExpiry,
    });
  }

  async refreshWhatsAppToken(body) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    const existing = await this.accounts.findByUserIdAndChannel(userId, "WHATSAPP");
    if (!existing) return bad(404, { error: "WhatsApp integration not found" });

    const secret = await this.credentialStore.readSecretOrNull(existing.credentialsRef);
    const evaluation = this.evaluateWhatsAppTokenState(existing, secret);

    this.logTokenLifecycle("warn", "WhatsApp token refresh unsupported", existing, "refresh_unsupported", {
      tokenSource: evaluation.tokenSource,
      currentStatus: evaluation.status,
    });

    const message = "Automatic WhatsApp token refresh is not supported by the current backend configuration.";

    if (evaluation.shouldPersistReconnect) {
      await this.persistReconnectRequired(
        existing,
        "refresh_unsupported",
        `${message} Reconnect required.`,
        "WHATSAPP_REFRESH_UNSUPPORTED"
      );
    }

    return ok({
      refreshed: false,
      needsReconnect: evaluation.needsReconnect,
      status: evaluation.status,
      expiresAt: evaluation.expiresAt,
      tokenSource: evaluation.tokenSource,
      message: evaluation.needsReconnect ? `${message} Reconnect required.` : message,
    });
  }
}
