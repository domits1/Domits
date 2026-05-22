import React, { useContext } from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function ReminderItem({ text }) {
  return (
    <div className="reminderItem">
      <span>●</span>
      <p>{text}</p>
    </div>
  );
}

ReminderItem.propTypes = {
  text: PropTypes.string.isRequired,
};

function TripReminders({ reminders = [] }) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  return (
    <div className="card">
      <h2>{t?.stays?.tripReminders || "Trip reminders"}</h2>

      {reminders.length === 0 ? (
        <p>{t?.stays?.noActiveTrips || "No active trips yet"}</p>
      ) : (
        reminders.map((item) => (
          <ReminderItem key={item} text={item} />
        ))
      )}
    </div>
  );
}

TripReminders.propTypes = {
  reminders: PropTypes.arrayOf(PropTypes.string),
};

export default TripReminders;
