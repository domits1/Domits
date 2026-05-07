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
  syncChannexCertificationTestCase,
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
const PAYLOAD_PREVIEW_PAGE_SIZE_DAYS = 30;
const CHANNEX_CERTIFICATION_MAX_SYNC_DAYS = 500;
const CERTIFICATION_TEST_CASES = [
  { id: "2", title: "Single Date Update for Single Rate", payloadType: "Rates" },
  { id: "3", title: "Single Date Update for Multiple Rates", payloadType: "Rates" },
  { id: "4", title: "Multiple Date Update for Multiple Rates", payloadType: "Rates" },
  { id: "5", title: "Min Stay Update", payloadType: "Restrictions" },
  { id: "6", title: "Stop Sell Update", payloadType: "Restrictions" },
  { id: "7", title: "Multiple Restrictions Update", payloadType: "Restrictions" },
  { id: "8", title: "Half-year Update", payloadType: "Rates and restrictions" },
  { id: "9", title: "Single Date Availability Update", payloadType: "Availability" },
  { id: "10", title: "Multiple Date Availability Update", payloadType: "Availability" },
];

const createRequestState = () => ({
  loading: false,
  error: "",
  errorDetails: null,
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

const normalizeChannexError = (error, fallbackMessage = "Channex request failed.") => ({
  message: error?.message || fallbackMessage,
  endpoint: error?.endpoint || null,
  method: error?.method || null,
  status: error?.status || null,
  responseBody: error?.responseBody ?? null,
});

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

const countPayloadGroups = (payloadSection) =>
  Array.isArray(payloadSection?.groupedPayloads) ? payloadSection.groupedPayloads.length : 0;

const countPayloadItems = (payloadSection) => (Array.isArray(payloadSection?.items) ? payloadSection.items.length : 0);

const formatBooleanFlag = (value) => (value === true ? "Yes" : "No");

const formatDateWindow = (values) => {
  const dates = (Array.isArray(values) ? values : [])
    .map((value) => value?.date)
    .filter(Boolean)
    .sort();

  if (!dates.length) return "No dates";
  if (dates[0] === dates[dates.length - 1]) return dates[0];
  return `${dates[0]} to ${dates[dates.length - 1]}`;
};

const uniqueJoinedValues = (values) => {
  const uniqueValues = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map((value) => String(value))
    )
  );

  return uniqueValues.length ? uniqueValues.join(", ") : "-";
};

const isoDateToUtcMs = (value) => {
  if (!value) return null;
  const timestamp = new Date(`${value}T00:00:00.000Z`).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const addDaysToIsoDate = (value, days) => {
  const timestamp = isoDateToUtcMs(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(Number(days))) return null;

  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + Math.trunc(Number(days)));
  return date.toISOString().slice(0, 10);
};

const countInclusiveDays = (startDate, endDate) => {
  const startMs = isoDateToUtcMs(startDate);
  const endMs = isoDateToUtcMs(endDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
};

const formatRangeLabel = (startDate, endDate) => (startDate && endDate ? `${startDate} -> ${endDate}` : "Not selected");

const validateSelectedDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return {
      message: "Select both Date from and Date to before running this sync.",
      totalDays: null,
    };
  }

  const totalDays = countInclusiveDays(startDate, endDate);
  if (!totalDays) {
    return {
      message: "Select a valid date range where Date to is on or after Date from.",
      totalDays: null,
    };
  }

  if (totalDays > CHANNEX_CERTIFICATION_MAX_SYNC_DAYS) {
    return {
      message: `The selected range is ${totalDays} days. Channex certification syncs support up to ${CHANNEX_CERTIFICATION_MAX_SYNC_DAYS} inclusive days.`,
      totalDays,
    };
  }

  return {
    message: "",
    totalDays,
  };
};

