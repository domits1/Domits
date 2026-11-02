export const screeningInput = (bookingId = "booking-1") => ({
  booking: {
    id: bookingId,
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Doe",
    guest_email: "john@example.com",
  },
  property: { id: "property-1", title: "Villa Zon" },
  location: { street: "Kinderhuissingel", housenumber: 6, city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  host: { name: "Host BV", email: "host@example.com" },
  protection: { extendedAmount: 1000 },
});
