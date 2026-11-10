import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { basisPointsToPercent } from "../utils/basisPoints";
import { fillTemplate, hasOwnKey, labelFor, ownerName } from "../utils/ownerText";

export const statusClassName = (status, statuses) =>
  hasOwnKey(statuses, status) ? `host-owners-status host-owners-status--${status}` : "host-owners-status";

const shareText = (property, t, formatPercent) => {
  const title = property.property_title ?? t.unknownProperty;
  const percent = basisPointsToPercent(property.ownership_basis_points);
  if (percent === null) {
    return fillTemplate(t.unknownShare, { title });
  }
  return fillTemplate(t.propertyShare, { title, percent: formatPercent(percent) });
};

export const percentFormatter = (language) => {
  const percentFormat = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  return (percent) => percentFormat.format(percent);
};

export const OwnerProperties = ({ properties, t, formatPercent }) => {
  if (!Array.isArray(properties) || properties.length === 0) {
    return <span className="host-owners-muted">{t.noProperties}</span>;
  }
  return (
    <ul className="host-owners-properties">
      {properties.map((property) => (
        <li key={`${property.property_id}-${property.effective_from}`}>{shareText(property, t, formatPercent)}</li>
      ))}
    </ul>
  );
};

const OwnersTable = ({ owners, t, language, labelledBy, onEdit }) => {
  const formatPercent = percentFormatter(language);

  return (
    <table className="host-owners-table" aria-labelledby={labelledBy}>
      <thead>
        <tr>
          <th scope="col">{t.columnName}</th>
          <th scope="col">{t.columnType}</th>
          <th scope="col">{t.columnStatus}</th>
          <th scope="col">{t.columnProperties}</th>
          <th scope="col">{t.columnActions}</th>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <tr key={owner.id}>
            <th scope="row" className="host-owners-name-cell" data-label={t.columnName}>
              <Link className="host-owners-name" to={encodeURIComponent(owner.id)}>
                {ownerName(owner)}
              </Link>
              {owner.company_name ? <span className="host-owners-company">{owner.company_name}</span> : null}
            </th>
            <td data-label={t.columnType}>{labelFor(t.ownerTypes, owner.owner_type)}</td>
            <td data-label={t.columnStatus}>
              <span className={statusClassName(owner.status, t.statuses)}>{labelFor(t.statuses, owner.status)}</span>
            </td>
            <td data-label={t.columnProperties}>
              <OwnerProperties properties={owner.properties} t={t} formatPercent={formatPercent} />
            </td>
            <td data-label={t.columnActions}>
              <button
                type="button"
                className="host-owners-link-button"
                aria-label={fillTemplate(t.editOwnerLabel, { name: ownerName(owner) })}
                onClick={() => onEdit(owner)}>
                {t.editOwner}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

OwnerProperties.propTypes = {
  properties: PropTypes.arrayOf(PropTypes.object),
  t: PropTypes.object.isRequired,
  formatPercent: PropTypes.func.isRequired,
};

OwnersTable.propTypes = {
  owners: PropTypes.arrayOf(PropTypes.object).isRequired,
  t: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
  labelledBy: PropTypes.string,
  onEdit: PropTypes.func.isRequired,
};

export default OwnersTable;
