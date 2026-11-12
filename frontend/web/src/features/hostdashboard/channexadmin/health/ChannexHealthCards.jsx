import React from "react";
import PropTypes from "prop-types";
import ChannexHealthTime from "./ChannexHealthTime";

function HealthCard({ title, children }) {
  return (
    <div className="channex-health-card host-integrations-card" role="group" aria-label={title}>
      <p className="host-integrations-muted">{title}</p>
      {children}
    </div>
  );
}

HealthCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default function ChannexHealthCards({ outbox, bookings }) {
  return (
    <div className="channex-health-cards">
      <HealthCard title="Waiting changes">
        <strong>{outbox.pending + outbox.processing}</strong>
      </HealthCard>
      <HealthCard title="Failed in 7 days">
        <strong>{outbox.failedLast7Days}</strong>
        <span>{`${outbox.processedLast7Days} sent`}</span>
      </HealthCard>
      <HealthCard title="Last booking">
        <ChannexHealthTime time={bookings.lastRevisionAt} />
      </HealthCard>
      <HealthCard title="Last poll">
        <ChannexHealthTime time={bookings.lastPollAt} />
        <span>{bookings.lastPollStatus}</span>
      </HealthCard>
    </div>
  );
}

ChannexHealthCards.propTypes = {
  outbox: PropTypes.shape({
    pending: PropTypes.number.isRequired,
    processing: PropTypes.number.isRequired,
    failedLast7Days: PropTypes.number.isRequired,
    processedLast7Days: PropTypes.number.isRequired,
  }).isRequired,
  bookings: PropTypes.shape({
    lastRevisionAt: PropTypes.number,
    lastPollAt: PropTypes.number,
    lastPollStatus: PropTypes.string,
  }).isRequired,
};
