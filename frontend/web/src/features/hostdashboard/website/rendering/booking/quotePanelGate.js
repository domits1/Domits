export const resolveQuotePanelSiteId = ({ quoteContext, model, onSelectTarget = undefined }) => {
  const siteId = String(quoteContext?.siteId || "").trim();
  const isEnabled =
    Boolean(siteId) &&
    model?.visibility?.quotePanel === true &&
    model?.visibility?.availabilityCalendar !== false &&
    !onSelectTarget;
  return isEnabled ? siteId : null;
};
