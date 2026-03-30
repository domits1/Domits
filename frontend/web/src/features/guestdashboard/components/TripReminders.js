import React from "react";
import PropTypes from "prop-types";
import "../../../styles/sass/features/guestdashboard/guestDashboard.scss";

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
  return (
    <div className="card">
      <h2>Trip reminders</h2>

      {reminders.length === 0 ? (
        <p>No active trips yet</p>
      ) : (
        reminders.map((item, i) => (
          <ReminderItem key={i} text={item} />
        ))
      )}
    </div>
  );
}

TripReminders.propTypes = {
  reminders: PropTypes.arrayOf(PropTypes.string),
};

export default TripReminders;