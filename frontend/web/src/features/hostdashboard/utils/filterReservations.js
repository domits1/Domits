export default function filterReservations(bookings, searchTerm) {
  if (!Array.isArray(bookings) || bookings.length === 0) return [];
  const q = String(searchTerm || "")
    .trim()
    .toLowerCase();
  if (!q) return bookings;

  return bookings.filter((b) => {
    const values = [
      String(b.property_id || ""),
      String(b.title || ""),
      String(b.city || ""),
      String(b.country || ""),
      String(b.guestname || ""),
      String(b.id || ""),
    ];

    return values.some((v) => v.toLowerCase().includes(q));
  });
}
