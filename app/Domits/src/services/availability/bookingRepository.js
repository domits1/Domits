import retrieveAccessToken from '../../features/auth/RetrieveAccessToken';

class BookingRepository {
  constructor() {}

  async getBookingsByPropertyIdAndFromDate(id, date) {
    const response = await fetch(
      `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?property_Id=${id}&readType=departureDate&departureDate=${date}`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch current bookings.');
    }
    if (response.status === 204) {
      return [];
    }
    return await response.json();
  }

  async createBooking(propertyId, guests, arrivalDate, departureDate) {
    const response = await fetch(
      'https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings',
      {
        method: 'POST',
        body: JSON.stringify({
          identifiers: {
            property_Id: propertyId,
          },
          general: {
            guests: guests,
            arrivalDate: arrivalDate,
            departureDate: departureDate,
          },
        }),
        headers: {
          Authorization: await retrieveAccessToken(),
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to create booking.');
    }
    return await response.json();
  }

  async confirmBooking(bookingId) {
    const response = await fetch(
      'https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings',
      {
        method: 'PATCH',
        body: JSON.stringify({
          bookingId: bookingId,
        }),
        headers: {
          Authorization: await retrieveAccessToken(),
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to confirm booking.');
    }
    return await response.json();
  }

  async getBookingsByGuestId(guestId) {
    const response = await fetch(
      `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest&guest_Id=${guestId}`,
      {
        method: 'GET',
        headers: {
          Authorization: await retrieveAccessToken(),
        },
      },
    );
    if (!response.ok) {
      throw new Error('Failed to fetch your bookings, please try again later or contact support.');
    }
    return await response.json();
  }

    async getPaymentByBookingId(bookingId) {
        const response = await fetch(
            `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=getPayment&bookingId=${bookingId}`, {
                headers: {
                    Authorization: await retrieveAccessToken(),
                }
            }
        );
        if (!response.ok) {
            throw new Error('Failed to fetch payment matching your booking.');
        }
        return await response.json();
    }

}

export default BookingRepository;
