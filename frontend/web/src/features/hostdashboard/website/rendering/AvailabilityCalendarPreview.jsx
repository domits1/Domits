import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import styles from "./AvailabilityCalendarPreview.module.scss";
import {
  getDefaultWebsiteCalendarDescription,
  getDefaultWebsiteCalendarTitle,
  normalizeWebsiteCalendarPanelColorOverride,
} from "../config/websiteCalendarSectionConfig";

const LEGACY_WEEKDAY_LABELS = Object.freeze(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
const PANORAMA_WEEKDAY_LABELS = Object.freeze(["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]);
const MAX_CALENDAR_NAVIGATION_MONTHS = 12;

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

const getCalendarOffsetBounds = (visibleMonthCount) => ({
  minOffset: 0,
  maxOffset: Math.max(0, MAX_CALENDAR_NAVIGATION_MONTHS - Math.max(1, visibleMonthCount)),
});

const interactiveTargetPropType = PropTypes.shape({
  className: PropTypes.string,
  role: PropTypes.string,
  tabIndex: PropTypes.number,
  onClick: PropTypes.func,
  onKeyDown: PropTypes.func,
});

const calendarPanelSettingsPropType = PropTypes.shape({
  showPanel: PropTypes.bool,
  panelColor: PropTypes.string,
});

const calendarSectionPropType = PropTypes.shape({
  title: PropTypes.string,
  description: PropTypes.string,
});

const calendarSectionWithPanelPropType = PropTypes.shape({
  title: PropTypes.string,
  description: PropTypes.string,
  showPanel: PropTypes.bool,
  panelColor: PropTypes.string,
});

const availabilityPropType = PropTypes.shape({
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
});

const splitInteractiveTargetProps = (interactiveTargetProps = {}) => {
  const { className = "", ...targetProps } = interactiveTargetProps;
  return {
    className,
    targetProps,
  };
};

const useAvailabilityDateKeySets = (availability) => {
  const externalBlockedDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.externalBlockedDates) ? availability.externalBlockedDates : []),
    [availability]
  );
  const unavailableDateKeySet = useMemo(
    () => new Set(Array.isArray(availability?.unavailableDateKeys) ? availability.unavailableDateKeys : []),
    [availability]
  );

  return {
    externalBlockedDateKeySet,
    unavailableDateKeySet,
  };
};

const resolveCalendarCopy = ({
  calendarSection,
  templateKey = "",
  propertyTitle = "",
  blockedDateCount = 0,
  availabilityCallout = "",
}) => ({
  title: String(calendarSection?.title || "").trim() || getDefaultWebsiteCalendarTitle(templateKey),
  description:
    String(calendarSection?.description || "").trim() ||
    getDefaultWebsiteCalendarDescription({
      templateKey,
      propertyTitle,
      blockedDateCount,
      availabilityCallout,
    }),
});

function CalendarMonthNavigation({
  labels,
  canGoPrevious,
  canGoNext,
  onGoPrevious,
  onGoNext,
  className,
  labelsClassName,
  labelClassName,
  buttonClassName,
}) {
  const handleNavigationClick = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  return (
    <div className={className}>
      <button
        type="button"
        className={buttonClassName}
        onClick={handleNavigationClick(onGoPrevious)}
        disabled={!canGoPrevious}
        aria-label="Show previous months"
      >
        <ChevronLeftRoundedIcon fontSize="inherit" />
      </button>

      <div className={labelsClassName}>
        {labels.map((label) => (
          <h4 key={label} className={labelClassName}>
            {label}
          </h4>
        ))}
      </div>

      <button
        type="button"
        className={buttonClassName}
        onClick={handleNavigationClick(onGoNext)}
        disabled={!canGoNext}
        aria-label="Show next months"
      >
        <ChevronRightRoundedIcon fontSize="inherit" />
      </button>
    </div>
  );
}

CalendarMonthNavigation.propTypes = {
  labels: PropTypes.arrayOf(PropTypes.string).isRequired,
  canGoPrevious: PropTypes.bool.isRequired,
  canGoNext: PropTypes.bool.isRequired,
  onGoPrevious: PropTypes.func.isRequired,
  onGoNext: PropTypes.func.isRequired,
  className: PropTypes.string.isRequired,
  labelsClassName: PropTypes.string.isRequired,
  labelClassName: PropTypes.string.isRequired,
  buttonClassName: PropTypes.string.isRequired,
};

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
      title: "Blocked or booked in PMS availability",
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

