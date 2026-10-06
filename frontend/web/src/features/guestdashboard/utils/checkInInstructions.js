// The check-in line of the reservation details. Either end of the window can be missing in the
// property data, so only the parts that exist are shown (never "15:00–undefined").
export function buildCheckInInstructions(checkInWindow) {
  const from = checkInWindow?.from;
  const till = checkInWindow?.till;

  if (from && till) {
    return [`Check-in: ${from}–${till}`];
  }
  if (from) {
    return [`Check-in from ${from}`];
  }
  return [];
}
