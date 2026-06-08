import React, { useContext } from "react";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import emptyImg from "../../../images/empty-state.png";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function EmptyState() {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  return (
    <div className="card">
      <h3>{t?.stays?.noUpcomingTrips || "No upcoming trips"}</h3>

      <div className="emptyBox">
        <img src={emptyImg} alt="No trips" />

        <div>
          <p>{t?.stays?.noUpcomingStays || "You have no upcoming stays. Explore destinations."}</p>

          <button type="button" onClick={() => navigate("/home")}>
            {t?.stays?.browseStays || "Browse stays"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmptyState;
