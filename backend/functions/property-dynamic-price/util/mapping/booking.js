export class BookingMapping {

    static mapDatabaseEntryToBooking(bookingEntry) {
        return {
            id: bookingEntry.id.S,
            arrivalDate: bookingEntry.arrivalDate.N,
            departureDate: bookingEntry.departureDate.N,
            createdAt: bookingEntry.createdAt.N,
            guestId: bookingEntry.guestId.S,
            hostId: bookingEntry.hostId.S,
            guests: bookingEntry.guests.N,
            paymentId: bookingEntry.paymentId.S,
            property_id: bookingEntry.property_id.S,
            status: bookingEntry.status.S
        }
    }
}