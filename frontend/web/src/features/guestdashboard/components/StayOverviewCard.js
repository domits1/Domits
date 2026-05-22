import React, { useContext } from "react";
import PropTypes from "prop-types";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const buildMetaParts = (stay, t) => {
  const parts = [
    {
      key: "status",
      content: (
        <>
          <span>{t?.stayCard?.status || "Status:"} </span>
          <strong>{stay.status || (t?.stayCard?.confirmed || "Confirmed")}</strong>
        </>
      ),
    },
  ];

  if (stay.total != null) {
    parts.push({
      key: "total",
      content: (
        <>
          {"€"}
          {stay.total}
        </>
      ),
    });
  }

  if (stay.reservationNumber) {
    parts.push({ key: "ref", content: <>{t?.stayCard?.ref || "Ref:"} {stay.reservationNumber}</> });
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
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const metaParts = buildMetaParts(stay, t);

  return (
    <div className={`card ${cardClassName}`.trim()}>
      {onBrowseBookings ? (
        <div className="cardHeader">
          <h2>{title}</h2>
          <button type="button" className="viewAll" onClick={onBrowseBookings}>
            {t?.stays?.viewAll || "View All >"}
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
          {t?.stayCard?.openReservation || "Open reservation"}
        </button>
        <button type="button" onClick={onMessageHost}>
          {t?.stayCard?.messageHost || "Message host"}
        </button>
        <button type="button" disabled title="Coming soon">
          {t?.stayCard?.downloadInvoice || "Download invoice (Coming soon)"}
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
