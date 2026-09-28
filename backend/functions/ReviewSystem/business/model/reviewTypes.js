// Supported directions and subjects for review workflows.
// Use these constants to avoid inconsistent review type strings.
export const REVIEW_TYPES = Object.freeze({
  GUEST_TO_PROPERTY: "GUEST_TO_PROPERTY",
  GUEST_TO_HOST: "GUEST_TO_HOST",
  HOST_TO_GUEST: "HOST_TO_GUEST",
  GUEST_TO_EXPERIENCE: "GUEST_TO_EXPERIENCE",
  GUEST_TO_SERVICE: "GUEST_TO_SERVICE",
  GUEST_TO_RESERVATION: "GUEST_TO_RESERVATION",
});

// Defines reviewer identity, visibility, and response behavior for each review type.
// Services use these policies to apply the correct rules consistently.
export const REVIEW_TYPE_POLICIES = Object.freeze({
  [REVIEW_TYPES.GUEST_TO_PROPERTY]: {
    reviewerBookingField: "guestid",
    revieweeBookingField: "hostid",
    visibility: "public",
    allowsHostResponse: true,
    createsGuestRequest: true,
  },
  [REVIEW_TYPES.GUEST_TO_HOST]: {
    reviewerBookingField: "guestid",
    revieweeBookingField: "hostid",
    visibility: "public",
    allowsHostResponse: true,
    createsGuestRequest: false,
  },
  [REVIEW_TYPES.HOST_TO_GUEST]: {
    reviewerBookingField: "hostid",
    revieweeBookingField: "guestid",
    visibility: "private",
    allowsHostResponse: false,
    createsGuestRequest: false,
  },
  [REVIEW_TYPES.GUEST_TO_EXPERIENCE]: {
    reviewerBookingField: "guestid",
    revieweeBookingField: "hostid",
    visibility: "public",
    allowsHostResponse: true,
    createsGuestRequest: false,
  },
  [REVIEW_TYPES.GUEST_TO_SERVICE]: {
    reviewerBookingField: "guestid",
    revieweeBookingField: "hostid",
    visibility: "public",
    allowsHostResponse: true,
    createsGuestRequest: false,
  },
  [REVIEW_TYPES.GUEST_TO_RESERVATION]: {
    reviewerBookingField: "guestid",
    revieweeBookingField: "hostid",
    visibility: "private",
    allowsHostResponse: false,
    createsGuestRequest: false,
  },
});

// Retrieves the policy associated with a review type.
// Returns null when the type is not supported.
export const getReviewTypePolicy = (reviewType) => REVIEW_TYPE_POLICIES[reviewType] || null;

// Checks whether a review type is visible to the public.
// Returns false for unsupported or private review types.
export const isPublicReviewType = (reviewType) => getReviewTypePolicy(reviewType)?.visibility === "public";
