export const buildChannexPullIssue = (code, message, extra = {}) => ({
  code,
  message,
  ...extra,
});
