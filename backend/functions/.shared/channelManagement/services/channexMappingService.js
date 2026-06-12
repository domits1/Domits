import IntegrationAccountRepository from "../../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../../integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../../integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../../integrations/repositories/integrationRoomTypeRepository.js";
import { CHANNEX_STATUS } from "../channelManagementConstants.js";
import ChannexCredentialStore from "../providers/channex/credentialStore.js";
import { hasChannexRequiredCredentialFields } from "../providers/channex/credentialUtils.js";
import ChannexProviderClient from "../providers/channex/providerClient.js";

const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});
const getUnavailableChannexStatus = (integration) =>
  integration ? CHANNEX_STATUS.DISCONNECTED : CHANNEX_STATUS.NOT_CONNECTED;
const getChannexProviderValidationFailureStatus = (providerStatus) =>
  providerStatus === "UNAUTHORIZED"
    ? CHANNEX_STATUS.RECONNECT_REQUIRED
    : CHANNEX_STATUS.VALIDATION_FAILED;

export default class ChannexMappingService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    ratePlans = new IntegrationRatePlanRepository(),
    roomTypes = new IntegrationRoomTypeRepository(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
  } = {}) {
    this.accounts = accounts;
    this.props = props;
    this.ratePlans = ratePlans;
    this.roomTypes = roomTypes;
    this.channexCredentialStore = channexCredentialStore;
    this.channexProviderClient = channexProviderClient;
  }

  async resolveUsableChannexIntegration(
    userId,
    {
      requireSecret = false,
      missingCredentialsError = "Channex integration is not locally usable. Reconnect required.",
    } = {}
  ) {
    const integration = await this.accounts.findByUserIdAndChannel(userId, "CHANNEX");
    if (!integration || String(integration.status || "").toUpperCase() === CHANNEX_STATUS.DISCONNECTED) {
      return {
        ok: false,
        response: bad(409, {
          error: "Channex integration is not connected for this user.",
          errorCode: "CHANNEX_NOT_CONNECTED",
          status: getUnavailableChannexStatus(integration),
        }),
      };
    }

    const credentialsRef = requireStr(integration.credentialsRef);
    if (!credentialsRef) {
      return {
        ok: false,
        response: bad(409, {
          error: missingCredentialsError,
          errorCode: "CHANNEX_RECONNECT_REQUIRED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
      };
    }

    if (!requireSecret) {
      return {
        ok: true,
        integration,
        credentialsRef,
        secret: null,
      };
    }

    let secret;
    try {
      secret = await this.channexCredentialStore.readSecretOrNull(credentialsRef);
    } catch (error) {
      const details = describeLocalError(error);
      return {
        ok: false,
        response: bad(409, {
          error: "Stored Channex secret could not be read. Reconnect required.",
          errorCode: "CHANNEX_SECRET_READ_FAILED",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
          details,
        }),
      };
    }

    if (
      !secret ||
      typeof secret !== "object" ||
      Array.isArray(secret) ||
      !hasChannexRequiredCredentialFields(secret)
    ) {
      return {
        ok: false,
        response: bad(409, {
          error: "Stored Channex secret is missing, unreadable, or incomplete. Reconnect required.",
          errorCode: "CHANNEX_SECRET_INVALID",
          status: CHANNEX_STATUS.RECONNECT_REQUIRED,
        }),
      };
    }

    return {
      ok: true,
      integration,
      credentialsRef,
      secret,
    };
  }

  async listChannexProperties(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const propertyListResult = await this.channexProviderClient.listProperties(secret);
      if (!propertyListResult?.success) {
        return bad(502, {
          error: propertyListResult?.errorMessage || "Failed to fetch Channex properties.",
          errorCode: propertyListResult?.errorCode || "CHANNEX_PROPERTY_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(propertyListResult?.providerStatus),
          providerStatus: propertyListResult?.providerStatus || "PROPERTY_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: CHANNEX_STATUS.CONNECTED,
        properties: (Array.isArray(propertyListResult.properties) ? propertyListResult.properties : []).map(
          (property) => ({
            externalPropertyId: property.externalPropertyId,
            externalPropertyName: property.externalPropertyName,
            propertyStatus: property.propertyStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex properties.",
        errorCode: "CHANNEX_PROPERTY_LIST_SERVICE_FAILED",
        details,
      });
    }
  }

  async listChannexRoomTypes(userId, externalPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedExternalPropertyId = requireStr(externalPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedExternalPropertyId) {
      return bad(400, {
        error: "Missing required query param: externalPropertyId",
      });
    }

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const roomTypeListResult = await this.channexProviderClient.listRoomTypes(secret, normalizedExternalPropertyId);
      if (!roomTypeListResult?.success) {
        return bad(502, {
          error: roomTypeListResult?.errorMessage || "Failed to fetch Channex room types.",
          errorCode: roomTypeListResult?.errorCode || "CHANNEX_ROOM_TYPE_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(roomTypeListResult?.providerStatus),
          providerStatus: roomTypeListResult?.providerStatus || "ROOM_TYPE_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        externalPropertyId: normalizedExternalPropertyId,
        status: CHANNEX_STATUS.CONNECTED,
        roomTypes: (Array.isArray(roomTypeListResult.roomTypes) ? roomTypeListResult.roomTypes : []).map(
          (roomType) => ({
            externalRoomTypeId: roomType.externalRoomTypeId,
            externalRoomTypeName: roomType.externalRoomTypeName,
            roomTypeStatus: roomType.roomTypeStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex room types.",
        errorCode: "CHANNEX_ROOM_TYPE_LIST_SERVICE_FAILED",
        details,
      });
    }
  }

  async listChannexRatePlans(userId, externalRoomTypeId) {
    const normalizedUserId = requireStr(userId);
    const normalizedExternalRoomTypeId = requireStr(externalRoomTypeId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedExternalRoomTypeId) {
      return bad(400, {
        error: "Missing required query param: externalRoomTypeId",
      });
    }

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId, {
        requireSecret: true,
        missingCredentialsError: "Channex credentials are missing. Reconnect required.",
      });
      if (!channexContext.ok) return channexContext.response;

      const { integration, secret } = channexContext;

      const ratePlanListResult = await this.channexProviderClient.listRatePlans(secret, normalizedExternalRoomTypeId);
      if (!ratePlanListResult?.success) {
        return bad(502, {
          error: ratePlanListResult?.errorMessage || "Failed to fetch Channex rate plans.",
          errorCode: ratePlanListResult?.errorCode || "CHANNEX_RATE_PLAN_LIST_FAILED",
          status: getChannexProviderValidationFailureStatus(ratePlanListResult?.providerStatus),
          providerStatus: ratePlanListResult?.providerStatus || "RATE_PLAN_LIST_FAILED",
        });
      }

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        externalRoomTypeId: normalizedExternalRoomTypeId,
        status: CHANNEX_STATUS.CONNECTED,
        ratePlans: (Array.isArray(ratePlanListResult.ratePlans) ? ratePlanListResult.ratePlans : []).map(
          (ratePlan) => ({
            externalRatePlanId: ratePlan.externalRatePlanId,
            externalRatePlanName: ratePlan.externalRatePlanName,
            ratePlanStatus: ratePlan.ratePlanStatus ?? null,
          })
        ),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex rate plans.",
        errorCode: "CHANNEX_RATE_PLAN_LIST_SERVICE_FAILED",
        details,
      });
    }
  }

  async linkChannexProperty(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalPropertyName = requireStr(body?.externalPropertyName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const saved = ok(
        await this.props.upsert({
          integrationAccountId: integration.id,
          domitsPropertyId,
          externalPropertyId,
          externalPropertyName,
          status: "ACTIVE",
        })
      );

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.response?.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.response?.externalPropertyId ?? externalPropertyId,
        externalPropertyName: saved.response?.externalPropertyName ?? externalPropertyName ?? null,
        status: saved.response?.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex property mapping.",
        errorCode: "CHANNEX_PROPERTY_LINK_FAILED",
        details,
      });
    }
  }

  async linkChannexRoomType(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRoomTypeName = requireStr(body?.externalRoomTypeName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const saved = await this.roomTypes.upsert({
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        externalRoomTypeId,
        externalRoomTypeName,
        status: "ACTIVE",
      });

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.externalPropertyId ?? externalPropertyId,
        externalRoomTypeId: saved.externalRoomTypeId ?? externalRoomTypeId,
        externalRoomTypeName: saved.externalRoomTypeName ?? externalRoomTypeName ?? null,
        status: saved.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex room type mapping.",
        errorCode: "CHANNEX_ROOM_TYPE_LINK_FAILED",
        details,
      });
    }
  }

  async linkChannexRatePlan(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRatePlanId = requireStr(body?.externalRatePlanId);
    const externalRatePlanName = requireStr(body?.externalRatePlanName);

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });
    if (!externalRatePlanId) return bad(400, { error: "Missing required field: externalRatePlanId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const saved = await this.ratePlans.upsert({
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        externalRoomTypeId,
        externalRatePlanId,
        externalRatePlanName,
        status: "ACTIVE",
      });

      return ok({
        integrationAccountId: integration.id,
        domitsPropertyId: saved.domitsPropertyId ?? domitsPropertyId,
        externalPropertyId: saved.externalPropertyId ?? externalPropertyId,
        externalRoomTypeId: saved.externalRoomTypeId ?? externalRoomTypeId,
        externalRatePlanId: saved.externalRatePlanId ?? externalRatePlanId,
        externalRatePlanName: saved.externalRatePlanName ?? externalRatePlanName ?? null,
        status: saved.status ?? "ACTIVE",
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex rate plan mapping.",
        errorCode: "CHANNEX_RATE_PLAN_LINK_FAILED",
        details,
      });
    }
  }

  async saveChannexSetupMapping(userId, body) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required field: userId" });

    const domitsPropertyId = requireStr(body?.domitsPropertyId);
    const externalPropertyId = requireStr(body?.externalPropertyId);
    const externalPropertyName = requireStr(body?.externalPropertyName);
    const externalRoomTypeId = requireStr(body?.externalRoomTypeId);
    const externalRoomTypeName = requireStr(body?.externalRoomTypeName);
    const externalRatePlanId = requireStr(body?.externalRatePlanId);
    const externalRatePlanName = requireStr(body?.externalRatePlanName);
    const status = requireStr(body?.status) || "ACTIVE";
    const scope = requireStr(body?.scope) || "SINGLE_UNIT";

    if (!domitsPropertyId) return bad(400, { error: "Missing required field: domitsPropertyId" });
    if (!externalPropertyId) return bad(400, { error: "Missing required field: externalPropertyId" });
    if (!externalRoomTypeId) return bad(400, { error: "Missing required field: externalRoomTypeId" });
    if (!externalRatePlanId) return bad(400, { error: "Missing required field: externalRatePlanId" });
    if (scope !== "SINGLE_UNIT") {
      return bad(400, {
        error: "Channex setup mapping currently supports only SINGLE_UNIT scope.",
        errorCode: "CHANNEX_SETUP_SCOPE_UNSUPPORTED",
      });
    }

    const savedMappings = {
      property: null,
      roomType: null,
      ratePlan: null,
    };

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;
      const mappingBase = {
        integrationAccountId: integration.id,
        domitsPropertyId,
        externalPropertyId,
        status,
      };

      savedMappings.property = await this.props.upsert({
        ...mappingBase,
        externalPropertyName,
      });
      savedMappings.roomType = await this.roomTypes.upsert({
        ...mappingBase,
        externalRoomTypeId,
        externalRoomTypeName,
      });
      savedMappings.ratePlan = await this.ratePlans.upsert({
        ...mappingBase,
        externalRoomTypeId,
        externalRatePlanId,
        externalRatePlanName,
      });

      const readinessResult = await this.getChannexAriTargets(normalizedUserId, domitsPropertyId);
      const readiness = readinessResult?.response ?? null;

      return ok({
        channel: "CHANNEX",
        action: "setup-mapping",
        scope,
        saved: true,
        integrationAccountId: integration.id,
        domitsPropertyId,
        savedMappings,
        readinessStatusCode: readinessResult?.statusCode ?? null,
        readiness,
        ready: readiness?.ready === true,
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to save Channex setup mapping.",
        errorCode: "CHANNEX_SETUP_MAPPING_FAILED",
        details,
        savedMappings,
      });
    }
  }

  async listLinkedChannexRoomTypes(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const mappings = await this.roomTypes.listByAccountId(integration.id);

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: integration.status,
        roomTypeMappings: (Array.isArray(mappings) ? mappings : []).map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRoomTypeName: mapping.externalRoomTypeName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list linked Channex room type mappings.",
        errorCode: "CHANNEX_ROOM_TYPE_MAPPING_LIST_FAILED",
        details,
      });
    }
  }

  async listLinkedChannexRatePlans(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const mappings = await this.ratePlans.listByAccountId(integration.id);

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        status: integration.status,
        ratePlanMappings: (Array.isArray(mappings) ? mappings : []).map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: mapping.externalRatePlanId,
          externalRatePlanName: mapping.externalRatePlanName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list linked Channex rate plan mappings.",
        errorCode: "CHANNEX_RATE_PLAN_MAPPING_LIST_FAILED",
        details,
      });
    }
  }

  async getChannexAriTargets(userId, domitsPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) {
      return bad(400, { error: "Missing required query param: domitsPropertyId" });
    }

    try {
      const channexContext = await this.resolveUsableChannexIntegration(normalizedUserId);
      if (!channexContext.ok) return channexContext.response;

      const { integration } = channexContext;

      const [propertyMappings, roomTypeMappings, ratePlanMappings] = await Promise.all([
        this.props.listByAccountId(integration.id),
        this.roomTypes.listByAccountId(integration.id),
        this.ratePlans.listByAccountId(integration.id),
      ]);

      const propertyMapping =
        (Array.isArray(propertyMappings) ? propertyMappings : []).find(
          (mapping) => mapping.domitsPropertyId === normalizedDomitsPropertyId
        ) || null;
      const selectedExternalPropertyId = requireStr(propertyMapping?.externalPropertyId);
      const propertyScopedRoomTypeMappings = (Array.isArray(roomTypeMappings) ? roomTypeMappings : []).filter(
        (mapping) =>
          mapping.domitsPropertyId === normalizedDomitsPropertyId &&
          selectedExternalPropertyId &&
          mapping.externalPropertyId === selectedExternalPropertyId
      );
      const propertyScopedRatePlanMappings = (Array.isArray(ratePlanMappings) ? ratePlanMappings : []).filter(
        (mapping) =>
          mapping.domitsPropertyId === normalizedDomitsPropertyId &&
          selectedExternalPropertyId &&
          mapping.externalPropertyId === selectedExternalPropertyId
      );

      const missingMappings = [];
      if (!propertyMapping) missingMappings.push("PROPERTY_MAPPING_MISSING");
      if (!propertyScopedRoomTypeMappings.length) missingMappings.push("ROOM_TYPE_MAPPING_MISSING");
      if (!propertyScopedRatePlanMappings.length) missingMappings.push("RATE_PLAN_MAPPING_MISSING");

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        status: integration.status,
        ready: missingMappings.length === 0,
        missingMappings,
        propertyMapping: propertyMapping
          ? {
              domitsPropertyId: propertyMapping.domitsPropertyId,
              externalPropertyId: propertyMapping.externalPropertyId,
              externalPropertyName: propertyMapping.externalPropertyName ?? null,
              status: propertyMapping.status,
            }
          : null,
        roomTypeMappings: propertyScopedRoomTypeMappings.map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRoomTypeName: mapping.externalRoomTypeName ?? null,
          status: mapping.status,
        })),
        ratePlanMappings: propertyScopedRatePlanMappings.map((mapping) => ({
          domitsPropertyId: mapping.domitsPropertyId,
          externalPropertyId: mapping.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: mapping.externalRatePlanId,
          externalRatePlanName: mapping.externalRatePlanName ?? null,
          status: mapping.status,
        })),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get Channex ARI targets.",
        errorCode: "CHANNEX_ARI_TARGETS_FAILED",
        details,
      });
    }
  }

}
