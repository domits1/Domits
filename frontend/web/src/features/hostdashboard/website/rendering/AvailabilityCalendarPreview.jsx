import React, { useMemo } from "react";
import PropTypes from "prop-types";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import styles from "./AvailabilityCalendarPreview.module.scss";

const WEEKDAY_LABELS = Object.freeze(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);

const padDatePart = (value) => String(value).padStart(2, "0");
const toDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const startOfCalendarGrid = (viewMonth) => {
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const weekdayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - weekdayOffset);
};

const buildCalendarCells = (viewMonth, blockedDateKeys) => {
  const calendarStart = startOfCalendarGrid(viewMonth);
  const todayDateKey = toDateKey(new Date());

  return Array.from({ length: 35 }, (_, index) => {
    const cellDate = new Date(calendarStart);
    cellDate.setDate(calendarStart.getDate() + index);

    const dateKey = toDateKey(cellDate);
    return {
      id: dateKey,
      dayOfMonth: cellDate.getDate(),
      isCurrentMonth: cellDate.getMonth() === viewMonth.getMonth(),
      isBlocked: blockedDateKeys.has(dateKey),
      isToday: dateKey === todayDateKey,
    };
  });
};

export default function AvailabilityCalendarPreview({ availability }) {
  const blockedDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.externalBlockedDates) ? availability.externalBlockedDates : []),
    [availability]
  );
  const viewMonth = useMemo(() => new Date(), []);
  const calendarCells = useMemo(
    () => buildCalendarCells(viewMonth, blockedDateKeySet),
    [blockedDateKeySet, viewMonth]
  );
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(viewMonth),
    [viewMonth]
  );

  return (
    <section className={styles.calendarCard}>
      <div className={styles.calendarHeader}>
        <div className={styles.calendarHeaderCopy}>
          <p className={styles.calendarEyebrow}>Availability snapshot</p>
          <h3>{monthLabel}</h3>
          <p>{availability.callout}</p>
        </div>

        <div className={styles.calendarMeta}>
          <span className={styles.calendarMetaPill}>
            <SyncOutlinedIcon fontSize="inherit" />
            {availability.syncSummary}
          </span>
          <span className={styles.calendarMetaPill}>
            <EventBusyOutlinedIcon fontSize="inherit" />
            {availability.blockedDateSummary}
          </span>
          {availability.lastSyncLabel ? (
            <span className={styles.calendarMetaPill}>Last sync: {availability.lastSyncLabel}</span>
          ) : null}
          {availability.nextBlockedLabel ? (
            <span className={styles.calendarMetaPill}>{availability.nextBlockedLabel}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.calendarLegend}>
        <span className={styles.calendarLegendItem}>
          <span className={`${styles.calendarLegendDot} ${styles.calendarLegendDotToday}`} aria-hidden="true" />
          Today
        </span>
        <span className={styles.calendarLegendItem}>
          <span className={`${styles.calendarLegendDot} ${styles.calendarLegendDotBlocked}`} aria-hidden="true" />
          Imported blocked
        </span>
        <span className={styles.calendarLegendItem}>
          <EventAvailableOutlinedIcon fontSize="inherit" />
          Live quote still validates current availability
        </span>
      </div>

      <div className={styles.calendarGridHeader}>
        {WEEKDAY_LABELS.map((weekdayLabel) => (
          <span key={weekdayLabel} className={styles.calendarGridWeekday}>
            {weekdayLabel}
          </span>
        ))}
      </div>

      <div className={styles.calendarGridBody}>
        {calendarCells.map((cell) => (
          <span
            key={cell.id}
            className={`${styles.calendarCell} ${cell.isCurrentMonth ? styles.calendarCellCurrent : ""} ${
              cell.isBlocked ? styles.calendarCellBlocked : ""
            } ${cell.isToday ? styles.calendarCellToday : ""}`.trim()}
          >
            {cell.dayOfMonth}
          </span>
        ))}
      </div>
    </section>
  );
}

AvailabilityCalendarPreview.propTypes = {
  availability: PropTypes.shape({
    externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    syncSummary: PropTypes.string,
    blockedDateSummary: PropTypes.string,
    lastSyncLabel: PropTypes.string,
    nextBlockedLabel: PropTypes.string,
    callout: PropTypes.string,
  }).isRequired,
};
