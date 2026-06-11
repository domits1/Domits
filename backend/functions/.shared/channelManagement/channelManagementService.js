import { randomUUID } from "node:crypto";

import IntegrationAccountRepository from "../integrations/repositories/integrationAccountRepository.js";
import IntegrationSyncRepository from "../integrations/repositories/integrationSyncRepository.js";
import { shapeCredentialIntegrationForResponse } from "../integrations/integrationResponse.js";
import ChannexCredentialStore from "./providers/channex/credentialStore.js";
import {
  buildChannexCredentialSummary,
  buildDefaultChannexProviderValidation,
  hasChannexRequiredCredentialFields,
  normalizeChannexCredentials,
  normalizeChannexProviderValidation,
  summarizeChannexRequiredFields,
} from "./providers/channex/credentialUtils.js";
import ChannexProviderClient from "./providers/channex/providerClient.js";
import HoliduCredentialStore from "./providers/holidu/credentialStore.js";
import {
  buildHoliduCredentialSummary,
  buildHoliduSecretPayload,
  hasHoliduRequiredCredentialFields,
  normalizeHoliduCredentials,
  normalizeHoliduProviderValidation,
  summarizeHoliduRequiredFields,
} from "./providers/holidu/credentialUtils.js";
import HoliduProviderClient from "./providers/holidu/providerClient.js";
import {
  CHANNEX_STATUS,
  HOLIDU_STATUS,
  SINGLE_ACCOUNT_PER_USER,
} from "./channelManagementConstants.js";

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

const buildHoliduProviderValidationRecord = (validationResult, attemptedAt) => {
  if (validationResult?.success) {
    return normalizeHoliduProviderValidation({
      validationState: HOLIDU_STATUS.CONNECTED,
      providerStatus: validationResult.providerStatus || "VALIDATED",
      validationMethod: "PROVIDER_VALIDATION",
      attemptedAt,
      validatedAt: attemptedAt,
      externalAccountId: validationResult.externalAccountId ?? null,
      errorCode: null,
      errorMessage: null,
    });
  }

  if (validationResult?.canValidate === false) {
    return normalizeHoliduProviderValidation({
      validationState: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
      providerStatus: validationResult.providerStatus || "UNSUPPORTED_IN_REPO_DOCS",
      validationMethod: "PROVIDER_VALIDATION_UNAVAILABLE",
      attemptedAt,
      validatedAt: null,
      externalAccountId: null,
      errorCode: null,
      errorMessage: validationResult.errorMessage ?? null,
    });
  }

  return normalizeHoliduProviderValidation({
    validationState: HOLIDU_STATUS.VALIDATION_FAILED,
    providerStatus: validationResult?.providerStatus || "VALIDATION_FAILED",
    validationMethod: "PROVIDER_VALIDATION",
    attemptedAt,
    validatedAt: null,
    externalAccountId: null,
    errorCode: validationResult?.errorCode || "HOLIDU_PROVIDER_VALIDATION_FAILED",
    errorMessage: validationResult?.errorMessage || "Holidu provider validation failed.",
  });
};

