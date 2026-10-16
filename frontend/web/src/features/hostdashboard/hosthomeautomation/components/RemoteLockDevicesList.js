import React from "react";
import PropTypes from "prop-types";
import {
  UNSUPPORTED_DEVICE_TYPES,
  getDeviceStatusLabelKey,
  getDeviceTypeLabelKey,
} from "../constants/homeAutomationConstants";
import { formatDateTime } from "../utils/formatDateTime";

const NO_VALUE = "—";

// Small screens set display: block on these elements, which drops the table semantics in Safari.
function DevicesTable({ devices, copy, language }) {
  const { columns } = copy;

  return (
    <table className="host-homeauto__table" role="table">
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            {columns.name}
          </th>
          <th scope="col" role="columnheader">
            {columns.type}
          </th>
          <th scope="col" role="columnheader">
            {columns.status}
          </th>
          <th scope="col" role="columnheader">
            {columns.battery}
          </th>
          <th scope="col" role="columnheader">
            {columns.lastSeen}
          </th>
        </tr>
      </thead>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <tbody role="rowgroup">
        {devices.map((device) => {
          const lastSeen = device.lastSeenAt ? formatDateTime(device.lastSeenAt, language) : "";
          return (
            <tr key={device.id} role="row">
              <td data-label={columns.name} role="cell">
                {device.name}
              </td>
              <td data-label={columns.type} role="cell">
                {copy.types[getDeviceTypeLabelKey(device.type)]}
                {UNSUPPORTED_DEVICE_TYPES.includes(device.type) && (
                  <span className="host-homeauto__unsupported">{copy.notSupported}</span>
                )}
              </td>
              <td data-label={columns.status} role="cell">
                {copy.statuses[getDeviceStatusLabelKey(device.status)]}
              </td>
              <td data-label={columns.battery} role="cell">
                {Number.isFinite(device.battery) ? `${device.battery}%` : NO_VALUE}
              </td>
              <td data-label={columns.lastSeen} role="cell">
                {lastSeen || NO_VALUE}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Which of the four states the list is in, so the markup below stays flat.
function DevicesBody({ connected, devices, loading, error, onRetry, copy, language }) {
  if (!connected) return <p className="host-homeauto__message">{copy.notConnected}</p>;
  if (loading) return <output className="host-homeauto__message">{copy.loading}</output>;
  if (error) {
    return (
      <div className="host-homeauto__error" role="alert">
        <p className="host-homeauto__error-text">{copy.loadError}</p>
        <button type="button" className="host-homeauto__retry" onClick={onRetry}>
          {copy.retry}
        </button>
      </div>
    );
  }
  if (devices.length === 0) return <p className="host-homeauto__message">{copy.empty}</p>;
  return <DevicesTable devices={devices} copy={copy} language={language} />;
}

function RemoteLockDevicesList({ connected, devices, loading, error, onRetry, copy, language }) {
  return (
    <section className="host-homeauto__card host-homeauto__devices" aria-label={copy.title}>
      <h2 className="host-homeauto__provider">{copy.title}</h2>
      <DevicesBody
        connected={connected}
        devices={devices}
        loading={loading}
        error={error}
        onRetry={onRetry}
        copy={copy}
        language={language}
      />
    </section>
  );
}

const deviceCopy = PropTypes.shape({
  title: PropTypes.string.isRequired,
  notConnected: PropTypes.string.isRequired,
  empty: PropTypes.string.isRequired,
  loading: PropTypes.string.isRequired,
  loadError: PropTypes.string.isRequired,
  retry: PropTypes.string.isRequired,
  notSupported: PropTypes.string.isRequired,
  columns: PropTypes.objectOf(PropTypes.string).isRequired,
  statuses: PropTypes.objectOf(PropTypes.string).isRequired,
  types: PropTypes.objectOf(PropTypes.string).isRequired,
}).isRequired;

const devicesListPropTypes = {
  connected: PropTypes.bool.isRequired,
  devices: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      status: PropTypes.string,
      battery: PropTypes.number,
      lastSeenAt: PropTypes.number,
    })
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  copy: deviceCopy,
  language: PropTypes.string.isRequired,
};

DevicesTable.propTypes = {
  devices: devicesListPropTypes.devices,
  copy: deviceCopy,
  language: devicesListPropTypes.language,
};
DevicesBody.propTypes = devicesListPropTypes;
RemoteLockDevicesList.propTypes = devicesListPropTypes;

export default RemoteLockDevicesList;
