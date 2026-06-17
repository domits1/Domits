import { randomUUID } from "node:crypto";

import { parseIsoDateParam } from "../utils/channexAriDateUtils.js";
import { CHANNEX_FULL_SYNC_DEFAULTS } from "../utils/channexAriPayloadUtils.js";

const nowMs = () => Date.now();
const ok = (response) => ({ statusCode: 200, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const parseJsonSafely = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

const stringifyJsonOrNull = (value) => {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({
      serializationError: true,
      details: describeLocalError(error),
    });
  }
};
const parseStructuredEvidenceField = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return parseJsonSafely(value) ?? value;
};
const getProviderCalledFromEvidenceSummary = (providerSummary, requestCount) => {
  if (typeof providerSummary?.calledProvider === "boolean") {
    return providerSummary.calledProvider;
  }
  if (Number.isFinite(requestCount)) {
    return requestCount > 0;
  }
  return false;
};
const normalizeEvidenceDateFilters = (dateFrom, dateTo) => {
  const normalizedFilterDateFrom = requireStr(dateFrom);
  const normalizedFilterDateTo = requireStr(dateTo);
  const parsedDateFrom = normalizedFilterDateFrom ? parseIsoDateParam(normalizedFilterDateFrom) : null;
  const parsedDateTo = normalizedFilterDateTo ? parseIsoDateParam(normalizedFilterDateTo) : null;

  if (normalizedFilterDateFrom && !parsedDateFrom) {
    return { error: bad(400, { error: "Invalid query param: dateFrom" }) };
  }
  if (normalizedFilterDateTo && !parsedDateTo) {
    return { error: bad(400, { error: "Invalid query param: dateTo" }) };
  }
  if (parsedDateFrom && parsedDateTo && normalizedFilterDateFrom > normalizedFilterDateTo) {
    return { error: bad(400, { error: "dateFrom must be less than or equal to dateTo." }) };
  }

  return {
    normalizedFilterDateFrom,
    normalizedFilterDateTo,
    parsedDateFrom,
    parsedDateTo,
    error: null,
  };
};

export default class ChannexDiagnosticsService {
  constructor({
    accounts,
    channexEvidence,
    getAccounts = () => accounts,
    getChannexEvidence = () => channexEvidence,
  }) {
    this.getAccounts = getAccounts;
    this.getChannexEvidence = getChannexEvidence;
  }

  get accounts() {
    return this.getAccounts();
  }

  get channexEvidence() {
    return this.getChannexEvidence();
  }

