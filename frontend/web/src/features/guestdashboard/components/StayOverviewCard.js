import React from "react";
import PropTypes from "prop-types";

const buildMetaParts = (stay) => {
  const parts = [
    {
      key: "status",
      content: (
        <>
          <span>Status: </span>
          <strong>{stay.status || "Confirmed"}</strong>
        </>
      ),
    },
  ];

  if (stay.total != null) {
    parts.push({
      key: "total",
      content: (
        <>
          {"\u20AC"}
          {stay.total}
        </>
      ),
    });
  }

  if (stay.reservationNumber) {
    parts.push({ key: "ref", content: <>Ref: {stay.reservationNumber}</> });
  }

  return parts;
};

export const stayShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hostName: PropTypes.string,
  hostImage: PropTypes.string,
  image: PropTypes.string,
  name: PropTypes.string,
  location: PropTypes.string,
  dates: PropTypes.string,
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  reservationNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  status: PropTypes.string,
}).isRequired;

function StayOverviewCard({
  cardClassName = "",
  title,
  stay,
  actionClassName,
  onOpenReservation,
  onMessageHost,
  onBrowseBookings = null,
}) {
  const metaParts = buildMetaParts(stay);

  return (
    <div className={`card ${cardClassName}`.trim()}>
      {onBrowseBookings ? (
        <div className="cardHeader">
          <h2>{title}</h2>
          <button type="button" className="viewAll" onClick={onBrowseBookings}>
            View All &gt;
          </button>
        </div>
      ) : (
        <h2>{title}</h2>
      )}

      <div className="stayInnerCard">
        <img src={stay.image} alt={stay.name} />

        <div className="stayContent">
          <h3 className="stayTitle">{stay.name}</h3>

          <p className="stayLocation">{stay.location}</p>

          <h4 className="stayDates">{stay.dates}</h4>

          <div className="stayDivider" />

          <p className="stayMeta">
            {metaParts.map((part, index) => (
              <React.Fragment key={part.key}>
                {index > 0 ? <span className="metaSeparator">|</span> : null}
                {part.content}
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>

      <div className={actionClassName}>
        <button type="button" onClick={onOpenReservation}>
          Open reservation
        </button>
        <button type="button" onClick={onMessageHost}>
          Message host
        </button>
        <button type="button" disabled title="Coming soon">
          Download invoice (Coming soon)
        </button>
      </div>
    </div>
  );
}

StayOverviewCard.propTypes = {
  cardClassName: PropTypes.string,
  title: PropTypes.string.isRequired,
  stay: stayShape,
  actionClassName: PropTypes.string.isRequired,
  onOpenReservation: PropTypes.func.isRequired,
  onMessageHost: PropTypes.func.isRequired,
  onBrowseBookings: PropTypes.func,
};

export default StayOverviewCard;
