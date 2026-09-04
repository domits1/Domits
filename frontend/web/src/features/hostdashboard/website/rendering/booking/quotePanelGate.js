// The quote panel exists only on the live published surface: the editor and the
// draft preview never pass a quoteContext, and a host must opt in per site.
// It is built around the availability calendar, so it follows that flag too.
// Returns the site id to quote against, or null when the panel must not render,
// so callers never dereference quoteContext themselves.
export const resolveQuotePanelSiteId = ({ quoteContext, model, onSelectTarget = undefined }) => {
  const siteId = String(quoteContext?.siteId || "").trim();
  const isEnabled =
    Boolean(siteId) &&
    model?.visibility?.quotePanel === true &&
    model?.visibility?.availabilityCalendar !== false &&
    !onSelectTarget;
  return isEnabled ? siteId : null;
};
