// The quote panel exists only on the live published surface: the editor and the
// draft preview never pass a quoteContext, and a host must opt in per site.
// It is built around the availability calendar, so it follows that flag too.
export const resolveQuotePanelVisibility = ({ quoteContext, model, onSelectTarget = undefined }) =>
  Boolean(String(quoteContext?.siteId || "").trim()) &&
  model?.visibility?.quotePanel === true &&
  model?.visibility?.availabilityCalendar !== false &&
  !onSelectTarget;
