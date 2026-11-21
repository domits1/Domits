import {
  AUTOMATION_TRIGGERS,
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  STAY_TIME_ZONE,
} from "../util/constants.js";

const MINUTE_MS = 60 * 1000;
const UNIT_MS = Object.freeze({ MINUTES: MINUTE_MS, HOURS: 60 * MINUTE_MS });
const DAY_MS = 24 * 60 * MINUTE_MS;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)/;
const SEND_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

const zoneFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STAY_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

const zoneOffsetMs = (instantMs) => {
  const parts = Object.fromEntries(
    zoneFormatter.formatToParts(new Date(instantMs)).map(({ type, value }) => [type, Number(value)])
  );
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - Math.floor(instantMs / 1000) * 1000;
};

const localTimeToInstant = (year, monthIndex, day, hour, minute) => {
  const wallClockAsUtc = Date.UTC(year, monthIndex, day, hour, minute);
  const offsetBefore = zoneOffsetMs(wallClockAsUtc - DAY_MS);
  const offsetAfter = zoneOffsetMs(wallClockAsUtc + DAY_MS);
  const valid = [offsetBefore, offsetAfter]
    .map((offset) => wallClockAsUtc - offset)
    .filter((instant) => zoneOffsetMs(instant) === wallClockAsUtc - instant);
  return valid.length > 0 ? Math.min(...valid) : wallClockAsUtc - offsetBefore;
};

const toClock = (match) => ({ hour: Number(match[1]), minute: Number(match[2]) });

const readClockTime = (value, fallback) => toClock(CLOCK_TIME.exec(String(value ?? "")) ?? CLOCK_TIME.exec(fallback));

const parseSendTime = (sendTime) => {
  const match = SEND_TIME.exec(String(sendTime));
  if (!match) throw new RangeError("Invalid send time");
  return toClock(match);
};

const readStayDate = (value) => {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) throw new RangeError("Booking dates are not valid");
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth(), day: date.getUTCDate() };
};

const resolveAnchor = (triggerType, booking, checkIn) => {
  if (triggerType === AUTOMATION_TRIGGERS.CHECK_IN) {
    return {
      stayDate: readStayDate(booking?.arrivaldate),
      clock: readClockTime(checkIn?.checkInFrom, DEFAULT_CHECK_IN_TIME),
    };
  }
  if (triggerType === AUTOMATION_TRIGGERS.CHECK_OUT) {
    return {
      stayDate: readStayDate(booking?.departuredate),
      clock: readClockTime(checkIn?.checkOutTill, DEFAULT_CHECK_OUT_TIME),
    };
  }
  throw new RangeError("Unsupported stay-date trigger");
};

export const calculateStayScheduledFor = ({
  triggerType,
  offsetAmount,
  offsetUnit,
  offsetDirection,
  sendTime,
  booking,
  checkIn,
  now = Date.now(),
}) => {
  const { stayDate, clock } = resolveAnchor(triggerType, booking, checkIn);
  const amount = Number(offsetAmount ?? 0);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new RangeError("Offset amount must be a whole number of 0 or more");
  }
  const sendClock = sendTime === undefined || sendTime === null ? null : parseSendTime(sendTime);
  if (sendClock && amount > 0 && offsetUnit !== "DAYS") {
    throw new RangeError("A send time needs an offset in days or no offset");
  }
  if (offsetUnit !== "DAYS" && !UNIT_MS[offsetUnit]) throw new RangeError("Unsupported offset unit");

  const sign = offsetDirection === "BEFORE" ? -1 : 1;
  const countsLocalDays = offsetUnit === "DAYS";
  const time = sendClock || clock;
  const atLocalTime = localTimeToInstant(
    stayDate.year,
    stayDate.monthIndex,
    stayDate.day + (countsLocalDays ? sign * amount : 0),
    time.hour,
    time.minute
  );
  const scheduledFor = countsLocalDays || sendClock ? atLocalTime : atLocalTime + sign * amount * UNIT_MS[offsetUnit];

  return { scheduledFor, isPast: scheduledFor <= now };
};
