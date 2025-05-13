class BookingRepository {

  constructor() {
  }

  async getBookingsByPropertyIdAndFromDate(id, date) {
    const response = await fetch(
      `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?property_Id=${id}&readType=departureDate&departureDate=${date}`,
    );
    if (!response.ok) {
      throw new Error('Failed to fetch current bookings.');
    }
    if (response.status === 204) {
      throw 204;
    }
    return await response.json();
  }

  async createBooking(propertyId, guests, arrivalDate, departureDate) {
    const response = await fetch(
        "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings", {
          method: "POST",
          body: JSON.stringify({
            identifiers: {
              property_Id: propertyId
            },
            general: {
              guests: guests,
              arrivalDate: arrivalDate,
              departureDate: departureDate
            }
          })
        }
    )
  }

}

export default BookingRepository;
