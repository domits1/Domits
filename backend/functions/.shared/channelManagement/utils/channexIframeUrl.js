// URL of Channex's channel screen for one property (design note D1, #506; Channex docs "Channel IFrame").
// headless hides Channex's own navigation; channels limits the screen to the OTAs Domits supports (D6):
// Booking.com (BDC), Airbnb (ABB) and Vrbo (VRB).
const SUPPORTED_CHANNELS = "BDC,ABB,VRB";

export const buildChannexIframeUrl = ({ baseUrl, token, channexPropertyId }) => {
  const url = new URL("/auth/exchange", baseUrl);
  url.searchParams.set("oauth_session_key", token);
  url.searchParams.set("app_mode", "headless");
  url.searchParams.set("redirect_to", "/channels");
  url.searchParams.set("property_id", channexPropertyId);
  url.searchParams.set("channels", SUPPORTED_CHANNELS);
  url.searchParams.set("lng", "en");
  return url.toString();
};
