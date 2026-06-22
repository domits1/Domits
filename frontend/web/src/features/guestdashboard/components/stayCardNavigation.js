export const resolveStayBookingId = (stay = {}) => stay.bookingId || stay.id || null;

export const buildStayReservationPath = (stay = {}) =>
  `/guestdashboard/reservation/${resolveStayBookingId(stay)}`;

export const buildStayMessageNavigation = (stay = {}) => {
  const bookingId = resolveStayBookingId(stay);
  const messagesPath = bookingId
    ? `/guestdashboard/messages?bookingId=${encodeURIComponent(bookingId)}`
    : "/guestdashboard/messages";

  return {
    bookingId,
    messagesPath,
    state: {
      messageContext: {
        contactId: stay.hostId || null,
        contactName: stay.hostName || "Host",
        contactImage: stay.hostImage || null,
        bookingId,
        propertyId: stay.propertyId || null,
        propertyTitle: stay.name || null,
        accoImage: stay.image || null,
      },
    },
  };
};
