const GET_USER_INFO_API =
  "https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo";

const EMPTY_USER_PROFILE = {
  givenName: null,
  userId: null,
  profileImage: null,
  email: null,
  phoneNumber: null,
};

const safeJsonParse = (value) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

const pickFirstFilledValue = (...candidates) => {
  for (const candidate of candidates) {
    const normalizedCandidate = String(candidate || "").trim();
    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return null;
};

const parseCognitoAttributes = (attributesArray) => {
  if (!Array.isArray(attributesArray)) {
    return null;
  }

  return attributesArray.reduce((attributes, attribute) => {
    if (attribute?.Name) {
      attributes[attribute.Name] = attribute.Value;
    }

    return attributes;
  }, {});
};

export const getEmptyUserProfile = (userId = null) => ({
  ...EMPTY_USER_PROFILE,
  userId,
});

export async function fetchUserProfileById(targetUserId) {
  if (!targetUserId) {
    return getEmptyUserProfile(targetUserId);
  }

  try {
    const response = await fetch(GET_USER_INFO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ UserId: targetUserId }),
    });

    if (!response.ok) {
      return getEmptyUserProfile(targetUserId);
    }

    const userData = await response.json();
    const parsedPayload = safeJsonParse(userData?.body) ?? userData?.body ?? userData;
    const firstRecord = Array.isArray(parsedPayload) ? parsedPayload[0] : parsedPayload;
    const attributesArray = firstRecord?.Attributes;
    const attributes = parseCognitoAttributes(attributesArray);

    if (!attributes) {
      return getEmptyUserProfile(targetUserId);
    }

    const resolvedUserId =
      attributes.sub ||
      attributes.userId ||
      attributesArray?.find?.((attribute) => attribute?.Name === "sub")?.Value ||
      targetUserId;

    return {
      givenName: pickFirstFilledValue(attributes.given_name, attributes.name),
      userId: resolvedUserId,
      profileImage: pickFirstFilledValue(
        attributes.picture,
        attributes.profileImage,
        attributes.profile_image,
        attributes.avatar,
        attributes.photo,
        attributes["custom:profileImage"],
        attributes["custom:profile_image"]
      ),
      email: pickFirstFilledValue(attributes.email),
      phoneNumber: pickFirstFilledValue(attributes.phone_number, attributes.phone),
    };
  } catch {
    return getEmptyUserProfile(targetUserId);
  }
}
