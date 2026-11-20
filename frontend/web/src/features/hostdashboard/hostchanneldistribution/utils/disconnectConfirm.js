import { PLATFORMS } from "./distributionStates";

// What the confirm dialog says before an OTA is turned off (design note #3954, D5). Pure, so every
// sentence is table-tested. Domits closes the dates first and then disconnects, so the host is told
// what happens to the listing, to existing bookings and to the dates they must reopen themselves.

// Where the host reopens their dates, per OTA. An OTA without an entry gets the plain name.
const REOPEN_PLACE = {
  BookingCom: "in the Booking.com extranet",
  Airbnb: "in your Airbnb calendar",
  Vrbo: "in your Vrbo calendar",
};

const upcomingBookingsLine = (count, name) => {
  if (!Number.isInteger(count) || count <= 0) return null;
  const noun = count === 1 ? "booking" : "bookings";
  return `You have ${count} upcoming ${noun} from ${name}.`;
};

// Returns { title, lines }. `disconnectedOutsideDomits` is for a channel that is already off on the
// Channex side (a Vrbo password change, or Deactivate inside the Channex screen): there is nothing
// left to close, and the host is told to close their dates themselves.
export function describeDisconnectConfirm({ otaCode, upcomingBookingCount, disconnectedOutsideDomits = false }) {
  const name = PLATFORMS.find((platform) => platform.otaCode === otaCode)?.name ?? otaCode;
  const upcoming = upcomingBookingsLine(upcomingBookingCount, name);
  const turnOnAgain = `You can turn ${name} on again later.`;

  const lines = disconnectedOutsideDomits
    ? [
        `${name} was already disconnected outside Domits. Turning it off clears this.`,
        `Close your dates on ${name} yourself: Domits can no longer close them.`,
        upcoming,
        turnOnAgain,
      ]
    : [
        `${name} will be disconnected. Your listing there will be closed for new bookings. Existing bookings stay valid, but changes to them will not reach Domits.`,
        upcoming,
        `To keep selling on ${name} yourself, reopen your dates ${REOPEN_PLACE[otaCode] ?? `on ${name}`}.`,
        turnOnAgain,
      ];

  return { title: `Turn off ${name}?`, lines: lines.filter(Boolean) };
}
