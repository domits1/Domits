import React from "react";
import PropTypes from "prop-types";
import { basisPointsToPercent } from "../utils/basisPoints";
import { fillTemplate, hasOwnKey, labelFor, ownerName } from "../utils/ownerText";

const statusClassName = (status, statuses) =>
  hasOwnKey(statuses, status) ? `host-owners-status host-owners-status--${status}` : "host-owners-status";

const shareText = (property, t, formatPercent) => {
  const title = property.property_title ?? t.unknownProperty;
  const percent = basisPointsToPercent(property.ownership_basis_points);
  if (percent === null) {
    return fillTemplate(t.unknownShare, { title });
  }
  return fillTemplate(t.propertyShare, { title, percent: formatPercent(percent) });
};

const OwnerProperties = ({ properties, t, formatPercent }) => {
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

const OwnersTable = ({ owners, t, language, labelledBy }) => {
  const percentFormat = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
  const formatPercent = (percent) => percentFormat.format(percent);

  return (
    <table className="host-owners-table" aria-labelledby={labelledBy}>
      <thead>
        <tr>
          <th scope="col">{t.columnName}</th>
          <th scope="col">{t.columnType}</th>
          <th scope="col">{t.columnStatus}</th>
          <th scope="col">{t.columnProperties}</th>
        </tr>
      </thead>
      <tbody>
        {owners.map((owner) => (
          <tr key={owner.id}>
            <th scope="row" className="host-owners-name-cell" data-label={t.columnName}>
              <span className="host-owners-name">{ownerName(owner)}</span>
              {owner.company_name ? <span className="host-owners-company">{owner.company_name}</span> : null}
            </th>
            <td data-label={t.columnType}>{labelFor(t.ownerTypes, owner.owner_type)}</td>
            <td data-label={t.columnStatus}>
              <span className={statusClassName(owner.status, t.statuses)}>{labelFor(t.statuses, owner.status)}</span>
            </td>
            <td data-label={t.columnProperties}>
              <OwnerProperties properties={owner.properties} t={t} formatPercent={formatPercent} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

OwnersTable.propTypes = {
  owners: PropTypes.arrayOf(PropTypes.object).isRequired,
  t: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
  labelledBy: PropTypes.string,
};

export default OwnersTable;
