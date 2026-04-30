import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import ChannexBookingRevisionLog from "./ChannexBookingRevisionLog";
import {
  getChannexAriPayloadPreview,
  getChannexAriPreview,
  getChannexAriTargets,
  getChannexStatus,
  getLatestChannexSyncEvidence,
  receiveChannexBookingRevisions,
  syncChannexAri,
  syncChannexAvailability,
  syncChannexFull,
  syncChannexRestrictions,
} from "./channexApi";

const SECTION_TABS = [
  { key: "overview", label: "Overview" },
  { key: "mappings", label: "Mappings" },
  { key: "ari", label: "ARI Preview" },
  { key: "evidence", label: "Evidence" },
  { key: "bookingRevisions", label: "Booking Revisions" },
  { key: "actions", label: "Actions" },
];

const createRequestState = () => ({
  loading: false,
  error: "",
  data: null,
});

const formatDateTime = (value) => {
  if (!value) return "Unknown";
  const numericValue = Number(value);
  const date = new Date(Number.isFinite(numericValue) ? numericValue : value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const stringifyJson = (value) => JSON.stringify(value ?? null, null, 2);

const renderList = (items) => {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : items ? [items] : [];
  if (!safeItems.length) return <span className="host-integrations-muted">None</span>;

  return (
    <ul className="channex-diagnostics-list">
      {safeItems.map((item, index) => (
        <li key={`${String(item)}-${index}`}>{String(item)}</li>
      ))}
    </ul>
  );
};

const getExternalPropertyId = (targets) =>
  targets?.propertyMapping?.externalPropertyId ||
  targets?.roomTypeMappings?.find((mapping) => mapping?.externalPropertyId)?.externalPropertyId ||
  targets?.ratePlanMappings?.find((mapping) => mapping?.externalPropertyId)?.externalPropertyId ||
  null;

const getReadinessLabel = (targetsState) => {
  if (!targetsState.data) return "Not loaded";
  return targetsState.data.ready === true ? "Ready" : "Not ready";
};

const getSupportedRestrictionFields = (ariPreview, payloadPreview) =>
  payloadPreview?.sourceSummary?.supportedChannexRestrictionFields ||
  ariPreview?.sourceSummary?.supportedChannexRestrictionFields ||
  [];

const getOmittedRestrictionNames = (ariPreview, payloadPreview) =>
  payloadPreview?.sourceSummary?.omittedDomitsRestrictionNames || ariPreview?.sourceSummary?.omittedDomitsRestrictionNames || [];

const DetailGrid = ({ items }) => (
  <dl className="channex-diagnostics-detail-grid">
    {items.map(({ label, value }) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value ?? "Unknown"}</dd>
      </div>
    ))}
  </dl>
);

DetailGrid.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
    })
  ).isRequired,
};

const JsonBlock = ({ title, value }) => (
  <div className="channex-diagnostics-json-block">
    <h4>{title}</h4>
    <pre>{stringifyJson(value)}</pre>
  </div>
);

JsonBlock.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.any,
};

const MappingTable = ({ title, rows, columns }) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="channex-diagnostics-table-wrap">
      <h4>{title}</h4>
      {safeRows.length ? (
        <table className="channex-diagnostics-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column.key}>{row?.[column.key] ?? "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="host-integrations-muted">No rows loaded.</p>
      )}
    </div>
  );
};

MappingTable.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};

const SectionCard = ({ title, description, actions, state, children }) => (
  <section className="channex-diagnostics-card">
    <div className="channex-diagnostics-card-header">
      <div>
        <h3>{title}</h3>
        {description ? <p className="host-integrations-muted">{description}</p> : null}
      </div>
      {actions ? <div className="channex-diagnostics-actions">{actions}</div> : null}
    </div>
    {state?.loading ? <p className="host-integrations-loading">Loading...</p> : null}
    {state?.error ? <p className="host-integrations-error-banner">{state.error}</p> : null}
    {children}
  </section>
);

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actions: PropTypes.node,
  state: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
  }),
  children: PropTypes.node,
};

const ACTION_CONFIG = [
  {
    key: "availability",
    label: "Sync availability",
    description: "Send availability for the selected mapped property and date range.",
    run: syncChannexAvailability,
    needsDateRange: true,
    confirmMessage: "Run Channex availability sync for this property and date range?",
  },
  {
    key: "restrictions",
    label: "Sync restrictions/rates",
    description: "Send mapped rate and restriction payloads for the selected date range.",
    run: syncChannexRestrictions,
    needsDateRange: true,
    confirmMessage: "Run Channex restrictions/rates sync for this property and date range?",
  },
  {
    key: "ari",
    label: "Sync combined ARI",
    description: "Send combined availability, rates, and restrictions for certification checks.",
    run: syncChannexAri,
    needsDateRange: true,
    confirmMessage: "Run combined Channex ARI sync for this property and date range?",
  },
  {
    key: "full",
    label: "Full/certification sync",
    description: "Heavy action: sends the full certification sync set for the selected date range.",
    run: syncChannexFull,
    needsDateRange: true,
    danger: true,
    confirmMessage:
      "Run full/certification sync? This can send availability, rates, and restrictions to Channex for the selected date range.",
  },
  {
    key: "receive",
    label: "Receive booking revisions",
    description: "Manually poll/persist Channex booking revisions for the selected mapped property.",
    run: receiveChannexBookingRevisions,
    needsDateRange: false,
    confirmMessage: "Receive Channex booking revisions for this property?",
  },
];

