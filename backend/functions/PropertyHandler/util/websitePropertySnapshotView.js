const PUBLIC_PROPERTY_FIELDS = ["id", "title", "subtitle", "description", "status"];

const PUBLIC_SNAPSHOT_SECTIONS = [
  "amenities",
  "availability",
  "availabilityRestrictions",
  "checkIn",
  "cancellationPolicy",
  "lateCheckin",
  "houseRules",
  "customRules",
  "generalDetails",
  "images",
  "location",
  "pricing",
  "rules",
  "propertyType",
  "technicalDetails",
  "propertyTestStatus",
];

const PUBLIC_CALENDAR_FIELDS = [
  "externalBlockedDates",
  "availableDateKeys",
  "unavailableDateKeys",
  "hasExternalCalendarSync",
  "syncedSourceCount",
  "lastSyncAt",
];

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const pickFields = (source, fields) => {
  const view = {};
  for (const field of fields) {
    if (field in source) {
      view[field] = source[field];
    }
  }
  return view;
};

export const toPublicWebsitePropertySnapshotView = (snapshot) => {
  if (!isObject(snapshot)) {
    return {};
  }

  const view = pickFields(snapshot, PUBLIC_SNAPSHOT_SECTIONS);
  if (isObject(snapshot.property)) {
    view.property = pickFields(snapshot.property, PUBLIC_PROPERTY_FIELDS);
  }
  if (isObject(snapshot.calendarAvailability)) {
    view.calendarAvailability = pickFields(snapshot.calendarAvailability, PUBLIC_CALENDAR_FIELDS);
  }

  return view;
};
