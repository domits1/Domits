const PUBLIC_PROPERTY_FIELDS = [
  "id",
  "title",
  "subtitle",
  "description",
  "registrationNumber",
  "status",
  "bookingType",
  "createdAt",
  "updatedAt",
];

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
  "calendarAvailability",
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

  return view;
};
