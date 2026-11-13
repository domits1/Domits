const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;

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

export const isNotFoundError = (error) => error?.status === STATUS_NOT_FOUND;

export const isConflictError = (error) => error?.status === STATUS_CONFLICT;

const OWNER_NOT_FOUND_LOAD_STATUSES = Object.freeze([STATUS_BAD_REQUEST, STATUS_NOT_FOUND]);
const NOT_RETRYABLE_STATUSES = Object.freeze([STATUS_UNAUTHORIZED, STATUS_FORBIDDEN, ...OWNER_NOT_FOUND_LOAD_STATUSES]);

export const canRetryLoad = (error) => !NOT_RETRYABLE_STATUSES.includes(error?.status);

export const detailLoadErrorText = (error, t) =>
  OWNER_NOT_FOUND_LOAD_STATUSES.includes(error?.status)
    ? t.detail.errorNotFound
    : (accessErrorText(error, t) ?? t.detail.errorGeneric);

const conflictText = (error, t, name) => {
  const hasServerMessage = typeof error.serverMessage === "string" && error.serverMessage !== "";
  return hasServerMessage ? error.serverMessage : fillTemplate(t.detail.archiveBlocked, { name });
};

export const archiveErrorText = (error, t, name) =>
  error?.status === STATUS_CONFLICT ? conflictText(error, t, name) : saveErrorText(error, t);
