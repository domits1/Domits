const FORMAT_OPTIONS = { dateStyle: "medium", timeStyle: "short" };

// Formats in the host's selected language. An empty or unusable value gives "", and a language the browser
// cannot format falls back to English instead of throwing.
export const formatDateTime = (value, language, options = {}) => {
  const date = new Date(value);
  if (value === null || value === undefined || Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat(language, { ...FORMAT_OPTIONS, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", { ...FORMAT_OPTIONS, ...options }).format(date);
  }
};
