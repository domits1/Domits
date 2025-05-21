class TestBookingRepository {
  constructor() {}

  async getBookingsByPropertyIdAndFromDate(id, date) {
    return bookingsArray;
  }

  async createBooking(propertyId, guests, arrivalDate, departureDate) {
    return {bookingId: 123, stripePaymentId: 123};
  }

  async confirmBooking(bookingId) {
    return {paymentConfirmed: true};
  }
}

export default TestBookingRepository;
