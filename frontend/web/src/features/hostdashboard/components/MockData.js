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
      avatar: "https://i.pravatar.cc/40?img=1",
      property: "Beach House Breda",
      address: "Princengracht 123, NL",
      dates: "May 15 –17",
      status: "Checked-in",
    },
    {
      id: 2,
      guest: "Daniel Brown",
      avatar: "https://i.pravatar.cc/40?img=2",
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
    avatar: "https://i.pravatar.cc/40?img=1",
    property: "Beach House Breda",
    dates: "May 15 – 17",
  }
],

departures: [
  {
    id: 2,
    guest: "Stephanie Jir",
    avatar: "https://i.pravatar.cc/40?img=2",
    property: "Breda City",
    dates: "May 15 – 17",
  }
],

  messages: [
    {
      id: 1,
      name: "Sophie Janssen",
      avatar: "https://i.pravatar.cc/40?img=3",
      text: "Thank you for booking!",
      time: "10:32",
    },
    {
      id: 2,
      name: "Daniel Brown",
      avatar: "https://i.pravatar.cc/40?img=4",
      text: "Is parking available?",
      time: "09:10",
    },
  ],
};

export default mockData;