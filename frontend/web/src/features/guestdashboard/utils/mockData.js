import currentStayImg from "../../../images/current-stay.png";
import upcomingStayImg from "../../../images/upcoming-stay.png";
import pastStay1 from "../../../images/past-stay1.png";
import pastStay2 from "../../../images/past-stay2.png";

const mockData = {
  user: {
    name: "Emma",
  },

  stats: {
    current: 1,
    upcoming: 1,
    past: 5,
    messages: 3,
  },

  currentStay: {
  name: "City Loft Amsterdam",
  location: "Amsterdam, Netherlands",
  dates: "Apr 10 - Apr 14, 2026",
  image: currentStayImg,
  reservationNumber: "AMX123",
  total: 450,
},

upcomingStays: [
  {
    id: 1,
    name: "Townhouse Venezuela",
    location: "Caracas, Venezuela",
    dates: "Apr 19 - Apr 28, 2026",
    image: upcomingStayImg,
    reservationNumber: "VEN456",
    total: 720,
  }
],

pastStays: [
  {
    id: 1,
    name: "Nijmegen Resort",
    location: "Nijmegen, Netherlands",
    dates: "June 30 - August 11, 2025",
    image: pastStay1,
    reservationNumber: "NIJ789",
    total: 980,
  },
  {
    id: 2,
    name: "Villa La Gabbia",
    location: "Tuscany, Italy",
    dates: "August 20 - August 24, 2025",
    image: pastStay2,
    reservationNumber: "ITA321",
    total: 640,
  },
],

  reminders: [
    "You are staying at City Loft Amsterdam",
    "Checkout tomorrow at 11:00",
    "Upload guest ID for Cozy Room Amsterdam",
  ],

  messages: [
  {
    id: 1,
    sender: "Stephanie Jin",
    text: "Thank you for booking Emma! When do you think you will arrive?",
    time: "09:37",
  },
  {
    id: 2,
    sender: "Booking confirmed",
    text: "Your stay at City Loft Amsterdam is from Apr 30 - May 4",
    time: "10:00",
  }
],
};

export default mockData;