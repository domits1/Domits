// "15:00:00" -> "15:00". Anything that is not HH:MM:SS (for example "15:00" or "3 PM") is left as it is.
const stripSeconds = (time) =>
  String(time)
    .trim()
    .replace(/^(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?$/, "$1");

// The check-in line of the reservation details. Either end of the window can be missing in the
// property data, so only the parts that exist are shown (never "15:00–undefined"), and a
// window that starts and ends at the same time is shown as that single time.
export function buildCheckInInstructions(checkInWindow) {
  const from = checkInWindow?.from ? stripSeconds(checkInWindow.from) : "";
  const till = checkInWindow?.till ? stripSeconds(checkInWindow.till) : "";

  if (from && till) {
    return [from === till ? `Check-in: ${from}` : `Check-in: ${from}–${till}`];
  }
  if (from) {
    return [`Check-in from ${from}`];
  }
  return [];
}
