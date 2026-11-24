const BOOKING_PAID = "BOOKING_PAID";
const CHECK_IN = "CHECK_IN";
const CHECK_OUT = "CHECK_OUT";
const BEFORE = "BEFORE";
const AFTER = "AFTER";
const DAYS = "DAYS";
const ON_CHECK_IN = "ON_CHECK_IN";

export const SCHEDULE_OPTIONS = Object.freeze([
  { value: BOOKING_PAID, label: "Booking paid", triggerType: BOOKING_PAID, offsetDirection: null },
  { value: "BEFORE_CHECK_IN", label: "Before check-in", triggerType: CHECK_IN, offsetDirection: BEFORE },
  { value: ON_CHECK_IN, label: "On check-in day", triggerType: CHECK_IN, offsetDirection: AFTER },
  { value: "AFTER_CHECK_IN", label: "After check-in", triggerType: CHECK_IN, offsetDirection: AFTER },
  { value: "BEFORE_CHECK_OUT", label: "Before check-out", triggerType: CHECK_OUT, offsetDirection: BEFORE },
  { value: "AFTER_CHECK_OUT", label: "After check-out", triggerType: CHECK_OUT, offsetDirection: AFTER },
]);

const UNIT_NAMES = { MINUTES: "minute", HOURS: "hour", DAYS: "day" };

const findOption = (value) => SCHEDULE_OPTIONS.find((option) => option.value === value) || SCHEDULE_OPTIONS[0];

const isStayOption = (value) => findOption(value).triggerType !== BOOKING_PAID;

const toAmount = (value) => Number(value || 0);

export const optionFromRule = (rule) => {
  const triggerType = rule?.triggerType;
  if (triggerType !== CHECK_IN && triggerType !== CHECK_OUT) return BOOKING_PAID;

  if (rule.offsetDirection === BEFORE) return triggerType === CHECK_IN ? "BEFORE_CHECK_IN" : "BEFORE_CHECK_OUT";
  if (triggerType === CHECK_OUT) return "AFTER_CHECK_OUT";
  return toAmount(rule.offsetAmount) === 0 ? ON_CHECK_IN : "AFTER_CHECK_IN";
};

export const ruleFromOption = (value) => {
  const { triggerType, offsetDirection } = findOption(value);
  return { triggerType, offsetDirection };
};

const canPickTimeOfDay = ({ scheduleOption, offsetAmount, offsetUnit }) =>
  isStayOption(scheduleOption) &&
  (scheduleOption === ON_CHECK_IN || toAmount(offsetAmount) === 0 || offsetUnit === DAYS);

export const timeOfDayHint = (form) => {
  if (!isStayOption(form.scheduleOption)) return "Only for check-in and check-out messages.";
  if (!canPickTimeOfDay(form)) return "A time of day works with days, or on the day of check-in or check-out.";
  return "";
};

export const buildSchedulePayload = (form) => {
  const { triggerType, offsetDirection } = ruleFromOption(form.scheduleOption);
  const offsetAmount = form.scheduleOption === ON_CHECK_IN ? 0 : toAmount(form.offsetAmount);
  return {
    triggerType,
    offsetDirection,
    offsetAmount,
    offsetUnit: offsetAmount === 0 ? "MINUTES" : form.offsetUnit,
    sendTime: canPickTimeOfDay(form) && form.sendTime ? form.sendTime : null,
  };
};

const formatCount = (amount, unit) => {
  const name = UNIT_NAMES[unit] || "minute";
  return `${amount} ${name}${amount === 1 ? "" : "s"}`;
};

export const describeSchedule = (form) => {
  const { triggerType, offsetAmount, offsetUnit, sendTime } = buildSchedulePayload(form);
  const count = formatCount(offsetAmount, offsetUnit);

  if (triggerType === BOOKING_PAID) {
    return offsetAmount === 0 ? "As soon as the booking is paid" : `${count} after the booking is paid`;
  }

  const anchor = triggerType === CHECK_IN ? "check-in" : "check-out";
  const clock = sendTime ? `at ${sendTime}` : `at the property's ${anchor} time`;
  if (offsetAmount === 0) return `On the day of ${anchor}, ${clock} (Amsterdam time)`;

  const direction = ruleFromOption(form.scheduleOption).offsetDirection === BEFORE ? "before" : "after";
  const head = `${count} ${direction} ${anchor}`;
  return offsetUnit === DAYS ? `${head}, ${clock} (Amsterdam time)` : head;
};
