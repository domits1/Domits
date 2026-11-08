const VERIFICATION_LABELS = Object.freeze({
  VERIFIED: "Verified",
  VERIFIED_STAY: "Verified stay",
});

export const getGuestInitials = (name) => {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

export const formatPropertyLocation = (review) =>
  [review.property_city, review.property_country].filter(Boolean).join(", ");

export const formatSubmittedAt = (timestamp) => {
  const date = new Date(Number(timestamp));
  if (timestamp == null || Number.isNaN(date.getTime())) return { date: "Unknown date", time: "" };
  return {
    date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
};

export const isVerifiedStatus = (status) => Object.hasOwn(VERIFICATION_LABELS, status);

export const getVerificationLabel = (status) => VERIFICATION_LABELS[status] ?? "Unverified";

export const matchesReviewSearch = (review, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    review.guest_name,
    review.property_title,
    review.booking_id,
    review.title,
    review.property_city,
    review.property_country,
  ].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(needle)
  );
};