const deriveHoliduPersistedState = (validationResult) => {
  if (validationResult?.success) {
    return {
      status: HOLIDU_STATUS.CONNECTED,
      externalAccountId: validationResult.externalAccountId ?? null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  if (validationResult?.canValidate === false) {
    return {
      status: HOLIDU_STATUS.PENDING_PROVIDER_VALIDATION,
      externalAccountId: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  return {
    status: HOLIDU_STATUS.VALIDATION_FAILED,
    externalAccountId: null,
    lastErrorCode: validationResult?.errorCode || "HOLIDU_PROVIDER_VALIDATION_FAILED",
    lastErrorMessage: validationResult?.errorMessage || "Holidu provider validation failed.",
  };
};

const buildChannexProviderValidationRecord = (validationResult, attemptedAt) => {
  if (validationResult?.success) {
    return normalizeChannexProviderValidation({
      validationState: CHANNEX_STATUS.CONNECTED,
      providerStatus: validationResult.providerStatus || "ACTIVE",
      validationMethod: "PROVIDER_VALIDATION",
      attemptedAt,
      validatedAt: attemptedAt,
      externalAccountId: validationResult.externalAccountId ?? null,
      errorCode: null,
      errorMessage: null,
    });
  }

  return normalizeChannexProviderValidation({
    validationState: CHANNEX_STATUS.VALIDATION_FAILED,
    providerStatus: validationResult?.providerStatus || "VALIDATION_FAILED",
    validationMethod: "PROVIDER_VALIDATION",
    attemptedAt,
    validatedAt: null,
    externalAccountId: null,
    errorCode: validationResult?.errorCode || "CHANNEX_PROVIDER_VALIDATION_FAILED",
    errorMessage: validationResult?.errorMessage || "Channex provider validation failed.",
  });
};

const deriveChannexPersistedState = (validationResult) => {
  if (validationResult?.success) {
    return {
      status: CHANNEX_STATUS.CONNECTED,
      externalAccountId: validationResult.externalAccountId ?? null,
      lastErrorCode: null,
      lastErrorMessage: null,
    };
  }

  return {
    status: CHANNEX_STATUS.VALIDATION_FAILED,
    externalAccountId: null,
    lastErrorCode: validationResult?.errorCode || "CHANNEX_PROVIDER_VALIDATION_FAILED",
    lastErrorMessage: validationResult?.errorMessage || "Channex provider validation failed.",
  };
};

export default class ChannelManagementService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    sync = new IntegrationSyncRepository(),
    holiduCredentialStore = new HoliduCredentialStore(),
    holiduProviderClient = new HoliduProviderClient(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
  } = {}) {
    this.accounts = accounts;
    this.sync = sync;
    this.holiduCredentialStore = holiduCredentialStore;
    this.holiduProviderClient = holiduProviderClient;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
  }

  async persistCredentialIntegrationRecord({
    existing,
    integrationAccountId,
    userId,
    channel,
    displayName,
    persistedState,
    credentialsRef,
    connectedAt,
    updatedAt,
  }) {
    if (existing) {
      return this.accounts.update(existing.id, {
        displayName,
        externalAccountId: persistedState.externalAccountId,
        status: persistedState.status,
        credentialsRef,
        lastErrorCode: persistedState.lastErrorCode,
        lastErrorMessage: persistedState.lastErrorMessage,
      });
    }

    const integration = await this.accounts.create({
      id: integrationAccountId,
      userId,
      channel,
      externalAccountId: persistedState.externalAccountId,
      displayName,
      status: persistedState.status,
      credentialsRef,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: persistedState.lastErrorCode,
      lastErrorMessage: persistedState.lastErrorMessage,
      createdAt: connectedAt,
      updatedAt,
    });

    await this.sync.ensureStateRow(integrationAccountId, "MESSAGES");
    await this.sync.ensureStateRow(integrationAccountId, "RESERVATIONS");
    return integration;
  }

  async connectCredentialIntegration(body, config) {
    const userId = requireStr(body.userId);
    const displayName = requireStr(body.displayName) || config.defaultDisplayName;
    const credentials = config.normalizeCredentials(body.credentials);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!credentials || !config.hasRequiredCredentialFields(credentials)) {
      return bad(400, {
        error: config.invalidCredentialsError,
      });
    }

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, config.channel);
      const integrationAccountId = existing?.id || randomUUID();
      const connectedAt = existing?.createdAt || nowMs();
      const updatedAt = nowMs();
      const secretPayload = config.buildSecretPayload({
        credentials,
        connectedAt,
        updatedAt,
      });

      let credentialsRef;
      try {
        credentialsRef = await config.credentialStore.ensureSecret({
          userId,
          integrationAccountId,
          payload: secretPayload,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: config.secretStoreError,
          errorCode: config.secretStoreErrorCode,
          details,
        });
      }

      const validationAttemptedAt = nowMs();
      const validationResult = await config.validateProvider(credentials);
      const providerValidation = config.buildProviderValidationRecord(validationResult, validationAttemptedAt);
      const persistedState = config.derivePersistedState(validationResult);

      try {
        await config.credentialStore.writeSecret(credentialsRef, {
          ...secretPayload,
          updatedAt: validationAttemptedAt,
          providerValidation,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(503, {
          error: config.secretUpdateError,
          errorCode: config.secretUpdateErrorCode,
          details,
        });
      }

      let integration;
      try {
        integration = await this.persistCredentialIntegrationRecord({
          existing,
          integrationAccountId,
          userId,
          channel: config.channel,
          displayName,
          persistedState,
          credentialsRef,
          connectedAt,
          updatedAt,
        });
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: config.connectionPersistError,
          errorCode: config.connectionPersistErrorCode,
          details,
        });
      }

      return ok({
        connected: persistedState.status === config.status.CONNECTED,
        channel: config.channel,
        integration: shapeCredentialIntegrationForResponse(integration),
        credentialsSummary: config.buildCredentialSummary(credentials),
        validationMode: config.getValidationMode(validationResult),
        validationState: persistedState.status,
        providerStatus: providerValidation.providerStatus,
        accountPolicy: config.accountPolicy,
        multiAccountDeferred: true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.unexpectedConnectError,
        errorCode: config.unexpectedConnectErrorCode,
        details,
      });
    }
  }

  buildCredentialStatusResponse(config, {
    integration = null,
    integrationAccountId = integration?.id ?? null,
    status,
    validationMode,
    validationState,
    reason,
    externalAccountId = integration?.externalAccountId ?? null,
    credentialsRefPresent = false,
    secretPresent = false,
    requiredFieldsPresent = false,
  }) {
    return ok({
      channel: config.channel,
      integrationAccountId,
      status,
      validationMode,
      validationState,
      reason,
      displayName: integration?.displayName ?? null,
      externalAccountId,
      credentialsRefPresent,
      secretPresent,
      requiredFieldsPresent,
    });
  }

  async checkCredentialIntegrationStatus(userId, config) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, config.channel);
      if (!integration) {
        return this.buildCredentialStatusResponse(config, {
          integrationAccountId: null,
          status: config.status.NOT_CONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: config.status.NOT_CONNECTED,
          reason: `No ${config.providerName} integration row exists for this user.`,
        });
      }

      if (String(integration.status || "").toUpperCase() === config.status.DISCONNECTED) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.DISCONNECTED,
          validationMode: "LOCAL_AND_PROVIDER_STATE",
          validationState: config.status.DISCONNECTED,
          reason: `${config.providerName} integration is disconnected in Domits and is not locally usable.`,
        });
      }

      const credentialsRefPresent = !!requireStr(integration.credentialsRef);
      if (!credentialsRefPresent) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: "Integration row exists but credentialsRef is missing.",
          credentialsRefPresent,
        });
      }

      let secret;
      try {
        secret = await config.credentialStore.readSecretOrNull(integration.credentialsRef);
      } catch (error) {
        const details = describeLocalError(error);
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret could not be read locally: ${details.message}`,
          credentialsRefPresent,
        });
      }

      if (!secret || typeof secret !== "object" || Array.isArray(secret)) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret is missing, unreadable, or malformed.`,
          credentialsRefPresent,
        });
      }

      const requiredFieldSummary = config.summarizeRequiredFields(secret);
      if (!config.hasRequiredCredentialFields(secret)) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.RECONNECT_REQUIRED,
          validationMode: "LOCAL_SECRET_VALIDATION",
          validationState: config.status.RECONNECT_REQUIRED,
          reason: `Stored ${config.providerName} secret is present but required local credential fields are incomplete.`,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      const providerValidation = config.normalizeProviderValidation(secret.providerValidation);
      const normalizedStatus = String(integration.status || "").toUpperCase();
      if (
        normalizedStatus === config.status.CONNECTED &&
        providerValidation.validationState === config.status.CONNECTED
      ) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.CONNECTED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: config.status.CONNECTED,
          reason: `Stored ${config.providerName} credentials are locally valid and provider validation has explicitly succeeded.`,
          externalAccountId: integration.externalAccountId ?? providerValidation.externalAccountId ?? null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      if (normalizedStatus === config.status.VALIDATION_FAILED) {
        return this.buildCredentialStatusResponse(config, {
          integration,
          status: config.status.VALIDATION_FAILED,
          validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
          validationState: config.status.VALIDATION_FAILED,
          reason: integration.lastErrorMessage || providerValidation.errorMessage || "Provider validation failed.",
          externalAccountId: null,
          credentialsRefPresent,
          secretPresent: true,
          requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
        });
      }

      return this.buildCredentialStatusResponse(config, {
        integration,
        status: config.status.PENDING_PROVIDER_VALIDATION,
        validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
        validationState: config.status.PENDING_PROVIDER_VALIDATION,
        reason:
          providerValidation.errorMessage ||
          `Stored ${config.providerName} credentials are locally valid, but provider validation has not explicitly succeeded.`,
        externalAccountId: null,
        credentialsRefPresent,
        secretPresent: true,
        requiredFieldsPresent: requiredFieldSummary.requiredFieldsPresent,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.statusCheckError,
        errorCode: config.statusCheckErrorCode,
        details,
      });
    }
  }

  async disconnectCredentialIntegration(body, config) {
    const userId = requireStr(body.userId);
    if (!userId) return bad(400, { error: "Missing required field: userId" });

    try {
      const existing = await this.accounts.findByUserIdAndChannel(userId, config.channel);
      if (!existing) return bad(404, { error: config.notFoundError });

      let disconnected;
      try {
        disconnected = await this.accounts.disconnect(existing.id);
      } catch (error) {
        const details = describeLocalError(error);
        return bad(500, {
          error: config.disconnectPersistError,
          errorCode: config.disconnectPersistErrorCode,
          details,
        });
      }

      if (!disconnected) return bad(404, { error: config.notFoundError });

      return ok({
        disconnected: true,
        channel: config.channel,
        integrationAccountId: disconnected.id,
        status: disconnected.status,
        message: config.disconnectMessage,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: config.unexpectedDisconnectError,
        errorCode: config.unexpectedDisconnectErrorCode,
        details,
      });
    }
  }

  getHoliduCredentialLifecycleConfig() {
    return {
      channel: "HOLIDU",
      providerName: "Holidu",
      defaultDisplayName: "Holidu",
      status: HOLIDU_STATUS,
      accountPolicy: SINGLE_ACCOUNT_PER_USER,
      credentialStore: this.holiduCredentialStore,
      normalizeCredentials: normalizeHoliduCredentials,
      hasRequiredCredentialFields: hasHoliduRequiredCredentialFields,
      summarizeRequiredFields: summarizeHoliduRequiredFields,
      normalizeProviderValidation: normalizeHoliduProviderValidation,
      buildSecretPayload: ({ credentials, connectedAt, updatedAt }) =>
        buildHoliduSecretPayload({
          credentials,
          connectedAt,
          updatedAt,
        }),
      validateProvider: (credentials) => this.holiduProviderClient.validateAccount(credentials),
      buildProviderValidationRecord: buildHoliduProviderValidationRecord,
      derivePersistedState: deriveHoliduPersistedState,
      buildCredentialSummary: buildHoliduCredentialSummary,
      getValidationMode: (validationResult) =>
        validationResult?.canValidate === false ? "PROVIDER_VALIDATION_UNAVAILABLE" : "PROVIDER_VALIDATION",
      invalidCredentialsError: "Holidu credentials must include apiKey, or both clientId and clientSecret.",
      secretStoreError: "Failed to store Holidu credentials in Secrets Manager.",
      secretStoreErrorCode: "HOLIDU_SECRET_STORE_FAILED",
      secretUpdateError: "Holidu credentials were stored, but provider validation metadata could not be persisted.",
      secretUpdateErrorCode: "HOLIDU_SECRET_UPDATE_FAILED",
      connectionPersistError: "Holidu credentials were stored, but the integration record could not be persisted.",
      connectionPersistErrorCode: "HOLIDU_CONNECTION_PERSIST_FAILED",
      unexpectedConnectError: "Unexpected Holidu connection failure.",
      unexpectedConnectErrorCode: "HOLIDU_CONNECT_FAILED",
      statusCheckError: "Failed to evaluate Holidu local connectivity state.",
      statusCheckErrorCode: "HOLIDU_STATUS_CHECK_FAILED",
      notFoundError: "Holidu integration not found",
      disconnectPersistError: "Failed to persist Holidu disconnect state in Domits.",
      disconnectPersistErrorCode: "HOLIDU_DISCONNECT_PERSIST_FAILED",
      unexpectedDisconnectError: "Unexpected Holidu disconnect failure.",
      unexpectedDisconnectErrorCode: "HOLIDU_DISCONNECT_FAILED",
      disconnectMessage:
        "Holidu integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
    };
  }

  async connectHolidu(body) {
    return this.connectCredentialIntegration(body, this.getHoliduCredentialLifecycleConfig());
  }

  async checkHoliduStatus(userId) {
    return this.checkCredentialIntegrationStatus(userId, this.getHoliduCredentialLifecycleConfig());
  }

  async disconnectHolidu(body) {
    return this.disconnectCredentialIntegration(body, this.getHoliduCredentialLifecycleConfig());
  }

  getChannexCredentialLifecycleConfig() {
    return {
      channel: "CHANNEX",
      providerName: "Channex",
      defaultDisplayName: "Channex",
      status: CHANNEX_STATUS,
      accountPolicy: SINGLE_ACCOUNT_PER_USER,
      credentialStore: this.channexCredentialStore,
      normalizeCredentials: normalizeChannexCredentials,
      hasRequiredCredentialFields: hasChannexRequiredCredentialFields,
      summarizeRequiredFields: summarizeChannexRequiredFields,
      normalizeProviderValidation: normalizeChannexProviderValidation,
      buildSecretPayload: ({ credentials, connectedAt, updatedAt }) => ({
        provider: "CHANNEX",
        credentialType: "MANUAL_CONNECT",
        ...credentials,
        connectedAt,
        updatedAt,
        providerValidation: buildDefaultChannexProviderValidation(),
      }),
      validateProvider: (credentials) => this.channexProviderClient.validateApiKey(credentials),
      buildProviderValidationRecord: buildChannexProviderValidationRecord,
      derivePersistedState: deriveChannexPersistedState,
      buildCredentialSummary: buildChannexCredentialSummary,
      getValidationMode: () => "PROVIDER_VALIDATION",
      invalidCredentialsError: "Channex credentials must include apiKey.",
      secretStoreError: "Failed to store Channex credentials in Secrets Manager.",
      secretStoreErrorCode: "CHANNEX_SECRET_STORE_FAILED",
      secretUpdateError: "Channex credentials were stored, but provider validation metadata could not be persisted.",
      secretUpdateErrorCode: "CHANNEX_SECRET_UPDATE_FAILED",
      connectionPersistError: "Channex credentials were stored, but the integration record could not be persisted.",
      connectionPersistErrorCode: "CHANNEX_CONNECTION_PERSIST_FAILED",
      unexpectedConnectError: "Unexpected Channex connection failure.",
      unexpectedConnectErrorCode: "CHANNEX_CONNECT_FAILED",
      statusCheckError: "Failed to evaluate Channex local connectivity state.",
      statusCheckErrorCode: "CHANNEX_STATUS_CHECK_FAILED",
      notFoundError: "Channex integration not found",
      disconnectPersistError: "Failed to persist Channex disconnect state in Domits.",
      disconnectPersistErrorCode: "CHANNEX_DISCONNECT_PERSIST_FAILED",
      unexpectedDisconnectError: "Unexpected Channex disconnect failure.",
      unexpectedDisconnectErrorCode: "CHANNEX_DISCONNECT_FAILED",
      disconnectMessage:
        "Channex integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
    };
  }

  async connectChannex(body) {
    return this.connectCredentialIntegration(body, this.getChannexCredentialLifecycleConfig());
  }

  async checkChannexStatus(userId) {
    return this.checkCredentialIntegrationStatus(userId, this.getChannexCredentialLifecycleConfig());
  }

  async disconnectChannex(body) {
    return this.disconnectCredentialIntegration(body, this.getChannexCredentialLifecycleConfig());
  }
}
