import React, { useMemo } from "react";
import PropTypes from "prop-types";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
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

const buildCalendarCells = (viewMonth, externalBlockedDateKeys, unavailableDateKeys) => {
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
      isExternalBlocked: externalBlockedDateKeys.has(dateKey),
      isUnavailable: unavailableDateKeys.has(dateKey),
      isToday: dateKey === todayDateKey,
    };
  });
};

const getCalendarCellStatus = (cell) => {
  if (cell.isExternalBlocked) {
    return {
      title: "Imported external booking",
      Icon: LinkOutlinedIcon,
      label: "External",
    };
  }

  if (cell.isUnavailable) {
    return {
      title: "Blocked in PMS availability",
      Icon: BlockOutlinedIcon,
      label: "Blocked",
    };
  }

  return null;
};

function CalendarLegendItem({ children }) {
  return <span className={styles.calendarLegendItem}>{children}</span>;
}

CalendarLegendItem.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function AvailabilityCalendarPreview({ availability, interactiveTargetProps = {} }) {
  const externalBlockedDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.externalBlockedDates) ? availability.externalBlockedDates : []),
    [availability]
  );
  const unavailableDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.unavailableDateKeys) ? availability.unavailableDateKeys : []),
    [availability]
  );
  const viewMonth = useMemo(() => new Date(), []);
  const calendarCells = useMemo(
    () => buildCalendarCells(viewMonth, externalBlockedDateKeySet, unavailableDateKeySet),
    [externalBlockedDateKeySet, unavailableDateKeySet, viewMonth]
  );
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
      }).format(viewMonth),
    [viewMonth]
  );
  const { className: interactiveClassName = "", ...rootInteractiveProps } = interactiveTargetProps || {};
  const calendarClassName = `${styles.calendarCard} ${interactiveClassName}`.trim();

  return (
    <section {...rootInteractiveProps} className={calendarClassName}>
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
            {availability.externalBlockedSummary || availability.blockedDateSummary}
          </span>
          {availability.unavailableDateCount > 0 ? (
            <span className={styles.calendarMetaPill}>
              <BlockOutlinedIcon fontSize="inherit" />
              {availability.unavailableDateSummary}
            </span>
          ) : null}
          {availability.lastSyncLabel ? (
            <span className={styles.calendarMetaPill}>Last sync: {availability.lastSyncLabel}</span>
          ) : null}
          {availability.nextBlockedLabel ? (
            <span className={styles.calendarMetaPill}>{availability.nextBlockedLabel}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.calendarLegend}>
        <CalendarLegendItem>
          <span className={`${styles.calendarLegendDot} ${styles.calendarLegendDotToday}`} aria-hidden="true" />
          <span>Today</span>
        </CalendarLegendItem>
        <CalendarLegendItem>
          <span className={`${styles.calendarLegendDot} ${styles.calendarLegendDotBlocked}`} aria-hidden="true" />
          <span>Imported external booking</span>
        </CalendarLegendItem>
        <CalendarLegendItem>
          <span className={`${styles.calendarLegendDot} ${styles.calendarLegendDotUnavailable}`} aria-hidden="true" />
          <span>PMS blocked date</span>
        </CalendarLegendItem>
        <CalendarLegendItem>
          <EventAvailableOutlinedIcon fontSize="inherit" />
          <span>Live quote still validates current availability</span>
        </CalendarLegendItem>
      </div>

      <div className={styles.calendarGridHeader}>
        {WEEKDAY_LABELS.map((weekdayLabel) => (
          <span key={weekdayLabel} className={styles.calendarGridWeekday}>
            {weekdayLabel}
          </span>
        ))}
      </div>

      <div className={styles.calendarGridBody}>
        {calendarCells.map((cell) => {
          const status = getCalendarCellStatus(cell);
          const StatusIcon = status?.Icon;

          return (
            <span
              key={cell.id}
              className={`${styles.calendarCell} ${cell.isCurrentMonth ? styles.calendarCellCurrent : ""} ${
                cell.isExternalBlocked ? styles.calendarCellBlocked : ""
              } ${cell.isUnavailable && !cell.isExternalBlocked ? styles.calendarCellUnavailable : ""} ${
                cell.isUnavailable ? styles.calendarCellBlockedBase : ""
              } ${cell.isToday ? styles.calendarCellToday : ""}`.trim()}
              title={status?.title}
            >
              <span className={styles.calendarCellDay}>{cell.dayOfMonth}</span>
              {status && StatusIcon ? (
                <span className={styles.calendarCellStatus}>
                  <StatusIcon fontSize="inherit" />
                  <span>{status.label}</span>
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

AvailabilityCalendarPreview.propTypes = {
  availability: PropTypes.shape({
    externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    unavailableDateCount: PropTypes.number,
    syncSummary: PropTypes.string,
    externalBlockedSummary: PropTypes.string,
    unavailableDateSummary: PropTypes.string,
    blockedDateSummary: PropTypes.string,
    lastSyncLabel: PropTypes.string,
    nextBlockedLabel: PropTypes.string,
    callout: PropTypes.string,
  }).isRequired,
  interactiveTargetProps: PropTypes.shape({
    className: PropTypes.string,
    role: PropTypes.string,
    tabIndex: PropTypes.number,
    onClick: PropTypes.func,
    onKeyDown: PropTypes.func,
  }),
};
