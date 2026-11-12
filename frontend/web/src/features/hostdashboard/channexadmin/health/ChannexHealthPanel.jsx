import React from "react";
import PropTypes from "prop-types";

export default function ChannexHealthPanel({ title, emptyText, isEmpty, children }) {
  const headingId = React.useId();
  return (
    <section className="channex-health-panel host-integrations-card" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      {isEmpty ? <p className="host-integrations-muted">{emptyText}</p> : <ul>{children}</ul>}
    </section>
  );
}

ChannexHealthPanel.propTypes = {
  title: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  isEmpty: PropTypes.bool.isRequired,
  children: PropTypes.node,
};
