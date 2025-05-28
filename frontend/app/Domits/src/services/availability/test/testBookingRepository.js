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

  async getBookingsByGuestId(guestId) {
    return {
      Items: [
        {
          paymentId: {
            S: '123',
          },
          latePayment: {
            BOOL: false,
          },
          hostId: {
            S: '123',
          },
          guests: {
            N: '1',
          },
          departureDate: {
            N: '1750982400000',
          },
          status: {
            S: 'Awaiting Payment',
          },
          property_id: {
            S: '123',
          },
          createdAt: {
            N: '1747612800000',
          },
          arrivalDate: {
            N: '1750636800000',
          },
          id: {
            S: '123',
          },
          guestId: {
            S: '123',
          },
        },
      ],
    };
  }

  async getPaymentByBookingId(bookingId) {
    return 'PaymentClientSecret';
  }
}

export default TestBookingRepository;