const getPayloadPaginationSummary = (pagination = {}) => {
  const pageSizeDays = Number(pagination.pageSizeDays) || PAYLOAD_PREVIEW_PAGE_SIZE_DAYS;
  const totalRequestedDays = Number(pagination.totalRequestedDays) || null;
  const totalPages = totalRequestedDays ? Math.max(1, Math.ceil(totalRequestedDays / pageSizeDays)) : null;
  const requestedStartMs = isoDateToUtcMs(pagination.requestedDateFrom);
  const pageStartMs = isoDateToUtcMs(pagination.pageDateFrom);
  const dayOffset =
    Number.isFinite(requestedStartMs) && Number.isFinite(pageStartMs)
      ? Math.max(0, Math.floor((pageStartMs - requestedStartMs) / (24 * 60 * 60 * 1000)))
      : 0;
  const currentPage = totalPages ? Math.min(totalPages, Math.floor(dayOffset / pageSizeDays) + 1) : null;
  const lastPageDateFrom =
    totalPages && pagination.requestedDateFrom ? addDaysToIsoDate(pagination.requestedDateFrom, (totalPages - 1) * pageSizeDays) : null;

  return {
    currentPage,
    totalPages,
    pageSizeDays,
    lastPageDateFrom,
    windowLabel:
      pagination.pageDateFrom && pagination.pageDateTo
        ? `${pagination.pageDateFrom} to ${pagination.pageDateTo}`
        : "Window not loaded",
    requestedRangeLabel:
      pagination.requestedDateFrom && pagination.requestedDateTo
        ? `${pagination.requestedDateFrom} to ${pagination.requestedDateTo}`
        : "Requested range unknown",
  };
};

const summarizeAvailabilityPayloadGroups = (groups) =>
  (Array.isArray(groups) ? groups : []).map((group) => {
    const values = Array.isArray(group?.values) ? group.values : [];
    return {
      externalPropertyId: group?.externalPropertyId || "-",
      externalRoomTypeId: group?.externalRoomTypeId || "-",
      dateWindow: formatDateWindow(values),
      availableCount: values.filter((value) => value?.availability === true).length,
      unavailableCount: values.filter((value) => value?.availability === false).length,
      totalItems: values.length,
      values,
    };
  });

const summarizeRestrictionPayloadGroups = (groups) =>
  (Array.isArray(groups) ? groups : []).map((group) => {
    const values = Array.isArray(group?.values) ? group.values : [];
    return {
      externalPropertyId: group?.externalPropertyId || "-",
      externalRoomTypeId: group?.externalRoomTypeId || "-",
      externalRatePlanId: group?.externalRatePlanId || "-",
      dateWindow: formatDateWindow(values),
      stopSellCount: values.filter((value) => value?.stop_sell === true).length,
      closedToArrivalCount: values.filter((value) => value?.closed_to_arrival === true).length,
      closedToDepartureCount: values.filter((value) => value?.closed_to_departure === true).length,
      minStayValues: uniqueJoinedValues(values.map((value) => value?.min_stay_through)),
      maxStayValues: uniqueJoinedValues(values.map((value) => value?.max_stay)),
      totalItems: values.length,
      values,
    };
  });

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

const IdentifierList = ({ title, ids }) => {
  const safeIds = Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean)));
  if (!safeIds.length) return null;

  const copyIds = async () => {
    if (!globalThis.navigator?.clipboard?.writeText) return;
    await globalThis.navigator.clipboard.writeText(safeIds.join("\n"));
  };

  return (
    <div className="channex-sync-id-list">
      <div className="channex-sync-id-list-header">
        <h5>{title}</h5>
        <button type="button" className="host-integrations-secondary-btn" onClick={copyIds}>
          Copy all
        </button>
      </div>
      <pre>{safeIds.join("\n")}</pre>
    </div>
  );
};

