
export function getBookingTimestamp(bookingItem) {
  const numericValue = Number(
    bookingItem?.createdat ??
      bookingItem?.createdAt ??
      bookingItem?.arrivaldate ??
      bookingItem?.arrivalDate
  );

  if (Number.isFinite(numericValue)) {
    const ms =
      String(Math.trunc(numericValue)).length <= 10
        ? numericValue * 1000
        : numericValue;
    return ms;
  }

  const dateString =
    bookingItem?.createdAt ??
    bookingItem?.arrivalDate ??
    bookingItem?.arrival_date;

  const parsedDate = dateString ? new Date(dateString) : null;
  return parsedDate && !isNaN(parsedDate) ? parsedDate.getTime() : 0;
}
