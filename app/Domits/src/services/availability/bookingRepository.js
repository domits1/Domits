class BookingRepository {

  constructor() {
  }

  async getBookingsByPropertyIdAndFromDate(id, date) {
    const response = await fetch(
      `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?property_Id=${id}&readType=arrivalDate&arrivalDate=${date}`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch current bookings.');
    }
    if (response.status === 204) {
      throw 204;
    }
    return await response.json();
  }
}

export default BookingRepository;