function LegacyAvailabilityCalendar({
  availability,
  calendarSection,
  rootInteractiveProps,
  interactiveClassName,
  panelSettings,
  templateKey = "",
  titleInteractiveTargetProps = {},
  descriptionInteractiveTargetProps = {},
}) {
  const { externalBlockedDateKeySet, unavailableDateKeySet } = useAvailabilityDateKeySets(availability);
  const baseMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);
  const [{ minOffset, maxOffset }] = useState(() => getCalendarOffsetBounds(1));
  const [monthOffset, setMonthOffset] = useState(0);
  const viewMonth = useMemo(() => addMonths(baseMonth, monthOffset), [baseMonth, monthOffset]);
  const calendarCells = useMemo(
    () => buildCalendarCells(viewMonth, externalBlockedDateKeySet, unavailableDateKeySet),
    [externalBlockedDateKeySet, unavailableDateKeySet, viewMonth]
  );
  const monthLabel = useMemo(() => formatMonthLabel(viewMonth), [viewMonth]);
  const showPanel = panelSettings?.showPanel !== false;
  const resolvedPanelColor = normalizeWebsiteCalendarPanelColorOverride(panelSettings?.panelColor);
  const { title, description } = resolveCalendarCopy({
    calendarSection,
    templateKey,
    availabilityCallout: availability?.callout,
  });
  const { className: legacyTitleTargetClassName, targetProps: legacyTitleTargetProps } =
    splitInteractiveTargetProps(titleInteractiveTargetProps);
  const { className: legacyDescriptionTargetClassName, targetProps: legacyDescriptionTargetProps } =
    splitInteractiveTargetProps(descriptionInteractiveTargetProps);
  const calendarClassName = `${styles.calendarCard} ${
    showPanel ? "" : styles.calendarCardPanelOff
  } ${interactiveClassName}`.trim();

  return (
    <section
      {...rootInteractiveProps}
      className={calendarClassName}
      style={showPanel && resolvedPanelColor ? { backgroundColor: resolvedPanelColor } : undefined}
    >
      <div className={styles.calendarHeader}>
        <div className={styles.calendarHeaderCopy}>
          <p
            className={`${styles.calendarEyebrow} ${legacyTitleTargetClassName}`.trim()}
            {...legacyTitleTargetProps}
          >
            {title}
          </p>
          <CalendarMonthNavigation
            labels={[monthLabel]}
            canGoPrevious={monthOffset > minOffset}
            canGoNext={monthOffset < maxOffset}
            onGoPrevious={() => setMonthOffset((currentOffset) => Math.max(minOffset, currentOffset - 1))}
            onGoNext={() => setMonthOffset((currentOffset) => Math.min(maxOffset, currentOffset + 1))}
            className={styles.calendarMonthNavigation}
            labelsClassName={styles.calendarMonthNavigationLabels}
            labelClassName={styles.calendarMonthNavigationLabel}
            buttonClassName={styles.calendarMonthNavigationButton}
          />
          <p
            className={`${styles.calendarSectionDescription} ${
              legacyDescriptionTargetClassName
            }`.trim()}
            {...legacyDescriptionTargetProps}
          >
            {description}
          </p>
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
          <span>PMS blocked or booked date</span>
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
  availability: availabilityPropType.isRequired,
  rootInteractiveProps: interactiveTargetPropType,
  interactiveClassName: PropTypes.string.isRequired,
  panelSettings: calendarPanelSettingsPropType,
  calendarSection: calendarSectionPropType,
  templateKey: PropTypes.string,
  titleInteractiveTargetProps: interactiveTargetPropType,
  descriptionInteractiveTargetProps: interactiveTargetPropType,
};