function ChannexDiagnosticsPanel({ userId }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [domitsPropertyId, setDomitsPropertyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [statusState, setStatusState] = useState(createRequestState);
  const [targetsState, setTargetsState] = useState(createRequestState);
  const [latestEvidenceState, setLatestEvidenceState] = useState(createRequestState);
  const [ariPreviewState, setAriPreviewState] = useState(createRequestState);
  const [payloadPreviewState, setPayloadPreviewState] = useState(createRequestState);
  const [actionStates, setActionStates] = useState({});

  const hasProperty = Boolean(domitsPropertyId.trim());
  const hasDateRange = hasProperty && Boolean(dateFrom) && Boolean(dateTo);
  const baseParams = useMemo(
    () => ({
      userId,
      domitsPropertyId: domitsPropertyId.trim(),
      dateFrom,
      dateTo,
    }),
    [dateFrom, dateTo, domitsPropertyId, userId]
  );

  const runRequest = useCallback(async ({ setState, request }) => {
    setState({ loading: true, error: "", data: null });
    try {
      const data = await request();
      setState({ loading: false, error: "", data });
      return data;
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || "Channex request failed.",
        data: null,
      });
      return null;
    }
  }, []);

  const refreshStatus = useCallback(
    () =>
      runRequest({
        setState: setStatusState,
        request: () => getChannexStatus({ userId }),
      }),
    [runRequest, userId]
  );

  useEffect(() => {
    if (!userId) return;
    refreshStatus();
  }, [refreshStatus, userId]);

  const loadTargets = () =>
    runRequest({
      setState: setTargetsState,
      request: () => getChannexAriTargets(baseParams),
    });

  const loadLatestEvidence = () =>
    runRequest({
      setState: setLatestEvidenceState,
      request: () => getLatestChannexSyncEvidence(baseParams),
    });

  const loadAriPreview = () =>
    runRequest({
      setState: setAriPreviewState,
      request: () => getChannexAriPreview(baseParams),
    });

  const loadPayloadPreview = () =>
    runRequest({
      setState: setPayloadPreviewState,
      request: () => getChannexAriPayloadPreview(baseParams),
    });

  const runManualAction = async (config) => {
    if (config.confirmMessage && typeof globalThis.confirm === "function" && !globalThis.confirm(config.confirmMessage)) {
      return;
    }

    setActionStates((current) => ({
      ...current,
      [config.key]: { loading: true, error: "", data: null, success: "" },
    }));

    try {
      const data = await config.run(baseParams);
      setActionStates((current) => ({
        ...current,
        [config.key]: {
          loading: false,
          error: "",
          data,
          success: `${config.label} completed.`,
        },
      }));
    } catch (error) {
      setActionStates((current) => ({
        ...current,
        [config.key]: {
          loading: false,
          error: error?.message || `${config.label} failed.`,
          data: null,
          success: "",
        },
      }));
    }
  };

  const status = statusState.data || {};
  const targets = targetsState.data || {};
  const latestEvidence = latestEvidenceState.data?.item || null;
  const ariPreview = ariPreviewState.data || {};
  const payloadPreview = payloadPreviewState.data || {};
  const externalPropertyId = getExternalPropertyId(targets);
  const supportedRestrictionFields = getSupportedRestrictionFields(ariPreview, payloadPreview);
  const omittedRestrictionNames = getOmittedRestrictionNames(ariPreview, payloadPreview);

  const renderOverview = () => (
    <div className="channex-diagnostics-grid">
      <SectionCard title="Overview" description="Current certification workspace state.">
        <DetailGrid
          items={[
            { label: "Domits property ID", value: domitsPropertyId.trim() || "Not selected" },
            { label: "External Channex property", value: externalPropertyId || "Not loaded" },
            { label: "Connection", value: status.status || "Not loaded" },
            { label: "Integration account", value: status.integrationAccountId || targets.integrationAccountId },
            { label: "Validation", value: status.validationState || status.validationMode || "Not loaded" },
            { label: "Readiness", value: getReadinessLabel(targetsState) },
            { label: "Missing mappings", value: targetsState.data ? renderList(targets.missingMappings) : "Not loaded" },
            { label: "Latest evidence", value: latestEvidence?.status || "Not loaded" },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Channex status"
        description="Read-only connection and credential validation state."
        state={statusState}
        actions={
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={!userId || statusState.loading}
            onClick={refreshStatus}
          >
            {statusState.loading ? "Refreshing..." : "Refresh status"}
          </button>
        }
      >
        {statusState.data ? (
          <>
            <DetailGrid
              items={[
                { label: "Connection", value: status.status },
                { label: "Integration account", value: status.integrationAccountId },
                { label: "Validation state", value: status.validationState },
                { label: "Reason", value: status.reason },
              ]}
            />
            <JsonBlock title="Status response" value={statusState.data} />
          </>
        ) : (
          <p className="host-integrations-muted">Status has not loaded yet.</p>
        )}
      </SectionCard>
    </div>
  );

  const renderMappings = () => (
    <SectionCard
      title="Mappings and readiness"
      description="Property, room type, and rate plan mappings used to build ARI targets."
      state={targetsState}
      actions={
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={!userId || !hasProperty || targetsState.loading}
          onClick={loadTargets}
        >
          {targetsState.loading ? "Loading..." : "Load ARI targets/readiness"}
        </button>
      }
    >
      {targetsState.data ? (
        <>
          <DetailGrid
            items={[
              { label: "Ready", value: targets.ready === true ? "Yes" : "No" },
              { label: "Integration account", value: targets.integrationAccountId },
              { label: "External Channex property", value: externalPropertyId || "Unknown" },
              { label: "Missing mappings", value: renderList(targets.missingMappings) },
            ]}
          />
          <JsonBlock title="Property mapping" value={targets.propertyMapping} />
          <MappingTable
            title="Room type mappings"
            rows={targets.roomTypeMappings}
            columns={[
              { key: "domitsPropertyId", label: "Domits property" },
              { key: "externalPropertyId", label: "Channex property" },
              { key: "externalRoomTypeId", label: "Room type" },
              { key: "externalRoomTypeName", label: "Name" },
              { key: "status", label: "Status" },
            ]}
          />
          <MappingTable
            title="Rate plan mappings"
            rows={targets.ratePlanMappings}
            columns={[
              { key: "domitsPropertyId", label: "Domits property" },
              { key: "externalPropertyId", label: "Channex property" },
              { key: "externalRoomTypeId", label: "Room type" },
              { key: "externalRatePlanId", label: "Rate plan" },
              { key: "externalRatePlanName", label: "Name" },
              { key: "status", label: "Status" },
            ]}
          />
        </>
      ) : (
        <p className="host-integrations-muted">Enter a property ID and load readiness.</p>
      )}
    </SectionCard>
  );

  const renderAriPreview = () => (
    <div className="channex-diagnostics-grid">
      <SectionCard
        title="ARI preview"
        description="Read-only Domits source values before grouped Channex payload generation."
        state={ariPreviewState}
        actions={
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={!userId || !hasDateRange || ariPreviewState.loading}
            onClick={loadAriPreview}
          >
            {ariPreviewState.loading ? "Loading..." : "Load ARI preview"}
          </button>
        }
      >
        {ariPreviewState.data ? (
          <>
            <DetailGrid
              items={[
                { label: "Supported restriction fields", value: renderList(supportedRestrictionFields) },
                { label: "Omitted Domits restrictions", value: renderList(omittedRestrictionNames) },
              ]}
            />
            <JsonBlock title="Source summary" value={ariPreview.sourceSummary} />
            <JsonBlock title="Availability preview" value={ariPreview.availabilityPreview} />
            <JsonBlock title="Rate/restriction preview" value={ariPreview.rateRestrictionPreview} />
          </>
        ) : (
          <p className="host-integrations-muted">Enter property and date range to preview ARI.</p>
        )}
      </SectionCard>

      <SectionCard
        title="ARI payload preview"
        description="Grouped availability and restriction/rate payloads that would be sent to Channex."
        state={payloadPreviewState}
        actions={
          <button
            type="button"
            className="host-integrations-secondary-btn"
            disabled={!userId || !hasDateRange || payloadPreviewState.loading}
            onClick={loadPayloadPreview}
          >
            {payloadPreviewState.loading ? "Loading..." : "Load ARI payload preview"}
          </button>
        }
      >
        {payloadPreviewState.data ? (
          <>
            <DetailGrid
              items={[
                { label: "Supported restriction fields", value: renderList(supportedRestrictionFields) },
                { label: "Omitted Domits restrictions", value: renderList(omittedRestrictionNames) },
              ]}
            />
            <JsonBlock
              title="Grouped availability payloads"
              value={payloadPreview.availabilityPayloadPreview?.groupedPayloads}
            />
            <JsonBlock
              title="Grouped restriction/rate payloads"
              value={payloadPreview.restrictionRatePayloadPreview?.groupedPayloads}
            />
            <JsonBlock title="Payload preview notes" value={payloadPreview.notes} />
          </>
        ) : (
          <p className="host-integrations-muted">Enter property and date range to preview payloads.</p>
        )}
      </SectionCard>
    </div>
  );

  const renderEvidence = () => (
    <SectionCard
      title="Latest sync evidence"
      description="Most recent persisted Channex sync evidence for the selected property."
      state={latestEvidenceState}
      actions={
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={!userId || !hasProperty || latestEvidenceState.loading}
          onClick={loadLatestEvidence}
        >
          {latestEvidenceState.loading ? "Refreshing..." : "Refresh latest evidence"}
        </button>
      }
    >
      {latestEvidence ? (
        <>
          <DetailGrid
            items={[
              { label: "Sync type", value: latestEvidence.syncType },
              { label: "Status", value: latestEvidence.status },
              { label: "Overall success", value: latestEvidence.overallSuccess ? "Yes" : "No" },
              { label: "Started", value: formatDateTime(latestEvidence.startedAt) },
              { label: "Finished", value: formatDateTime(latestEvidence.finishedAt) },
              { label: "Task IDs", value: renderList(latestEvidence.taskIds) },
              { label: "Warnings", value: latestEvidence.warningCount ?? latestEvidence.warnings?.length ?? 0 },
              { label: "Errors", value: latestEvidence.errorCount ?? latestEvidence.errors?.length ?? 0 },
              { label: "Notes", value: renderList(latestEvidence.notesSummary || latestEvidence.notes) },
            ]}
          />
          <JsonBlock title="Latest evidence response" value={latestEvidenceState.data} />
        </>
      ) : (
        <p className="host-integrations-muted">No latest evidence loaded.</p>
      )}
    </SectionCard>
  );

  const renderActions = () => (
    <section className="channex-diagnostics-card">
      <div className="channex-diagnostics-card-header">
        <div>
          <h3>Manual certification actions</h3>
          <p className="host-integrations-muted">
            These actions call Channex-facing backend endpoints only after explicit confirmation.
          </p>
        </div>
      </div>
      <div className="channex-diagnostics-action-grid">
        {ACTION_CONFIG.map((config) => {
          const state = actionStates[config.key] || {};
          const disabled = !userId || state.loading || !hasProperty || (config.needsDateRange && !hasDateRange);

          return (
            <div className="channex-diagnostics-action-card" key={config.key}>
              <div>
                <h4>{config.label}</h4>
                <p className="host-integrations-muted">{config.description}</p>
              </div>
              <button
                type="button"
                className={config.danger ? "host-integrations-danger-btn" : "host-integrations-primary-btn"}
                disabled={disabled}
                onClick={() => runManualAction(config)}
              >
                {state.loading ? "Running..." : config.label}
              </button>
              {config.danger ? (
                <p className="host-integrations-warning-banner">
                  Heavy certification action. Verify property, mappings, and date range before running.
                </p>
              ) : null}
              {state.success ? <p className="host-integrations-success-banner">{state.success}</p> : null}
              {state.error ? <p className="host-integrations-error-banner">{state.error}</p> : null}
              {state.data ? <JsonBlock title={`${config.label} response`} value={state.data} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <section className="channex-diagnostics">
      <div className="host-integrations-manual-form channex-diagnostics-control-panel">
        <div className="host-integrations-field-grid">
          <label className="host-integrations-field">
            <span>Domits property ID</span>
            <input
              value={domitsPropertyId}
              onChange={(event) => setDomitsPropertyId(event.target.value)}
              placeholder="Property ID"
            />
          </label>
          <label className="host-integrations-field">
            <span>Date from</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="host-integrations-field">
            <span>Date to</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
      </div>

      <nav className="channex-diagnostics-tabs" aria-label="Channex certification sections">
        {SECTION_TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={activeSection === tab.key ? "is-active" : ""}
            onClick={() => setActiveSection(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeSection === "overview" ? renderOverview() : null}
      {activeSection === "mappings" ? renderMappings() : null}
      {activeSection === "ari" ? renderAriPreview() : null}
      {activeSection === "evidence" ? renderEvidence() : null}
      {activeSection === "bookingRevisions" ? (
        <ChannexBookingRevisionLog userId={userId} domitsPropertyId={domitsPropertyId} />
      ) : null}
      {activeSection === "actions" ? renderActions() : null}
    </section>
  );
}

ChannexDiagnosticsPanel.propTypes = {
  userId: PropTypes.string,
};

export default ChannexDiagnosticsPanel;
