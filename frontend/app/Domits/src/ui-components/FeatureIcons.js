import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import React from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

/**
 * Amenities icons for accommodations
 */

const DEFAULT_COLOR = "green";
const DEFAULT_SIZE = 24;
const amenities = [
    // Accessibility
    {category: "Accessibility", amenity: "Step-free access", id: "1", icon: <FontAwesome name="wheelchair" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Accessibility", amenity: "Wide doorways", id: "2", icon: <MaterialCommunityIcons name="door" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Accessibility", amenity: "Accessible-height bed", id: "3", icon: <FontAwesome name="wheelchair" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Accessibility", amenity: "Accessible-height toilet", id: "4", icon: <MaterialCommunityIcons name="toilet" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Accessibility", amenity: "Shower chair", id: "5", icon: <MaterialCommunityIcons name="shower" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Bathroom
    {category: "Bathroom", amenity: "Bathrooms", id: "6", icon: <MaterialCommunityIcons name="bathtub" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Towels", id: "7", icon: <FontAwesome name="bath" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Hair dryer", id: "8", icon: <MaterialCommunityIcons name="hair-dryer" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Shower gel", id: "9", icon: <MaterialCommunityIcons name="shower" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Conditioner", id: "10", icon: <MaterialCommunityIcons name="spray-bottle" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Body lotion", id: "11", icon: <MaterialCommunityIcons name="bottle-soda-classic-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "First aid kit", id: "12", icon: <MaterialCommunityIcons name="medical-bag" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bathroom", amenity: "Toilet paper", id: "13", icon: <MaterialCommunityIcons name="paper-roll-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Bedroom
    {category: "Bedroom", amenity: "Bedrooms", id: "14", icon: <MaterialIcons name="bedroom-parent" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Beds", id: "15", icon: <MaterialCommunityIcons name="bed" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Single bed", id: "16", icon: <MaterialCommunityIcons name="bed-queen" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "King bed", id: "17", icon: <MaterialCommunityIcons name="bed-king" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Bed linens", id: "18", icon: <Ionicons name="bed-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Extra pillows and blankets", id: "19", icon: <Ionicons name="bed-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Hangers", id: "20", icon: <MaterialCommunityIcons name="hanger" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Iron and ironing board", id: "21", icon: <MaterialCommunityIcons name="iron" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Closet/drawers", id: "22", icon: <Ionicons name="folder-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Bedroom", amenity: "Alarm clock", id: "23", icon: <Ionicons name="alarm-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Convenience
    {category: "Convenience", amenity: "Keyless entry", id: "24", icon: <Ionicons name="key-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Convenience", amenity: "Self-check-in", id: "25", icon: <Ionicons name="checkmark-circle-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Convenience", amenity: "Local maps and guides", id: "26", icon: <Ionicons name="map-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Convenience", amenity: "Luggage drop-off allowed", id: "27", icon: <MaterialCommunityIcons name="bag-suitcase" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Convenience", amenity: "Parking space", id: "28", icon: <MaterialCommunityIcons name="parking" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Convenience", amenity: "EV charger", id: "29", icon: <MaterialCommunityIcons name="car-electric" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // EcoFriendly
    {category: "EcoFriendly", amenity: "Recycling bins", id: "30", icon: <MaterialCommunityIcons name="recycle" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "EcoFriendly", amenity: "Energy-efficient appliances", id: "31", icon: <Ionicons name="battery-charging" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "EcoFriendly", amenity: "Solar panels", id: "32", icon: <MaterialCommunityIcons name="solar-power" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "EcoFriendly", amenity: "Composting bin", id: "33", icon: <MaterialCommunityIcons name="recycle" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Essentials
    {category: "Essentials", amenity: "Wi-Fi", id: "34", icon: <Ionicons name="wifi" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Essentials", amenity: "Air conditioning", id: "35", icon: <MaterialCommunityIcons name="air-conditioner" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Essentials", amenity: "Heating", id: "36", icon: <MaterialCommunityIcons name="fire" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Essentials", amenity: "TV with cable/satellite", id: "37", icon: <Ionicons name="tv-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Essentials", amenity: "Hot water", id: "38", icon: <MaterialCommunityIcons name="water-boiler" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Essentials", amenity: "Soap and shampoo", id: "39", icon: <MaterialCommunityIcons name="bottle-soda-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // ExtraServices
    {category: "ExtraServices", amenity: "Cleaning service", id: "40", icon: <MaterialCommunityIcons name="broom" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Personal trainer", id: "41", icon: <MaterialCommunityIcons name="dumbbell" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Private chef", id: "42", icon: <MaterialCommunityIcons name="chef-hat" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Grocery delivery", id: "43", icon: <MaterialCommunityIcons name="shopping" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Concierge service", id: "44", icon: <MaterialCommunityIcons name="broom" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Airport shuttle", id: "45", icon: <MaterialCommunityIcons name="bus" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Massage therapist", id: "46", icon: <MaterialCommunityIcons name="account-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "ExtraServices", amenity: "Housekeeping", id: "47", icon: <MaterialCommunityIcons name="broom" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // FamilyFriendly
    {category: "FamilyFriendly", amenity: "High chair", id: "48", icon: <MaterialCommunityIcons name="chair-rolling" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Crib", id: "49", icon: <MaterialCommunityIcons name="cradle-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Children's books and toys", id: "50", icon: <FontAwesome5 name="baby" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Baby safety gates", id: "51", icon: <MaterialCommunityIcons name="gate" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Baby bath", id: "52", icon: <MaterialCommunityIcons name="bathtub-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Baby monitor", id: "53", icon: <Ionicons name="tv-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "FamilyFriendly", amenity: "Baby seat", id: "54", icon: <MaterialCommunityIcons name="baby-carriage" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Kitchen
    {category: "Kitchen", amenity: "Refrigerator", id: "55", icon: <MaterialCommunityIcons name="fridge-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Microwave", id: "56", icon: <MaterialCommunityIcons name="microwave" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Oven", id: "57", icon: <MaterialCommunityIcons name="stove" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Stove", id: "58", icon: <MaterialCommunityIcons name="fire" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Dishwasher", id: "59", icon: <MaterialCommunityIcons name="dishwasher" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Coffee maker", id: "60", icon: <MaterialCommunityIcons name="coffee-maker" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Toaster", id: "61", icon: <MaterialCommunityIcons name="toaster" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Basic cooking essentials", id: "62", icon: <MaterialCommunityIcons name="food" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Dishes and silverware", id: "63", icon: <MaterialCommunityIcons name="silverware-fork-knife" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Glasses and mugs", id: "64", icon: <MaterialCommunityIcons name="glass-cocktail" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Cutting board and knives", id: "65", icon: <MaterialCommunityIcons name="knife" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Blender", id: "66", icon: <MaterialCommunityIcons name="blender" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Kitchen", amenity: "Kettle", id: "67", icon: <MaterialCommunityIcons name="kettle-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Laundry
    {category: "Laundry", amenity: "Washer and dryer", id: "68", icon: <MaterialCommunityIcons name="washing-machine" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Laundry", amenity: "Laundry detergent", id: "69", icon: <MaterialCommunityIcons name="bottle-soda-classic-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Laundry", amenity: "Clothes drying rack", id: "70", icon: <FontAwesome name="sun-o" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // LivingArea
    {category: "LivingArea", amenity: "Sofa", id: "71", icon: <MaterialCommunityIcons name="sofa" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "LivingArea", amenity: "Armchairs", id: "72", icon: <MaterialCommunityIcons name="seat-recline-normal" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "LivingArea", amenity: "Coffee table", id: "73", icon: <MaterialCommunityIcons name="table-furniture" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "LivingArea", amenity: "Books and magazines", id: "74", icon: <MaterialCommunityIcons name="book-open-variant" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "LivingArea", amenity: "Board games", id: "75", icon: <MaterialCommunityIcons name="chess-king" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Marine
    {category: "Marine", amenity: "Bimini", id: "76", icon: <MaterialCommunityIcons name="umbrella" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "External table", id: "77", icon: <MaterialCommunityIcons name="table" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "External speakers", id: "78", icon: <MaterialCommunityIcons name="speaker" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Teak deck", id: "79", icon: <MaterialCommunityIcons name="texture-box" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Bow sundeck", id: "80", icon: <MaterialCommunityIcons name="weather-sunny" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Aft sundeck", id: "81", icon: <MaterialCommunityIcons name="weather-sunny" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Bathing Platform", id: "82", icon: <MaterialCommunityIcons name="beach" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Bathing ladder", id: "83", icon: <MaterialCommunityIcons name="ladder" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Bow thruster", id: "84", icon: <MaterialCommunityIcons name="anchor" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Electric windlass", id: "85", icon: <MaterialCommunityIcons name="anchor" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Autopilot", id: "86", icon: <MaterialCommunityIcons name="steering" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "GPS", id: "87", icon: <MaterialCommunityIcons name="satellite-uplink" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Depth sounder", id: "88", icon: <MaterialCommunityIcons name="water" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "VHF", id: "89", icon: <MaterialCommunityIcons name="radio" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Marine", amenity: "Guides & Maps", id: "90", icon: <MaterialCommunityIcons name="map-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Outdoor
    {category: "Outdoor", amenity: "Patio or balcony", id: "91", icon: <MaterialCommunityIcons name="balcony" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Outdoor furniture", id: "92", icon: <MaterialCommunityIcons name="sofa-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Grill", id: "93", icon: <MaterialCommunityIcons name="grill" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Fire pit", id: "94", icon: <MaterialCommunityIcons name="fire" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Pool", id: "95", icon: <MaterialCommunityIcons name="pool" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Hot tub", id: "96", icon: <MaterialCommunityIcons name="hot-tub" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Garden or backyard", id: "97", icon: <MaterialCommunityIcons name="flower" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Bicycle", id: "98", icon: <MaterialCommunityIcons name="bike" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Outdoor", amenity: "Outdoor shower", id: "99", icon: <MaterialCommunityIcons name="shower-head" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Safety
    {category: "Safety", amenity: "Smoke detector", id: "100", icon: <MaterialCommunityIcons name="smoke-detector" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Safety", amenity: "Carbon monoxide detector", id: "101", icon: <MaterialCommunityIcons name="molecule-co2" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Safety", amenity: "Fire extinguisher", id: "102", icon: <MaterialCommunityIcons name="fire-extinguisher" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Safety", amenity: "Lock on bedroom door", id: "103", icon: <Ionicons name="lock-closed-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // Technology
    {category: "Technology", amenity: "Smart TV", id: "104", icon: <Ionicons name="tv" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Technology", amenity: "Streaming services", id: "105", icon: <Ionicons name="tv-outline" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Technology", amenity: "Bluetooth speaker", id: "106", icon: <Ionicons name="bluetooth" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Technology", amenity: "Universal chargers", id: "107", icon: <MaterialCommunityIcons name="cellphone-charging" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "Technology", amenity: "Work desk and chair", id: "108", icon: <MaterialCommunityIcons name="desk" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // WaterActivities
    {category: "WaterActivities", amenity: "Snorkeling equipment", id: "109", icon: <MaterialCommunityIcons name="diving-snorkel" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Fishing equipment", id: "110", icon: <MaterialCommunityIcons name="fish" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Diving equipment", id: "111", icon: <MaterialCommunityIcons name="diving-scuba-tank" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Water skis", id: "112", icon: <MaterialCommunityIcons name="water" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Monoski", id: "113", icon: <MaterialCommunityIcons name="ski-water" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Wakeboard", id: "114", icon: <MaterialCommunityIcons name="ski-water" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Towable Tube", id: "115", icon: <MaterialCommunityIcons name="lifebuoy" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Inflatable banana", id: "116", icon: <MaterialCommunityIcons name="water" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "WaterActivities", amenity: "Kneeboard", id: "117", icon: <MaterialCommunityIcons name="kayaking" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},

    // GuestCapacity
    {category: "GuestCapacity", amenity: "One guest", id: "118", icon: <MaterialCommunityIcons name="account" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "GuestCapacity", amenity: "Two guests", id: "119", icon: <MaterialCommunityIcons name="account-multiple" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
    {category: "GuestCapacity", amenity: "Guests", id: "120", icon: <MaterialCommunityIcons name="account-group" size={DEFAULT_SIZE} color={DEFAULT_COLOR}/>},
];

export default amenities;