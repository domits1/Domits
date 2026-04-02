import currentStayImg from "../../../images/current-stay.png"; 

const mockReservationDetails = {
  id: "12345",
  property: {
    name: "City Loft Amsterdam",
    title: "City Loft Breda",
    location: "Breda, Netherlands",
    address: "Stationsplein 1, Breda, Netherlands",
    image: currentStayImg,
  },
  stay: {
    id: "67890",
    checkIn: "Mon, 12 Oct 2026",
    checkInTime: "15:00",
    checkOut: "Fri, 16 Oct 2026",
    checkOutTime: "11:00",
    guests: 2,
    guestsDetails: "John Doe",
    status: "Confirmed",
  },
  bookedAt: "20 Sep 2026",
  pricing: {
    nightlyRate: 120,
    nights: 4,
    cleaningFee: 40,
  },
  rules: ["No smoking", "No parties"],
  instructions: [
    "Keybox code will be sent on the day of arrival",
    "Keybox is located to the left of the entrance",
    "Enter the code and press the lever",
  ],
};

export default mockReservationDetails;