import React from "react";
import PropTypes from "prop-types";
import ChannexHealthPanel from "./ChannexHealthPanel";
import ChannexHealthTime from "./ChannexHealthTime";
import { formatStayDate } from "./channexHealthFormat";

export default function ChannexHealthFailures({ failures }) {
  return (
    <ChannexHealthPanel title="Recent failed changes" emptyText="No failed changes." isEmpty={failures.length === 0}>
      {failures.map((failure) => (
        <li key={failure.id}>
          <span>{failure.domitsPropertyId}</span>
          <span>{`${formatStayDate(failure.dateFrom)} – ${formatStayDate(failure.dateTo)}`}</span>
          <span className="host-integrations-muted">{failure.failureReason ?? "No reason recorded"}</span>
          <ChannexHealthTime time={failure.updatedAt} />
        </li>
      ))}
    </ChannexHealthPanel>
  );
}

ChannexHealthFailures.propTypes = {
  failures: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      domitsPropertyId: PropTypes.string,
      dateFrom: PropTypes.number.isRequired,
      dateTo: PropTypes.number.isRequired,
      failureReason: PropTypes.string,
      updatedAt: PropTypes.number,
    })
  ).isRequired,
};
