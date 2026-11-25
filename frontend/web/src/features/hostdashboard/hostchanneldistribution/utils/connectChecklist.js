// What the host confirms before Channex opens, per OTA (design note #3954). These are the
// prerequisites the connect screen cannot check for them: a missing one fails inside the OTA's own
// login, where the host cannot tell why.

const DISCONNECT_ONLY_WITH_SWITCH = "I will disconnect only with the switch on this page";

// Booking.com: the connectivity provider choice is tracked in #3950. The issue number stays out of
// the text, because the host reads these lines.
const OTA_PREREQUISITES = {
  BookingCom: ["I chose Channex as my connectivity provider in the Booking.com extranet"],
  Airbnb: ["I am the owner of the Airbnb account, and no other channel manager is connected to it"],
  Vrbo: ["My Vrbo listing is not linked to another property management system and has no iCal links"],
};

// A new OTA gets only the shared line until its own prerequisites are written, so the host is never
// let through without confirming how to disconnect.
export function describeConnectChecklist(otaCode) {
  return [...(OTA_PREREQUISITES[otaCode] ?? []), DISCONNECT_ONLY_WITH_SWITCH];
}
