const OWNER_API_URL_VARIABLE = "REACT_APP_PROPERTY_OWNERS_API_URL";

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export const getOwnerApiUrl = () => {
  const value = process.env.REACT_APP_PROPERTY_OWNERS_API_URL;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${OWNER_API_URL_VARIABLE} is not set. Add the property-owners API URL to the environment.`);
  }
  const url = value.trim();
  if (!isHttpsUrl(url)) {
    throw new Error(`${OWNER_API_URL_VARIABLE} must be an absolute https URL.`);
  }
  return url;
};
