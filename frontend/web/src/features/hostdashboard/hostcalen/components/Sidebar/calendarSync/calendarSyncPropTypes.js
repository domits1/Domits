import PropTypes from "prop-types";

export const stringOrNumberProp = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

export const calendarSourceShape = PropTypes.shape({
  sourceId: stringOrNumberProp,
  id: stringOrNumberProp,
  calendarName: PropTypes.string,
  name: PropTypes.string,
  calendarUrl: PropTypes.string,
  url: PropTypes.string,
  calendarProvider: PropTypes.string,
  provider: PropTypes.string,
  channel: PropTypes.string,
  lastSyncAt: stringOrNumberProp,
});