IdentifierList.propTypes = {
  title: PropTypes.string.isRequired,
  ids: PropTypes.array,
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

const PayloadSummaryPanel = ({ title, groupCount, itemCount, dateWindow, children }) => (
  <div className="channex-payload-summary-panel">
    <div>
      <h4>{title}</h4>
      <p className="host-integrations-muted">{dateWindow}</p>
    </div>
    <div className="channex-payload-summary-numbers">
      <span>
        <strong>{groupCount}</strong>
        groups
      </span>
      <span>
        <strong>{itemCount}</strong>
        items
      </span>
    </div>
    {children}
  </div>
);

PayloadSummaryPanel.propTypes = {
  title: PropTypes.string.isRequired,
  groupCount: PropTypes.number.isRequired,
  itemCount: PropTypes.number.isRequired,
  dateWindow: PropTypes.string.isRequired,
  children: PropTypes.node,
};

const AvailabilityPayloadTable = ({ rows }) => (
  <div className="channex-diagnostics-table-wrap">
    <h4>Availability payloads</h4>
    {rows.length ? (
      <table className="channex-diagnostics-table channex-payload-table">
        <thead>
          <tr>
            <th>External property ID</th>
            <th>External room type ID</th>
            <th>Date range</th>
            <th>Available</th>
            <th>Unavailable</th>
            <th>Total items</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.externalPropertyId}-${row.externalRoomTypeId}`}>
              <td>{row.externalPropertyId}</td>
              <td>{row.externalRoomTypeId}</td>
              <td>{row.dateWindow}</td>
              <td>{row.availableCount}</td>
              <td>{row.unavailableCount}</td>
              <td>{row.totalItems}</td>
              <td>
                <details className="channex-payload-row-details">
                  <summary>View dates</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.values.map((value) => (
                        <tr key={`${row.externalRoomTypeId}-${value.date}`}>
                          <td>{value.date}</td>
                          <td>{formatBooleanFlag(value.availability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="host-integrations-muted">No availability payloads were generated for this page.</p>
    )}
  </div>
);

AvailabilityPayloadTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      externalPropertyId: PropTypes.string.isRequired,
      externalRoomTypeId: PropTypes.string.isRequired,
      dateWindow: PropTypes.string.isRequired,
      availableCount: PropTypes.number.isRequired,
      unavailableCount: PropTypes.number.isRequired,
      totalItems: PropTypes.number.isRequired,
      values: PropTypes.array.isRequired,
    })
  ).isRequired,
};

const RestrictionPayloadTable = ({ rows }) => (
  <div className="channex-diagnostics-table-wrap">
    <h4>Rate/restriction payloads</h4>
    {rows.length ? (
      <table className="channex-diagnostics-table channex-payload-table">
        <thead>
          <tr>
            <th>External property ID</th>
            <th>External room type ID</th>
            <th>External rate plan ID</th>
            <th>Date range</th>
            <th>Stop sell</th>
            <th>CTA</th>
            <th>CTD</th>
            <th>Min stay values</th>
            <th>Max stay values</th>
            <th>Total items</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.externalPropertyId}-${row.externalRoomTypeId}-${row.externalRatePlanId}`}>
              <td>{row.externalPropertyId}</td>
              <td>{row.externalRoomTypeId}</td>
              <td>{row.externalRatePlanId}</td>
              <td>{row.dateWindow}</td>
              <td>{row.stopSellCount}</td>
              <td>{row.closedToArrivalCount}</td>
              <td>{row.closedToDepartureCount}</td>
              <td>{row.minStayValues}</td>
              <td>{row.maxStayValues}</td>
              <td>{row.totalItems}</td>
              <td>
                <details className="channex-payload-row-details">
                  <summary>View dates</summary>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Rate</th>
                        <th>Stop sell</th>
                        <th>CTA</th>
                        <th>CTD</th>
                        <th>Min stay</th>
                        <th>Max stay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.values.map((value) => (
                        <tr key={`${row.externalRatePlanId}-${value.date}`}>
                          <td>{value.date}</td>
                          <td>{value.rate || "-"}</td>
                          <td>{formatBooleanFlag(value.stop_sell)}</td>
                          <td>{formatBooleanFlag(value.closed_to_arrival)}</td>
                          <td>{formatBooleanFlag(value.closed_to_departure)}</td>
                          <td>{value.min_stay_through ?? "-"}</td>
                          <td>{value.max_stay ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="host-integrations-muted">No rate/restriction payloads were generated for this page.</p>
    )}
  </div>
);

RestrictionPayloadTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      externalPropertyId: PropTypes.string.isRequired,
      externalRoomTypeId: PropTypes.string.isRequired,
      externalRatePlanId: PropTypes.string.isRequired,
      dateWindow: PropTypes.string.isRequired,
      stopSellCount: PropTypes.number.isRequired,
      closedToArrivalCount: PropTypes.number.isRequired,
      closedToDepartureCount: PropTypes.number.isRequired,
      minStayValues: PropTypes.string.isRequired,
      maxStayValues: PropTypes.string.isRequired,
      totalItems: PropTypes.number.isRequired,
      values: PropTypes.array.isRequired,
    })
  ).isRequired,
};

