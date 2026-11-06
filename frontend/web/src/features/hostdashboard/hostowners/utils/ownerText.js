const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;

export const hasOwnKey = (object, key) => typeof key === "string" && Object.hasOwn(object, key);

export const labelFor = (labels, value) => (hasOwnKey(labels, value) ? labels[value] : labels.unknown);

export const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (hasOwnKey(values, key) ? String(values[key]) : match));

export const ownerName = (owner) => [owner.first_name, owner.last_name].filter(Boolean).join(" ");

const accessErrorText = (error, t) => {
  if (error?.status === STATUS_UNAUTHORIZED) {
    return t.errorSignedOut;
  }
  if (error?.status === STATUS_FORBIDDEN) {
    return t.errorForbidden;
  }
  return null;
};

export const loadErrorText = (error, t) => accessErrorText(error, t) ?? t.errorGeneric;

export const saveErrorText = (error, t) => {
  const hasServerMessage = typeof error?.serverMessage === "string" && error.serverMessage !== "";
  if (error?.status === STATUS_BAD_REQUEST && hasServerMessage) {
    return error.serverMessage;
  }
  if (error?.status === STATUS_NOT_FOUND) {
    return t.form.errorNotFound;
  }
  return accessErrorText(error, t) ?? t.form.errorGeneric;
};
