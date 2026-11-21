import {
  DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
  DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
  DEFAULT_WEBSITE_CONTACT_TITLE,
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  resolveWebsiteContactAvatarMode,
  resolveWebsiteContactSectionCopy,
} from "../../config/websiteContactSectionConfig";

export const buildPanoramaContactContent = (model) => {
  const resolvedContactSectionCopy = resolveWebsiteContactSectionCopy(model.contactSection);
  const contactTitle =
    String(resolvedContactSectionCopy.title || "").trim() || DEFAULT_WEBSITE_CONTACT_SECTION_TITLE;
  const contactCaption =
    String(resolvedContactSectionCopy.caption || "").trim() || DEFAULT_WEBSITE_CONTACT_TITLE;
  const contactDescription =
    String(model.contactSection?.description || "").trim() || DEFAULT_WEBSITE_CONTACT_DESCRIPTION;
  const hostName = String(model.host?.name || "").trim() || "Host";
  const hostInitial = String(model.host?.initial || hostName.charAt(0) || "H")
    .trim()
    .charAt(0)
    .toUpperCase() || "H";
  const avatarMode = resolveWebsiteContactAvatarMode(
    model.contactSection?.avatarMode,
    String(model.contactSection?.avatarImage || "").trim()
      ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
      : WEBSITE_CONTACT_AVATAR_MODE_HOST
  );
  let hostProfileImage = "";
  if (avatarMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM) {
    hostProfileImage = String(model.contactSection?.avatarImage || "").trim();
  } else if (avatarMode === WEBSITE_CONTACT_AVATAR_MODE_HOST) {
    hostProfileImage = String(model.host?.profileImage || "").trim();
  }

  return { contactTitle, contactCaption, contactDescription, hostName, hostInitial, hostProfileImage };
};