const PayloadNotesPanel = ({ payloadPreview, omittedRestrictionNames }) => {
  const notes = Array.isArray(payloadPreview.notes) ? payloadPreview.notes.filter(Boolean) : [];
  const sourceSummary = payloadPreview.sourceSummary || {};
  const calendarOverrideCount = sourceSummary.calendarOverrides ?? 0;
  const calendarRestrictionOverrideCount = sourceSummary.calendarRestrictionOverrides ?? 0;
  const hasOmittedRestrictions = Array.isArray(omittedRestrictionNames) && omittedRestrictionNames.length > 0;

  return (
    <section className="channex-payload-notes">
      <div>
        <h4>Notes and warnings</h4>
        <p className="host-integrations-muted">
          Calendar overrides: {calendarOverrideCount}. Restriction override dates: {calendarRestrictionOverrideCount}.
        </p>
      </div>
      {hasOmittedRestrictions ? (
        <p className="host-integrations-warning-banner">
          Omitted Domits restrictions: {omittedRestrictionNames.join(", ")}. These are intentionally omitted when no
          safe Channex mapping exists.
        </p>
      ) : (
        <p className="host-integrations-success-banner">No omitted Domits restriction warnings for this page.</p>
      )}
      {notes.length ? (
        <ul className="channex-payload-note-list">
          {notes.map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      ) : (
        <p className="host-integrations-muted">No warnings for this page.</p>
      )}
    </section>
  );
};

PayloadNotesPanel.propTypes = {
  payloadPreview: PropTypes.object.isRequired,
  omittedRestrictionNames: PropTypes.array.isRequired,
};

const PayloadPreviewDetails = ({ payloadPreview, omittedRestrictionNames, onLoadPage, loading }) => {
  const pagination = payloadPreview.pagination || {};
  const paginationSummary = getPayloadPaginationSummary(pagination);
  const availabilityPayload = payloadPreview.availabilityPayloadPreview || {};
  const restrictionRatePayload = payloadPreview.restrictionRatePayloadPreview || {};
  const availabilityRows = summarizeAvailabilityPayloadGroups(availabilityPayload.groupedPayloads);
  const restrictionRows = summarizeRestrictionPayloadGroups(restrictionRatePayload.groupedPayloads);
  const isFirstPage = !pagination.hasPreviousPage;
  const isLastPage = !pagination.hasNextPage;

  return (
    <div className="channex-payload-preview">
      <section className="channex-payload-header-panel">
        <div className="channex-payload-title-row">
          <div>
            <h3>ARI payload preview</h3>
            <p className="host-integrations-muted">Preview only. Nothing is sent to Channex from this view.</p>
          </div>
          <span className="channex-payload-preview-badge">Preview only</span>
        </div>
        <div className="channex-payload-range-grid">
          <div>
            <span>Requested range</span>
            <strong>{paginationSummary.requestedRangeLabel}</strong>
          </div>
          <div>
            <span>Showing</span>
            <strong>{paginationSummary.windowLabel}</strong>
          </div>
          <div>
            <span>Page</span>
            <strong>
              {paginationSummary.currentPage && paginationSummary.totalPages
                ? `${paginationSummary.currentPage} of ${paginationSummary.totalPages}`
                : "Unknown"}
            </strong>
          </div>
          <div>
            <span>Page size</span>
            <strong>{paginationSummary.pageSizeDays} days per page</strong>
          </div>
          <div>
            <span>Total requested days</span>
            <strong>{pagination.totalRequestedDays ?? "Unknown"}</strong>
          </div>
        </div>
      </section>

      <section className="channex-payload-pagination-panel">
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={isFirstPage || loading}
          onClick={() => onLoadPage(pagination.requestedDateFrom)}
        >
          First page
        </button>
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={isFirstPage || loading}
          onClick={() => onLoadPage(pagination.previousPageDateFrom)}
        >
          Previous page
        </button>
        <div className="channex-payload-current-window">
          <strong>{paginationSummary.windowLabel}</strong>
          <span>
            {isLastPage
              ? "You are viewing the final page of the requested range."
              : "More payload preview pages are available."}
          </span>
        </div>
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={isLastPage || loading}
          onClick={() => onLoadPage(pagination.nextPageDateFrom)}
        >
          Next page
        </button>
        <button
          type="button"
          className="host-integrations-secondary-btn"
          disabled={isLastPage || loading || !paginationSummary.lastPageDateFrom}
          onClick={() => onLoadPage(paginationSummary.lastPageDateFrom)}
        >
          Last page
        </button>
      </section>

      <section className="channex-payload-summary-section">
        <p className="host-integrations-muted">
          These counts apply only to the currently loaded page, not the full requested range.
        </p>
        <PayloadSummaryPanel
          title="Availability payloads"
          groupCount={countPayloadGroups(availabilityPayload)}
          itemCount={countPayloadItems(availabilityPayload)}
          dateWindow={paginationSummary.windowLabel}
        >
          <p className="host-integrations-muted">
            Availability is grouped by external property and room type for the loaded page.
          </p>
        </PayloadSummaryPanel>
        <PayloadSummaryPanel
          title="Rate/restriction payloads"
          groupCount={countPayloadGroups(restrictionRatePayload)}
          itemCount={countPayloadItems(restrictionRatePayload)}
          dateWindow={paginationSummary.windowLabel}
        >
          <p className="host-integrations-muted">
            Rates and supported restrictions are grouped by external property, room type, and rate plan.
          </p>
        </PayloadSummaryPanel>
      </section>

      <PayloadNotesPanel payloadPreview={payloadPreview} omittedRestrictionNames={omittedRestrictionNames} />

      <AvailabilityPayloadTable rows={availabilityRows} />
      <RestrictionPayloadTable rows={restrictionRows} />

      <section className="channex-payload-raw-section">
        <p className="host-integrations-muted">Use raw JSON only for debugging exact API payload structure.</p>
        <details className="channex-diagnostics-collapsible">
          <summary>Availability raw JSON</summary>
          <JsonBlock title="Grouped availability payloads" value={availabilityPayload.groupedPayloads} />
        </details>
        <details className="channex-diagnostics-collapsible">
          <summary>Rate/restriction raw JSON</summary>
          <JsonBlock title="Grouped restriction/rate payloads" value={restrictionRatePayload.groupedPayloads} />
        </details>
        <details className="channex-diagnostics-collapsible">
          <summary>Full response/debug metadata</summary>
          <JsonBlock title="Payload preview response" value={payloadPreview} />
        </details>
      </section>
    </div>
  );
};

PayloadPreviewDetails.propTypes = {
  payloadPreview: PropTypes.object.isRequired,
  omittedRestrictionNames: PropTypes.array.isRequired,
  onLoadPage: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

const ErrorCallout = ({ error, details }) => {
  if (!error && !details) return null;

  return (
    <div className="host-integrations-error-banner channex-diagnostics-error-callout">
      <strong>{details?.message || error}</strong>
      {details?.endpoint || details?.status ? (
        <dl>
          {details.endpoint ? (
            <div>
              <dt>Endpoint</dt>
              <dd>
                {details.method ? `${details.method} ` : ""}
                {details.endpoint}
              </dd>
            </div>
          ) : null}
          {details.status ? (
            <div>
              <dt>HTTP status</dt>
              <dd>{details.status}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {details?.responseBody ? (
        <details>
          <summary>Response body</summary>
          <pre>{stringifyJson(details.responseBody)}</pre>
        </details>
      ) : null}
    </div>
  );
};

ErrorCallout.propTypes = {
  error: PropTypes.string,
  details: PropTypes.shape({
    message: PropTypes.string,
    endpoint: PropTypes.string,
    method: PropTypes.string,
    status: PropTypes.number,
    responseBody: PropTypes.any,
  }),
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
    {state?.error ? <ErrorCallout error={state.error} details={state.errorDetails} /> : null}
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
    errorDetails: PropTypes.object,
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
    description: "Send mapped rates and restrictions for the selected date range in one Channex request.",
    run: syncChannexRestrictions,
    needsDateRange: true,
    confirmMessage: "Run Channex restrictions/rates sync for this property and date range?",
  },
  {
    key: "ari",
    label: "Sync combined ARI",
    description: "Diagnostic two-step sync. Use Full/certification sync for Channex Full Sync submission.",
    run: syncChannexAri,
    needsDateRange: true,
    confirmMessage: "Run combined Channex ARI sync for this property and date range?",
  },
  {
    key: "full",
    label: "Full/certification sync",
    description: "Heavy action: sends one availability request and one rates/restrictions request for the selected range.",
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
  const selectedRangeValidation = useMemo(() => validateSelectedDateRange(dateFrom, dateTo), [dateFrom, dateTo]);
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
    setState({ loading: true, error: "", errorDetails: null, data: null });
    try {
      const data = await request();
      setState({ loading: false, error: "", errorDetails: null, data });
      return data;
    } catch (error) {
      const errorDetails = normalizeChannexError(error);
      setState({
        loading: false,
        error: errorDetails.message,
        errorDetails,
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

  const loadPayloadPreview = (pageDateFrom = dateFrom) =>
    runRequest({
      setState: setPayloadPreviewState,
      request: () =>
        getChannexAriPayloadPreview({
          ...baseParams,
          pageDateFrom,
          pageSizeDays: PAYLOAD_PREVIEW_PAGE_SIZE_DAYS,
        }),
    });

  const updateActionState = useCallback((key, updater) => {
    setActionStates((current) => {
      const previousState = current[key] || {};
      return {
        ...current,
        [key]: typeof updater === "function" ? updater(previousState) : updater,
      };
    });
  }, []);

  const runManualAction = async (config) => {
    if (config.needsDateRange && selectedRangeValidation.message) {
      updateActionState(config.key, {
        loading: false,
        error: selectedRangeValidation.message,
        errorDetails: null,
        data: null,
        success: "",
      });
      return;
    }

    if (config.confirmMessage && typeof globalThis.confirm === "function" && !globalThis.confirm(config.confirmMessage)) {
      return;
    }

    updateActionState(config.key, { loading: true, error: "", errorDetails: null, data: null, success: "" });

    try {
      const data = await config.run(baseParams);
      updateActionState(config.key, {
        loading: false,
        error: "",
        errorDetails: null,
        data,
        success: `${config.label} completed.`,
      });
    } catch (error) {
      const errorDetails = normalizeChannexError(error, `${config.label} failed.`);
      updateActionState(config.key, {
        loading: false,
        error: errorDetails.message,
        errorDetails,
        data: null,
        success: "",
      });
    }
  };

  const runCertificationTestCase = async (testCase) => {
    const key = `certification-case-${testCase.id}`;
    const confirmMessage = `Run Channex certification test #${testCase.id}: ${testCase.title}?`;
    if (typeof globalThis.confirm === "function" && !globalThis.confirm(confirmMessage)) {
      return;
    }

    updateActionState(key, { loading: true, error: "", errorDetails: null, data: null, success: "" });

    try {
      const data = await syncChannexCertificationTestCase({
        userId,
        domitsPropertyId: domitsPropertyId.trim(),
        testCaseId: testCase.id,
      });
      updateActionState(key, {
        loading: false,
        error: "",
        errorDetails: null,
        data,
        success: `Certification test #${testCase.id} completed.`,
      });
    } catch (error) {
      const errorDetails = normalizeChannexError(error, `Certification test #${testCase.id} failed.`);
      updateActionState(key, {
        loading: false,
        error: errorDetails.message,
        errorDetails,
        data: null,
        success: "",
      });
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
    <div className="channex-ari-preview-layout">
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
            onClick={() => loadPayloadPreview(dateFrom)}
          >
            {payloadPreviewState.loading ? "Loading..." : "Load ARI payload preview page"}
          </button>
        }
      >
        {payloadPreviewState.data ? (
          <PayloadPreviewDetails
            payloadPreview={payloadPreview}
            omittedRestrictionNames={omittedRestrictionNames}
            onLoadPage={loadPayloadPreview}
            loading={payloadPreviewState.loading}
          />
        ) : (
          <p className="host-integrations-muted">
            Enter property and date range to preview payloads. Large ranges load in {PAYLOAD_PREVIEW_PAGE_SIZE_DAYS}-day
            pages.
          </p>
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
            These actions contact Channex only after explicit confirmation.
          </p>
        </div>
      </div>
      <div className="channex-diagnostics-action-grid">
        {ACTION_CONFIG.map((config) => {
          const state = actionStates[config.key] || {};
          const disabled = !userId || state.loading || !hasProperty || (config.needsDateRange && !hasDateRange);
          const selectedRangeLabel = formatRangeLabel(dateFrom, dateTo);
          const taskIds = Array.isArray(state.data?.taskIds)
            ? state.data.taskIds
            : Array.isArray(state.data?.results)
              ? state.data.results.map((result) => result?.taskId).filter(Boolean)
              : [];

          return (
            <div className="channex-diagnostics-action-card" key={config.key}>
              <div>
                <h4>{config.label}</h4>
                <p className="host-integrations-muted">{config.description}</p>
                {config.needsDateRange ? (
                  <dl className="channex-action-range-summary">
                    <div>
                      <dt>Selected range</dt>
                      <dd>{selectedRangeLabel}</dd>
                    </div>
                    <div>
                      <dt>Selected days</dt>
                      <dd>{selectedRangeValidation.totalDays || "Not ready"}</dd>
                    </div>
                  </dl>
                ) : null}
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
              {state.error ? <ErrorCallout error={state.error} details={state.errorDetails} /> : null}
              <IdentifierList title="Task IDs" ids={taskIds} />
              {state.data ? <JsonBlock title={`${config.label} response`} value={state.data} /> : null}
            </div>
          );
        })}
      </div>
      <div className="channex-certification-test-section">
        <div className="channex-diagnostics-card-header">
          <div>
            <h3>Change-only certification test cases</h3>
            <p className="host-integrations-muted">
              These actions send only the fields required by Channex certification tests #2 through #10.
            </p>
          </div>
        </div>
        <div className="channex-certification-test-grid">
          {CERTIFICATION_TEST_CASES.map((testCase) => {
            const key = `certification-case-${testCase.id}`;
            const state = actionStates[key] || {};
            const taskIds = Array.isArray(state.data?.taskIds)
              ? state.data.taskIds
              : Array.isArray(state.data?.results)
                ? state.data.results.map((result) => result?.taskId).filter(Boolean)
                : [];

            return (
              <div className="channex-certification-test-card" key={testCase.id}>
                <div>
                  <h4>
                    #{testCase.id} {testCase.title}
                  </h4>
                  <p className="host-integrations-muted">{testCase.payloadType}. Change-only update payload.</p>
                </div>
                <button
                  type="button"
                  className="host-integrations-primary-btn"
                  disabled={!userId || !hasProperty || state.loading}
                  onClick={() => runCertificationTestCase(testCase)}
                >
                  {state.loading ? "Running..." : `Run #${testCase.id}`}
                </button>
                {state.success ? <p className="host-integrations-success-banner">{state.success}</p> : null}
                {state.error ? <ErrorCallout error={state.error} details={state.errorDetails} /> : null}
                <IdentifierList title="Task IDs" ids={taskIds} />
                {state.data ? (
                  <details className="channex-diagnostics-collapsible">
                    <summary>Response details</summary>
                    <JsonBlock title={`Certification test #${testCase.id} response`} value={state.data} />
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
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
