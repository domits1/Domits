export const ICAL_EXPORT_BUCKET = "icalender";
export const ICAL_EXPORT_REGION = "eu-north-1";

const normalizeSegment = (value) => String(value || "").trim();

export const buildHostCalendarObjectKey = ({ hostUserId, propertyId }) => {
  const normalizedHostUserId = normalizeSegment(hostUserId);
  const normalizedPropertyId = normalizeSegment(propertyId) || normalizedHostUserId;

  if (!normalizedHostUserId || !normalizedPropertyId) {
    throw new Error("Host user id and property id are required to build an iCal export key.");
  }

  return `hosts/${normalizedHostUserId}/${normalizedPropertyId}.ics`;
};

export const buildHostCalendarObjectUrl = ({
  hostUserId,
  propertyId,
  bucket = ICAL_EXPORT_BUCKET,
  region = ICAL_EXPORT_REGION,
}) => {
  const objectKey = buildHostCalendarObjectKey({ hostUserId, propertyId });
  return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
};