function PanoramaAvailabilityCalendar({
  availability,
  calendarSection,
  propertyTitle = "",
  rootInteractiveProps,
  interactiveClassName,
  panelSettings,
  templateKey = "",
  titleInteractiveTargetProps = {},
  descriptionInteractiveTargetProps = {},
}) {
  const { externalBlockedDateKeySet, unavailableDateKeySet } = useAvailabilityDateKeySets(availability);
  const baseMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, []);
  const [{ minOffset, maxOffset }] = useState(() => getCalendarOffsetBounds(2));
  const [monthOffset, setMonthOffset] = useState(0);
  const blockedDateCount = useMemo(() => {
    const normalizedBlockedDateCount = Number(availability?.blockedDateCount);
    if (Number.isFinite(normalizedBlockedDateCount)) {
      return Math.max(0, normalizedBlockedDateCount);
    }

    return new Set([...externalBlockedDateKeySet, ...unavailableDateKeySet]).size;
  }, [availability?.blockedDateCount, externalBlockedDateKeySet, unavailableDateKeySet]);
  const monthViews = useMemo(
    () =>
      [addMonths(baseMonth, monthOffset), addMonths(baseMonth, monthOffset + 1)].map((viewMonth) => ({
        id: `${viewMonth.getFullYear()}-${viewMonth.getMonth() + 1}`,
        label: formatMonthLabel(viewMonth),
        cells: buildCalendarCells(viewMonth, externalBlockedDateKeySet, unavailableDateKeySet, {
          weekStartsOn: 0,
        }),
      })),
    [baseMonth, externalBlockedDateKeySet, monthOffset, unavailableDateKeySet]
  );
  const showPanel = panelSettings?.showPanel !== false;
  const resolvedPanelColor = normalizeWebsiteCalendarPanelColorOverride(panelSettings?.panelColor);
  const { title, description } = resolveCalendarCopy({
    calendarSection,
    templateKey,
    propertyTitle,
    blockedDateCount,
    availabilityCallout: availability?.callout,
  });
  const { className: panoramaTitleTargetClassName, targetProps: panoramaTitleTargetProps } =
    splitInteractiveTargetProps(titleInteractiveTargetProps);
  const { className: panoramaDescriptionTargetClassName, targetProps: panoramaDescriptionTargetProps } =
    splitInteractiveTargetProps(descriptionInteractiveTargetProps);
  const calendarClassName = `${styles.panoramaCalendarCard} ${
    showPanel ? "" : styles.panoramaCalendarCardPanelOff
  } ${interactiveClassName}`.trim();

  return (
    <section
      {...rootInteractiveProps}
      className={calendarClassName}
      style={showPanel && resolvedPanelColor ? { backgroundColor: resolvedPanelColor } : undefined}
    >
      <div className={styles.panoramaCalendarIntro}>
        <p
          className={`${styles.panoramaCalendarEyebrow} ${panoramaTitleTargetClassName}`.trim()}
          {...panoramaTitleTargetProps}
        >
          {title}
        </p>
        <span className={styles.panoramaCalendarDivider} aria-hidden="true" />
        <p
          className={`${styles.panoramaCalendarDescription} ${
            panoramaDescriptionTargetClassName
          }`.trim()}
          {...panoramaDescriptionTargetProps}
        >
          {description}
        </p>
      </div>

      <CalendarMonthNavigation
        labels={monthViews.map((monthView) => monthView.label)}
        canGoPrevious={monthOffset > minOffset}
        canGoNext={monthOffset < maxOffset}
        onGoPrevious={() => setMonthOffset((currentOffset) => Math.max(minOffset, currentOffset - 1))}
        onGoNext={() => setMonthOffset((currentOffset) => Math.min(maxOffset, currentOffset + 1))}
        className={styles.panoramaCalendarMonthNavigation}
        labelsClassName={styles.panoramaCalendarMonthNavigationLabels}
        labelClassName={styles.panoramaCalendarMonthNavigationLabel}
        buttonClassName={styles.panoramaCalendarMonthNavigationButton}
      />

      <div className={styles.panoramaCalendarMonths}>
        {monthViews.map((monthView) => (
          <section key={monthView.id} className={styles.panoramaCalendarMonthCard}>
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
                const availabilityLabel = isReserved ? "Reserved" : "Available";
                const calendarCellLabel = isPlaceholder
                  ? undefined
                  : `${monthView.label} ${cell.dayOfMonth}, ${availabilityLabel}`;

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
  availability: availabilityPropType.isRequired,
  propertyTitle: PropTypes.string,
  rootInteractiveProps: interactiveTargetPropType,
  interactiveClassName: PropTypes.string.isRequired,
  panelSettings: calendarPanelSettingsPropType,
  calendarSection: calendarSectionPropType,
  templateKey: PropTypes.string,
  titleInteractiveTargetProps: interactiveTargetPropType,
  descriptionInteractiveTargetProps: interactiveTargetPropType,
};

export default function AvailabilityCalendarPreview({
  availability,
  calendarSection = undefined,
  descriptionInteractiveTargetProps = {},
  interactiveTargetProps = {},
  titleInteractiveTargetProps = {},
  variant = "default",
  propertyTitle = "",
  templateKey = "",
}) {
  const { className: interactiveClassName = "", ...rootInteractiveProps } = interactiveTargetProps || {};

  if (variant === "panorama") {
    return (
      <PanoramaAvailabilityCalendar
        availability={availability}
        calendarSection={calendarSection}
        descriptionInteractiveTargetProps={descriptionInteractiveTargetProps}
        panelSettings={calendarSection}
        propertyTitle={propertyTitle}
        rootInteractiveProps={rootInteractiveProps}
        interactiveClassName={interactiveClassName}
        templateKey={templateKey}
        titleInteractiveTargetProps={titleInteractiveTargetProps}
      />
    );
  }

  return (
    <LegacyAvailabilityCalendar
      availability={availability}
      calendarSection={calendarSection}
      descriptionInteractiveTargetProps={descriptionInteractiveTargetProps}
      panelSettings={calendarSection}
      rootInteractiveProps={rootInteractiveProps}
      interactiveClassName={interactiveClassName}
      templateKey={templateKey}
      titleInteractiveTargetProps={titleInteractiveTargetProps}
    />
  );
}

AvailabilityCalendarPreview.propTypes = {
  availability: availabilityPropType.isRequired,
  calendarSection: calendarSectionWithPanelPropType,
  descriptionInteractiveTargetProps: interactiveTargetPropType,
  interactiveTargetProps: interactiveTargetPropType,
  titleInteractiveTargetProps: interactiveTargetPropType,
  variant: PropTypes.oneOf(["default", "panorama"]),
  propertyTitle: PropTypes.string,
  templateKey: PropTypes.string,
};
