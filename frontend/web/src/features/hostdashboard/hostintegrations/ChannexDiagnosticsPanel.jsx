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
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return <span className="host-integrations-muted">None</span>;

  return (
    <ul className="channex-diagnostics-list">
      {safeItems.map((item, index) => (
        <li key={`${String(item)}-${index}`}>{String(item)}</li>
      ))}
    </ul>
  );
};

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

const SectionCard = ({ title, actions, state, children }) => (
  <section className="channex-diagnostics-card">
    <div className="channex-diagnostics-card-header">
      <h3>{title}</h3>
      <div className="channex-diagnostics-actions">{actions}</div>
    </div>
    {state?.loading ? <p className="host-integrations-loading">Loading...</p> : null}
    {state?.error ? <p className="host-integrations-error-banner">{state.error}</p> : null}
    {children}
  </section>
);

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
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
    run: syncChannexAvailability,
    needsDateRange: true,
  },
  {
    key: "restrictions",
    label: "Sync restrictions/rates",
    run: syncChannexRestrictions,
    needsDateRange: true,
  },
  {
    key: "ari",
    label: "Sync combined ARI",
    run: syncChannexAri,
    needsDateRange: true,
  },
  {
    key: "full",
    label: "Full/certification sync",
    run: syncChannexFull,
    needsDateRange: true,
  },
  {
    key: "receive",
    label: "Receive booking revisions",
    run: receiveChannexBookingRevisions,
    needsDateRange: false,
  },
];

function ChannexDiagnosticsPanel({ userId }) {
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

  return (
    <section className="channex-diagnostics">
      <div className="channex-diagnostics-header">
        <div>
          <p className="host-integrations-eyebrow">Internal certification</p>
          <h2>Channex diagnostics</h2>
          <p>
            Internal tools for checking Channex connection, mappings, ARI previews, sync evidence, and manual
            certification actions.
          </p>
        </div>
      </div>

      <div className="host-integrations-manual-form">
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

      <div className="channex-diagnostics-grid">
        <SectionCard
          title="Channex status"
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

        <SectionCard
          title="ARI targets and readiness"
          state={targetsState}
          actions={
            <button
              type="button"
              className="host-integrations-secondary-btn"
              disabled={!hasProperty || targetsState.loading}
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

        <SectionCard
          title="Latest sync evidence"
          state={latestEvidenceState}
          actions={
            <button
              type="button"
              className="host-integrations-secondary-btn"
              disabled={!hasProperty || latestEvidenceState.loading}
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

        <SectionCard
          title="ARI preview"
          state={ariPreviewState}
          actions={
            <button
              type="button"
              className="host-integrations-secondary-btn"
              disabled={!hasDateRange || ariPreviewState.loading}
              onClick={loadAriPreview}
            >
              {ariPreviewState.loading ? "Loading..." : "Load ARI preview"}
            </button>
          }
        >
          {ariPreviewState.data ? (
            <>
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
          state={payloadPreviewState}
          actions={
            <button
              type="button"
              className="host-integrations-secondary-btn"
              disabled={!hasDateRange || payloadPreviewState.loading}
              onClick={loadPayloadPreview}
            >
              {payloadPreviewState.loading ? "Loading..." : "Load ARI payload preview"}
            </button>
          }
        >
          {payloadPreviewState.data ? (
            <>
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

      <section className="channex-diagnostics-card">
        <div className="channex-diagnostics-card-header">
          <h3>Manual certification actions</h3>
        </div>
        <div className="channex-diagnostics-action-grid">
          {ACTION_CONFIG.map((config) => {
            const state = actionStates[config.key] || {};
            const disabled = state.loading || !hasProperty || (config.needsDateRange && !hasDateRange);

            return (
              <div className="channex-diagnostics-action-card" key={config.key}>
                <button
                  type="button"
                  className="host-integrations-primary-btn"
                  disabled={disabled}
                  onClick={() => runManualAction(config)}
                >
                  {state.loading ? "Running..." : config.label}
                </button>
                {state.success ? <p className="host-integrations-success-banner">{state.success}</p> : null}
                {state.error ? <p className="host-integrations-error-banner">{state.error}</p> : null}
                {state.data ? <JsonBlock title={`${config.label} response`} value={state.data} /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <ChannexBookingRevisionLog userId={userId} domitsPropertyId={domitsPropertyId} />
    </section>
  );
}

ChannexDiagnosticsPanel.propTypes = {
  userId: PropTypes.string,
};

export default ChannexDiagnosticsPanel;
