const amenities = [
  // Accessibility
  { category: "Accessibility", amenity: "Accessible-height bed", id: "63" },
  { category: "Accessibility", amenity: "Accessible-height toilet", id: "64" },
  { category: "Accessibility", amenity: "Wide doorways", id: "62" },
  { category: "Accessibility", amenity: "Step-free access", id: "61" },
  { category: "Accessibility", amenity: "Shower chair", id: "65" },

  // Bathroom
  { category: "Bathroom", amenity: "Shower gel", id: "24" },
  { category: "Bathroom", amenity: "First aid kit", id: "27" },
  { category: "Bathroom", amenity: "Hair dryer", id: "23" },
  { category: "Bathroom", amenity: "Body lotion", id: "26" },
  { category: "Bathroom", amenity: "Conditioner", id: "25" },

  // Bedroom
  { category: "Bedroom", amenity: "Alarm clock", id: "31" },
  { category: "Bedroom", amenity: "Hangers", id: "28" },
  { category: "Bedroom", amenity: "Closet/drawers", id: "30" },
  { category: "Bedroom", amenity: "Iron and ironing board", id: "29" },

  // Convenience
  { category: "Convenience", amenity: "Parking space", id: "59" },
  { category: "Convenience", amenity: "EV charger", id: "60" },
  { category: "Convenience", amenity: "Luggage drop-off allowed", id: "58" },
  { category: "Convenience", amenity: "Keyless entry", id: "55" },
  { category: "Convenience", amenity: "Self-check-in", id: "56" },
  { category: "Convenience", amenity: "Local maps and guides", id: "57" },

  // EcoFriendly
  { category: "EcoFriendly", amenity: "Energy-efficient appliances", id: "75" },
  { category: "EcoFriendly", amenity: "Solar panels", id: "76" },
  { category: "EcoFriendly", amenity: "Composting bin", id: "77" },
  { category: "EcoFriendly", amenity: "Recycling bins", id: "74" },

  // Essentials
  { category: "Essentials", amenity: "Air conditioning", id: "2" },
  { category: "Essentials", amenity: "Toilet paper", id: "8" },
  { category: "Essentials", amenity: "Soap and shampoo", id: "9" },
  { category: "Essentials", amenity: "Wi-Fi", id: "1" },
  { category: "Essentials", amenity: "Bed linens", id: "6" },
  { category: "Essentials", amenity: "Hot water", id: "5" },
  { category: "Essentials", amenity: "TV with cable/satellite", id: "4" },
  { category: "Essentials", amenity: "Extra pillows and blankets", id: "7" },
  { category: "Essentials", amenity: "Heating", id: "3" },

  // ExtraServices
  {
    category: "ExtraServices",
    amenity: "Cleaning service (add service fee manually)",
    id: "66",
  },
  { category: "ExtraServices", amenity: "Private chef", id: "71" },
  { category: "ExtraServices", amenity: "Housekeeping", id: "68" },
  { category: "ExtraServices", amenity: "Airport shuttle", id: "70" },
  { category: "ExtraServices", amenity: "Grocery delivery", id: "69" },
  { category: "ExtraServices", amenity: "Concierge service", id: "67" },
  { category: "ExtraServices", amenity: "Personal trainer", id: "72" },
  { category: "ExtraServices", amenity: "Massage therapist", id: "73" },

  // FamilyFriendly
  { category: "FamilyFriendly", amenity: "Baby safety gates", id: "49" },
  { category: "FamilyFriendly", amenity: "Baby bath", id: "50" },
  {
    category: "FamilyFriendly",
    amenity: "Children’s books and toys",
    id: "48",
  },
  { category: "FamilyFriendly", amenity: "Baby monitor", id: "51" },
  { category: "FamilyFriendly", amenity: "High chair", id: "46" },
  { category: "FamilyFriendly", amenity: "Crib", id: "47" },

  // Kitchen
  { category: "Kitchen", amenity: "Kettle", id: "22" },
  { category: "Kitchen", amenity: "Dishes and silverware", id: "18" },
  { category: "Kitchen", amenity: "Toaster", id: "16" },
  { category: "Kitchen", amenity: "Stove", id: "13" },
  { category: "Kitchen", amenity: "Glasses and mugs", id: "19" },
  { category: "Kitchen", amenity: "Microwave", id: "11" },
  { category: "Kitchen", amenity: "Cutting board and knives", id: "20" },
  { category: "Kitchen", amenity: "Blender", id: "21" },
  { category: "Kitchen", amenity: "Oven", id: "12" },
  { category: "Kitchen", amenity: "Basic cooking essentials", id: "17" },
  { category: "Kitchen", amenity: "Refrigerator", id: "10" },
  { category: "Kitchen", amenity: "Coffee maker", id: "15" },
  { category: "Kitchen", amenity: "Dishwasher", id: "14" },

  // Laundry
  { category: "Laundry", amenity: "Clothes drying rack", id: "54" },
  { category: "Laundry", amenity: "Laundry detergent", id: "53" },
  { category: "Laundry", amenity: "Washer and dryer", id: "52" },

  // LivingArea
  { category: "LivingArea", amenity: "Board games", id: "36" },
  { category: "LivingArea", amenity: "Armchairs", id: "33" },
  { category: "LivingArea", amenity: "Books and magazines", id: "35" },
  { category: "LivingArea", amenity: "Sofa", id: "32" },
  { category: "LivingArea", amenity: "Coffee table", id: "34" },

  // Outdoor
  { category: "Outdoor", amenity: "Outdoor furniture", id: "79" },
  { category: "Outdoor", amenity: "Grill", id: "80" },
  { category: "Outdoor", amenity: "Garden or backyard", id: "84" },
  { category: "Outdoor", amenity: "Pool", id: "82" },
  { category: "Outdoor", amenity: "Fire pit", id: "81" },
  { category: "Outdoor", amenity: "Patio or balcony", id: "78" },
  { category: "Outdoor", amenity: "Hot tub", id: "83" },
  { category: "Outdoor", amenity: "Bicycle", id: "85" },

  // Safety
  { category: "Safety", amenity: "Fire extinguisher", id: "44" },
  { category: "Safety", amenity: "Lock on bedroom door", id: "45" },
  { category: "Safety", amenity: "Smoke detector", id: "42" },
  { category: "Safety", amenity: "Carbon monoxide detector", id: "43" },

  // Technology
  { category: "Technology", amenity: "Universal chargers", id: "40" },
  { category: "Technology", amenity: "Streaming services", id: "38" },
  { category: "Technology", amenity: "Work desk and chair", id: "41" },
  { category: "Technology", amenity: "Bluetooth speaker", id: "39" },
  { category: "Technology", amenity: "Smart TV", id: "37" },
]

export default amenities
