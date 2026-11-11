export const ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE = "DIRECT_BOOKING_WEBSITE_ELITE_SELF_SELECT_ACCOUNT_IDS";
const EVERY_ACCOUNT = "*";

export const isEliteSelfSelectOnFor = (accountId) => {
  if (typeof accountId !== "string" || accountId === "") return false;
  const listed = String(process.env[ELITE_SELF_SELECT_ACCOUNT_IDS_VARIABLE] || "")
    .split(/[\s,;]+/)
    .filter(Boolean);
  return listed.includes(EVERY_ACCOUNT) || listed.includes(accountId);
};
