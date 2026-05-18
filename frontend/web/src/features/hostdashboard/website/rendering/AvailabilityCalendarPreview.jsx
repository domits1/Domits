import React, { useMemo } from "react";
import PropTypes from "prop-types";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import styles from "./AvailabilityCalendarPreview.module.scss";

const LEGACY_WEEKDAY_LABELS = Object.freeze(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
const PANORAMA_WEEKDAY_LABELS = Object.freeze(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);

const padDatePart = (value) => String(value).padStart(2, "0");
const toDateKey = (date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

const startOfCalendarGrid = (viewMonth, weekStartsOn = 1) => {
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const weekdayOffset =
    weekStartsOn === 0 ? firstDayOfMonth.getDay() : (firstDayOfMonth.getDay() + 6) % 7;
  return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - weekdayOffset);
};

const addMonths = (date, monthOffset) => new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);

const formatMonthLabel = (viewMonth) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(viewMonth);

const buildCalendarCells = (
  viewMonth,
  externalBlockedDateKeys,
  unavailableDateKeys,
  { weekStartsOn = 1 } = {}
) => {
  const calendarStart = startOfCalendarGrid(viewMonth, weekStartsOn);
  const firstDayOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const firstDayOffset =
    weekStartsOn === 0 ? firstDayOfMonth.getDay() : (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const todayDateKey = toDateKey(new Date());

  return Array.from({ length: totalCells }, (_, index) => {
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

const buildPanoramaAvailabilityDescription = (propertyTitle, blockedDateCount) => {
  const normalizedTitle = String(propertyTitle || "").trim() || "This stay";

  if (blockedDateCount > 0) {
    return `${normalizedTitle} already has reserved dates across the next two months. Use the calendar below to spot open nights quickly.`;
  }

  return `${normalizedTitle} is currently open across the next two months. Use the calendar below to plan the stay.`;
};

function CalendarLegendItem({ children }) {
  return <span className={styles.calendarLegendItem}>{children}</span>;
}

CalendarLegendItem.propTypes = {
  children: PropTypes.node.isRequired,
};

function LegacyAvailabilityCalendar({ availability, rootInteractiveProps, interactiveClassName }) {
  const externalBlockedDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.externalBlockedDates) ? availability.externalBlockedDates : []),
    [availability]
  );
  const unavailableDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.unavailableDateKeys) ? availability.unavailableDateKeys : []),
    [availability]
  );
  const viewMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);
  const calendarCells = useMemo(
    () => buildCalendarCells(viewMonth, externalBlockedDateKeySet, unavailableDateKeySet),
    [externalBlockedDateKeySet, unavailableDateKeySet, viewMonth]
  );
  const monthLabel = useMemo(() => formatMonthLabel(viewMonth), [viewMonth]);
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
        {LEGACY_WEEKDAY_LABELS.map((weekdayLabel) => (
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

LegacyAvailabilityCalendar.propTypes = {
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
  rootInteractiveProps: PropTypes.shape({
    role: PropTypes.string,
    tabIndex: PropTypes.number,
    onClick: PropTypes.func,
    onKeyDown: PropTypes.func,
  }),
  interactiveClassName: PropTypes.string.isRequired,
};

function PanoramaAvailabilityCalendar({
  availability,
  propertyTitle = "",
  rootInteractiveProps,
  interactiveClassName,
}) {
  const externalBlockedDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.externalBlockedDates) ? availability.externalBlockedDates : []),
    [availability]
  );
  const unavailableDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.unavailableDateKeys) ? availability.unavailableDateKeys : []),
    [availability]
  );
  const baseMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);
  const blockedDateCount = useMemo(() => {
    const normalizedBlockedDateCount = Number(availability?.blockedDateCount);
    if (Number.isFinite(normalizedBlockedDateCount)) {
      return Math.max(0, normalizedBlockedDateCount);
    }

    return new Set([...externalBlockedDateKeySet, ...unavailableDateKeySet]).size;
  }, [availability?.blockedDateCount, externalBlockedDateKeySet, unavailableDateKeySet]);
  const monthViews = useMemo(
    () =>
      [baseMonth, addMonths(baseMonth, 1)].map((viewMonth) => ({
        id: `${viewMonth.getFullYear()}-${viewMonth.getMonth() + 1}`,
        label: formatMonthLabel(viewMonth),
        cells: buildCalendarCells(viewMonth, externalBlockedDateKeySet, unavailableDateKeySet, {
          weekStartsOn: 0,
        }),
      })),
    [baseMonth, externalBlockedDateKeySet, unavailableDateKeySet]
  );
  const calendarClassName = `${styles.panoramaCalendarCard} ${interactiveClassName}`.trim();
  const description = buildPanoramaAvailabilityDescription(propertyTitle, blockedDateCount);

  return (
    <section {...rootInteractiveProps} className={calendarClassName}>
      <div className={styles.panoramaCalendarIntro}>
        <p className={styles.panoramaCalendarEyebrow}>Availability</p>
        <h3 className={styles.panoramaCalendarTitle}>Plan Your Stay</h3>
        <span className={styles.panoramaCalendarDivider} aria-hidden="true" />
        <p className={styles.panoramaCalendarDescription}>{description}</p>
      </div>

      <div className={styles.panoramaCalendarMonths}>
        {monthViews.map((monthView) => (
          <section key={monthView.id} className={styles.panoramaCalendarMonthCard}>
            <h4 className={styles.panoramaCalendarMonthTitle}>{monthView.label}</h4>

            <div className={styles.panoramaCalendarWeekdays}>
              {PANORAMA_WEEKDAY_LABELS.map((weekdayLabel) => (
                <span key={weekdayLabel} className={styles.panoramaCalendarWeekday}>
                  {weekdayLabel}
                </span>
              ))}
            </div>

            <div className={styles.panoramaCalendarGrid}>
              {monthView.cells.map((cell) => {
                const status = getCalendarCellStatus(cell);
                const isReserved = cell.isExternalBlocked || cell.isUnavailable;
                const isPlaceholder = !cell.isCurrentMonth;
                const calendarCellLabel = isPlaceholder
                  ? undefined
                  : `${monthView.label} ${cell.dayOfMonth}, ${isReserved ? "Reserved" : "Available"}`;

                return (
                  <span
                    key={cell.id}
                    className={`${styles.panoramaCalendarCell} ${
                      isReserved ? styles.panoramaCalendarCellReserved : ""
                    } ${isPlaceholder ? styles.panoramaCalendarCellPlaceholder : ""}`.trim()}
                    title={status?.title}
                    aria-label={calendarCellLabel}
                    aria-hidden={isPlaceholder}
                  >
                    {cell.isCurrentMonth ? (
                      <span className={styles.panoramaCalendarCellDay}>{cell.dayOfMonth}</span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className={styles.panoramaCalendarLegend}>
        <span className={styles.panoramaCalendarLegendItem}>
          <span className={styles.panoramaCalendarLegendSwatch} aria-hidden="true" />
          <span>Available</span>
        </span>
        <span className={styles.panoramaCalendarLegendItem}>
          <span
            className={`${styles.panoramaCalendarLegendSwatch} ${styles.panoramaCalendarLegendSwatchReserved}`}
            aria-hidden="true"
          />
          <span>Reserved</span>
        </span>
      </div>
    </section>
  );
}

PanoramaAvailabilityCalendar.propTypes = {
  availability: PropTypes.shape({
    externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    blockedDateCount: PropTypes.number,
  }).isRequired,
  propertyTitle: PropTypes.string,
  rootInteractiveProps: PropTypes.shape({
    role: PropTypes.string,
    tabIndex: PropTypes.number,
    onClick: PropTypes.func,
    onKeyDown: PropTypes.func,
  }),
  interactiveClassName: PropTypes.string.isRequired,
};

export default function AvailabilityCalendarPreview({
  availability,
  interactiveTargetProps = {},
  variant = "default",
  propertyTitle = "",
}) {
  const { className: interactiveClassName = "", ...rootInteractiveProps } = interactiveTargetProps || {};

  if (variant === "panorama") {
    return (
      <PanoramaAvailabilityCalendar
        availability={availability}
        propertyTitle={propertyTitle}
        rootInteractiveProps={rootInteractiveProps}
        interactiveClassName={interactiveClassName}
      />
    );
  }

  return (
    <LegacyAvailabilityCalendar
      availability={availability}
      rootInteractiveProps={rootInteractiveProps}
      interactiveClassName={interactiveClassName}
    />
  );
}

AvailabilityCalendarPreview.propTypes = {
  availability: PropTypes.shape({
    externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    unavailableDateCount: PropTypes.number,
    blockedDateCount: PropTypes.number,
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
  variant: PropTypes.oneOf(["default", "panorama"]),
  propertyTitle: PropTypes.string,
};
