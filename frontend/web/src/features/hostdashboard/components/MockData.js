import image1 from "../../../images/nick.png";
import image2 from "../../../images/co-work.jpg";

const mockData = {
  host: {
    name: "Emma",
  },

  stats: {
    listings: 12,
    reservations: 4,
    revenue: 8420,
    occupancy: 76,
  },

  reservations: [
    {
      id: 1,
      guest: "Sophie Janssen",
      avatar: image1,
      property: "Beach House Breda",
      address: "Princengracht 123, NL",
      dates: "May 15 –17",
      status: "Checked-in",
    },
    {
      id: 2,
      guest: "Daniel Brown",
      avatar: image2,
      property: "Rijhouse 1922",
      address: "Breda City",
      dates: "May 15 – 17",
      status: "Arriving tomorrow",
    },
  ],

  today: {
    checkins: 2,
    checkouts: 1,
    messages: 3,
    tasks: 1,
  },

  arrivals: [
  {
    id: 1,
    guest: "Sophie Janssen",
    avatar: image1,
    property: "Beach House Breda",
    dates: "May 15 – 17",
    status: "Arriving today",
  }
],

departures: [
  {
    id: 2,
    guest: "Stephanie Jir",
    avatar: image2,
    property: "Breda City",
    dates: "May 15 – 17",
  }
],

  messages: [
    {
      id: 1,
      name: "Sophie Janssen",
      avatar: image1,
      text: "Thank you for booking!",
      time: "10:32",
    },
    {
      id: 2,
      name: "Daniel Brown",
      avatar: image2,
      text: "Is parking available?",
      time: "09:10",
    },
  ],
};

export default mockData;