  logChannexFullCertificationSync(stage, fields = {}) {
    try {
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion: CHANNEX_FULL_SYNC_DEFAULTS.VERSION,
          stage,
          ...fields,
        })
      );
    } catch {
      console.info("CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC", stage);
    }
  }

  formatChannexEvidenceRow(row) {
    if (!row) return null;

    return {
      id: row.id,
      channel: row.channel,
      provider: row.provider,
      integrationAccountId: row.integrationAccountId ?? null,
      domitsPropertyId: row.domitsPropertyId ?? null,
      syncType: row.syncType,
      dateFrom: row.dateFrom ?? null,
      dateTo: row.dateTo ?? null,
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
      status: row.status,
      overallSuccess: !!row.overallSuccess,
      mappingSnapshot: parseStructuredEvidenceField(row.mappingSnapshot),
      groupedOutboundPayloadSnapshot: parseStructuredEvidenceField(row.groupedOutboundPayloadSnapshot),
      providerResponseSummary: parseStructuredEvidenceField(row.providerResponseSummary),
      taskIds: parseStructuredEvidenceField(row.taskIds) ?? [],
      warnings: parseStructuredEvidenceField(row.warnings) ?? [],
      errors: parseStructuredEvidenceField(row.errors) ?? [],
      notes: parseStructuredEvidenceField(row.notes) ?? [],
      rawDetails: parseStructuredEvidenceField(row.rawDetails),
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  }

  formatChannexEvidenceLatestSummary(row) {
    const formatted = this.formatChannexEvidenceRow(row);
    if (!formatted) return null;

    const providerSummary =
      formatted.providerResponseSummary && typeof formatted.providerResponseSummary === "object"
        ? formatted.providerResponseSummary
        : null;
    const requestCount = Number(providerSummary?.requestCount);
    const providerCalled = getProviderCalledFromEvidenceSummary(providerSummary, requestCount);
    const notes = Array.isArray(formatted.notes) ? formatted.notes.filter(Boolean) : [];

    return {
      id: formatted.id,
      syncType: formatted.syncType,
      status: formatted.status,
      overallSuccess: formatted.overallSuccess,
      startedAt: formatted.startedAt,
      finishedAt: formatted.finishedAt,
      dateFrom: formatted.dateFrom,
      dateTo: formatted.dateTo,
      taskIds: Array.isArray(formatted.taskIds) ? formatted.taskIds : [],
      warningCount: Array.isArray(formatted.warnings) ? formatted.warnings.length : 0,
      errorCount: Array.isArray(formatted.errors) ? formatted.errors.length : 0,
      providerCalled,
      notesSummary: notes.length ? notes.slice(0, 3) : [],
    };
  }

  async persistChannexSyncEvidence({
    userId,
    integrationAccountId,
    domitsPropertyId,
    syncType,
    dateFrom,
    dateTo,
    startedAt,
    finishedAt,
    status,
    overallSuccess,
    mappingSnapshot,
    groupedOutboundPayloadSnapshot,
    providerResponseSummary,
    taskIds,
    warnings,
    errors,
    notes,
    rawDetails,
  }) {
    try {
      let resolvedIntegrationAccountId = requireStr(integrationAccountId);
      if (!resolvedIntegrationAccountId && requireStr(userId)) {
        const integration = await this.accounts.findByUserIdAndChannel(requireStr(userId), "CHANNEX");
        resolvedIntegrationAccountId = requireStr(integration?.id);
      }

      if (!resolvedIntegrationAccountId) {
        return {
          evidenceId: null,
          evidencePersisted: false,
          evidenceSkipped: true,
          evidenceSkipReason: "CHANNEX_INTEGRATION_ACCOUNT_UNRESOLVED",
          evidenceError: null,
        };
      }

      const finishedAtMs = Number.isFinite(Number(finishedAt)) ? Number(finishedAt) : nowMs();
      const startedAtMs = Number.isFinite(Number(startedAt)) ? Number(startedAt) : finishedAtMs;
      const row = {
        id: randomUUID(),
        channel: "CHANNEX",
        provider: "CHANNEX",
        integrationAccountId: resolvedIntegrationAccountId ?? null,
        domitsPropertyId: requireStr(domitsPropertyId) ?? null,
        syncType: requireStr(syncType) ?? "ari",
        dateFrom: parseIsoDateParam(dateFrom) ?? null,
        dateTo: parseIsoDateParam(dateTo) ?? null,
        startedAt: startedAtMs,
        finishedAt: finishedAtMs,
        status: requireStr(status) ?? "FAILED",
        overallSuccess: !!overallSuccess,
        mappingSnapshot: stringifyJsonOrNull(mappingSnapshot),
        groupedOutboundPayloadSnapshot: stringifyJsonOrNull(groupedOutboundPayloadSnapshot),
        providerResponseSummary: stringifyJsonOrNull(providerResponseSummary),
        taskIds: stringifyJsonOrNull(Array.isArray(taskIds) ? taskIds : []),
        warnings: stringifyJsonOrNull(Array.isArray(warnings) ? warnings : []),
        errors: stringifyJsonOrNull(Array.isArray(errors) ? errors : []),
        notes: stringifyJsonOrNull(Array.isArray(notes) ? notes : []),
        rawDetails: stringifyJsonOrNull(rawDetails),
        createdAt: finishedAtMs,
        updatedAt: finishedAtMs,
      };

      await this.channexEvidence.create(row);
      return {
        evidenceId: row.id,
        evidencePersisted: true,
        evidenceSkipped: false,
        evidenceSkipReason: null,
        evidenceError: null,
      };
    } catch (error) {
      return {
        evidenceId: null,
        evidencePersisted: false,
        evidenceSkipped: false,
        evidenceSkipReason: null,
        evidenceError: describeLocalError(error),
      };
    }
  }

  async finalizeChannexSyncResult(
    result,
    evidenceInput,
    { skipEvidence = false, includeEvidenceMetadata = true } = {}
  ) {
    if (skipEvidence) return result;

    const evidenceMeta = await this.persistChannexSyncEvidence(evidenceInput);
    if (!includeEvidenceMetadata) return result;

    const response =
      result?.response && typeof result.response === "object" && !Array.isArray(result.response)
        ? { ...result.response }
        : { value: result?.response ?? null };

    response.evidenceId = evidenceMeta.evidenceId;
    response.evidencePersisted = evidenceMeta.evidencePersisted;
    response.evidenceSkipped = !!evidenceMeta.evidenceSkipped;
    if (evidenceMeta.evidenceSkipReason) {
      response.evidenceSkipReason = evidenceMeta.evidenceSkipReason;
    }
    if (evidenceMeta.evidenceError) {
      response.evidenceError = evidenceMeta.evidenceError;
    }

    return {
      ...result,
      response,
    };
  }

  async listChannexSyncEvidence(
    userId,
    { integrationAccountId, domitsPropertyId, syncType, status, dateFrom, dateTo, limit } = {}
  ) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const requestedIntegrationAccountId = requireStr(integrationAccountId);
      if (requestedIntegrationAccountId && requestedIntegrationAccountId !== integration.id) {
        return bad(404, {
          error: "Requested Channex evidence does not belong to this user.",
          errorCode: "CHANNEX_EVIDENCE_NOT_FOUND",
        });
      }

      const numericLimit = Number(limit);
      const safeLimit = Number.isFinite(numericLimit) ? Math.min(Math.max(Math.trunc(numericLimit), 1), 200) : 50;
      const normalizedStatus = requireStr(status);
      const dateFilters = normalizeEvidenceDateFilters(dateFrom, dateTo);
      if (dateFilters.error) return dateFilters.error;

      const rows = await this.channexEvidence.listByFilters({
        integrationAccountId: integration.id,
        domitsPropertyId: requireStr(domitsPropertyId),
        syncType: requireStr(syncType),
        status: normalizedStatus,
        dateFrom: dateFilters.parsedDateFrom,
        dateTo: dateFilters.parsedDateTo,
        limit: safeLimit,
      });

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: requireStr(domitsPropertyId) ?? null,
        syncType: requireStr(syncType) ?? null,
        status: normalizedStatus ?? null,
        dateFrom: dateFilters.parsedDateFrom,
        dateTo: dateFilters.parsedDateTo,
        limit: safeLimit,
        items: (Array.isArray(rows) ? rows : []).map((row) => this.formatChannexEvidenceRow(row)),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to list Channex sync evidence.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_LIST_FAILED",
        details,
      });
    }
  }

  async getChannexSyncEvidence(userId, evidenceId) {
    const normalizedUserId = requireStr(userId);
    const normalizedEvidenceId = requireStr(evidenceId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedEvidenceId) return bad(400, { error: "Missing required path param: evidenceId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const row = await this.channexEvidence.getByIdAndIntegrationAccountId(normalizedEvidenceId, integration.id);
      if (!row) {
        return bad(404, {
          error: "Requested Channex sync evidence was not found.",
          errorCode: "CHANNEX_SYNC_EVIDENCE_NOT_FOUND",
        });
      }

      return ok({
        item: this.formatChannexEvidenceRow(row),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get Channex sync evidence.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_GET_FAILED",
        details,
      });
    }
  }

  async getLatestChannexSyncEvidenceSummary(userId, domitsPropertyId) {
    const normalizedUserId = requireStr(userId);
    const normalizedDomitsPropertyId = requireStr(domitsPropertyId);

    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });
    if (!normalizedDomitsPropertyId) return bad(400, { error: "Missing required query param: domitsPropertyId" });

    try {
      const integration = await this.accounts.findByUserIdAndChannel(normalizedUserId, "CHANNEX");
      if (!integration) {
        return bad(404, {
          error: "Channex integration was not found for this user.",
          errorCode: "CHANNEX_NOT_FOUND",
        });
      }

      const rows = await this.channexEvidence.listByFilters({
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        limit: 1,
      });
      const latest = Array.isArray(rows) && rows.length ? rows[0] : null;

      return ok({
        channel: "CHANNEX",
        integrationAccountId: integration.id,
        domitsPropertyId: normalizedDomitsPropertyId,
        item: this.formatChannexEvidenceLatestSummary(latest),
      });
    } catch (error) {
      const details = describeLocalError(error);
      return bad(500, {
        error: "Failed to get latest Channex sync evidence summary.",
        errorCode: "CHANNEX_SYNC_EVIDENCE_LATEST_FAILED",
        details,
      });
    }
  }
}
