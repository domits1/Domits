// amenities.js — Optie A (exact jouw volgorde)
import React from "react";
import IconWrapper from "./iconWrapper";

import ToysIcon from "@mui/icons-material/Toys";
import WifiIcon from "@mui/icons-material/Wifi";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import HvacIcon from "@mui/icons-material/Hvac";
import TvIcon from "@mui/icons-material/Tv";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import BedIcon from "@mui/icons-material/Bed";
import WcIcon from "@mui/icons-material/Wc";
import SoapIcon from "@mui/icons-material/Soap";
import KitchenIcon from "@mui/icons-material/Kitchen";
import MicrowaveIcon from "@mui/icons-material/Microwave";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import CoffeeMakerIcon from "@mui/icons-material/CoffeeMaker";
import BreakfastDiningIcon from "@mui/icons-material/BreakfastDining";
import FlatwareIcon from "@mui/icons-material/Flatware";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import FoodBankIcon from "@mui/icons-material/FoodBank";
import BlenderIcon from "@mui/icons-material/Blender";
import EmojiFoodBeverageIcon from "@mui/icons-material/EmojiFoodBeverage";
import AirIcon from "@mui/icons-material/Air";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import IronIcon from "@mui/icons-material/Iron";
import AccessAlarmIcon from "@mui/icons-material/AccessAlarm";
import WeekendIcon from "@mui/icons-material/Weekend";
import ChairIcon from "@mui/icons-material/Chair";
import TableBarIcon from "@mui/icons-material/TableBar";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ExtensionIcon from "@mui/icons-material/Extension";
import CastIcon from "@mui/icons-material/Cast";
import BluetoothIcon from "@mui/icons-material/Bluetooth";
import ElectricalServicesIcon from "@mui/icons-material/ElectricalServices";
import DeskIcon from "@mui/icons-material/Desk";
import SmokeFreeIcon from "@mui/icons-material/SmokeFree";
import RadarIcon from "@mui/icons-material/Radar";
import FireExtinguisherIcon from "@mui/icons-material/FireExtinguisher";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import ChairAltIcon from "@mui/icons-material/ChairAlt";
import CribIcon from "@mui/icons-material/Crib";
import FenceIcon from "@mui/icons-material/Fence";
import BathtubIcon from "@mui/icons-material/Bathtub";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MapIcon from "@mui/icons-material/Map";
import LuggageIcon from "@mui/icons-material/Luggage";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import EvStationIcon from "@mui/icons-material/EvStation";
import AccessibleIcon from "@mui/icons-material/Accessible";
import DoorSlidingIcon from "@mui/icons-material/DoorSliding";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import LocalGroceryStoreIcon from "@mui/icons-material/LocalGroceryStore";
import AirportShuttleIcon from "@mui/icons-material/AirportShuttle";
import RamenDiningIcon from "@mui/icons-material/RamenDining";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import SpaIcon from "@mui/icons-material/Spa";
import RecyclingIcon from "@mui/icons-material/Recycling";
import EnergySavingsLeafIcon from "@mui/icons-material/EnergySavingsLeaf";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import DeleteIcon from "@mui/icons-material/Delete";
import BalconyIcon from "@mui/icons-material/Balcony";
import OutdoorGrillIcon from "@mui/icons-material/OutdoorGrill";
import FireplaceIcon from "@mui/icons-material/Fireplace";
import PoolIcon from "@mui/icons-material/Pool";
import HotTubIcon from "@mui/icons-material/HotTub";
import GrassIcon from "@mui/icons-material/Grass";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";

const wrap = (icon) => <IconWrapper>{icon}</IconWrapper>;

const amenities = [
  // Accessibility
  { category: "Accessibility", amenity: "Accessible-height bed", id: "63", icon: wrap(<AccessibleIcon />) },
  { category: "Accessibility", amenity: "Accessible-height toilet", id: "64", icon: wrap(<AccessibleIcon />) },
  { category: "Accessibility", amenity: "Wide doorways", id: "62", icon: wrap(<DoorSlidingIcon />) },
  { category: "Accessibility", amenity: "Step-free access", id: "61", icon: wrap(<AccessibleIcon />) },
  { category: "Accessibility", amenity: "Shower chair", id: "65", icon: wrap(<BathtubIcon />) },

  // Bathroom
  { category: "Bathroom", amenity: "Shower gel", id: "24", icon: wrap(<SoapIcon />) },
  { category: "Bathroom", amenity: "First aid kit", id: "27", icon: wrap(<MedicalServicesIcon />) },
  { category: "Bathroom", amenity: "Hair dryer", id: "23", icon: wrap(<AirIcon />) },
  { category: "Bathroom", amenity: "Body lotion", id: "26", icon: wrap(<SoapIcon />) },
  { category: "Bathroom", amenity: "Conditioner", id: "25", icon: wrap(<SoapIcon />) },

  // Bedroom
  { category: "Bedroom", amenity: "Alarm clock", id: "31", icon: wrap(<AccessAlarmIcon />) },
  { category: "Bedroom", amenity: "Hangers", id: "28", icon: wrap(<CheckroomIcon />) },
  { category: "Bedroom", amenity: "Closet/drawers", id: "30", icon: wrap(<CheckroomIcon />) },
  { category: "Bedroom", amenity: "Iron and ironing board", id: "29", icon: wrap(<IronIcon />) },

  // Convenience
  { category: "Convenience", amenity: "Parking space", id: "59", icon: wrap(<LocalParkingIcon />) },
  { category: "Convenience", amenity: "EV charger", id: "60", icon: wrap(<EvStationIcon />) },
  { category: "Convenience", amenity: "Luggage drop-off allowed", id: "58", icon: wrap(<LuggageIcon />) },
  { category: "Convenience", amenity: "Keyless entry", id: "55", icon: wrap(<CheckCircleIcon />) },
  { category: "Convenience", amenity: "Self-check-in", id: "56", icon: wrap(<CheckCircleIcon />) },
  { category: "Convenience", amenity: "Local maps and guides", id: "57", icon: wrap(<MapIcon />) },

  // EcoFriendly
  { category: "EcoFriendly", amenity: "Energy-efficient appliances", id: "75", icon: wrap(<EnergySavingsLeafIcon />) },
  { category: "EcoFriendly", amenity: "Solar panels", id: "76", icon: wrap(<SolarPowerIcon />) },
  { category: "EcoFriendly", amenity: "Composting bin", id: "77", icon: wrap(<DeleteIcon />) },
  { category: "EcoFriendly", amenity: "Recycling bins", id: "74", icon: wrap(<RecyclingIcon />) },

  // Essentials
  { category: "Essentials", amenity: "Air conditioning", id: "2", icon: wrap(<AcUnitIcon />) },
  { category: "Essentials", amenity: "Toilet paper", id: "8", icon: wrap(<WcIcon />) },
  { category: "Essentials", amenity: "Soap and shampoo", id: "9", icon: wrap(<SoapIcon />) },
  { category: "Essentials", amenity: "Wi-Fi", id: "1", icon: wrap(<WifiIcon />) },
  { category: "Essentials", amenity: "Bed linens", id: "6", icon: wrap(<BedIcon />) },
  { category: "Essentials", amenity: "Hot water", id: "5", icon: wrap(<WhatshotIcon />) },
  { category: "Essentials", amenity: "TV with cable/satellite", id: "4", icon: wrap(<TvIcon />) },
  { category: "Essentials", amenity: "Extra pillows and blankets", id: "7", icon: wrap(<BedIcon />) },
  { category: "Essentials", amenity: "Heating", id: "3", icon: wrap(<HvacIcon />) },

  // ExtraServices
  { category: "ExtraServices", amenity: "Cleaning service (add service fee manually)", id: "66", icon: wrap(<CleaningServicesIcon />) },
  { category: "ExtraServices", amenity: "Private chef", id: "71", icon: wrap(<RamenDiningIcon />) },
  { category: "ExtraServices", amenity: "Housekeeping", id: "68", icon: wrap(<CleaningServicesIcon />) },
  { category: "ExtraServices", amenity: "Airport shuttle", id: "70", icon: wrap(<AirportShuttleIcon />) },
  { category: "ExtraServices", amenity: "Grocery delivery", id: "69", icon: wrap(<LocalGroceryStoreIcon />) },
  { category: "ExtraServices", amenity: "Concierge service", id: "67", icon: wrap(<CleaningServicesIcon />) },
  { category: "ExtraServices", amenity: "Personal trainer", id: "72", icon: wrap(<DirectionsRunIcon />) },
  { category: "ExtraServices", amenity: "Massage therapist", id: "73", icon: wrap(<SpaIcon />) },

  // FamilyFriendly
  { category: "FamilyFriendly", amenity: "Baby safety gates", id: "49", icon: wrap(<FenceIcon />) },
  { category: "FamilyFriendly", amenity: "Baby bath", id: "50", icon: wrap(<BathtubIcon />) },
  { category: "FamilyFriendly", amenity: "Children's books and toys", id: "48", icon: wrap(<ToysIcon />) },
  { category: "FamilyFriendly", amenity: "Baby monitor", id: "51", icon: wrap(<LiveTvIcon />) },
  { category: "FamilyFriendly", amenity: "High chair", id: "46", icon: wrap(<ChairAltIcon />) },
  { category: "FamilyFriendly", amenity: "Crib", id: "47", icon: wrap(<CribIcon />) },

  // Kitchen
  { category: "Kitchen", amenity: "Kettle", id: "22", icon: wrap(<EmojiFoodBeverageIcon />) },
  { category: "Kitchen", amenity: "Dishes and silverware", id: "18", icon: wrap(<FlatwareIcon />) },
  { category: "Kitchen", amenity: "Toaster", id: "16", icon: wrap(<BreakfastDiningIcon />) },
  { category: "Kitchen", amenity: "Stove", id: "13", icon: wrap(<MicrowaveIcon />) },
  { category: "Kitchen", amenity: "Glasses and mugs", id: "19", icon: wrap(<FreeBreakfastIcon />) },
  { category: "Kitchen", amenity: "Microwave", id: "11", icon: wrap(<MicrowaveIcon />) },
  { category: "Kitchen", amenity: "Cutting board and knives", id: "20", icon: wrap(<FoodBankIcon />) },
  { category: "Kitchen", amenity: "Blender", id: "21", icon: wrap(<BlenderIcon />) },
  { category: "Kitchen", amenity: "Oven", id: "12", icon: wrap(<MicrowaveIcon />) },
  { category: "Kitchen", amenity: "Basic cooking essentials", id: "17", icon: wrap(<FlatwareIcon />) },
  { category: "Kitchen", amenity: "Refrigerator", id: "10", icon: wrap(<KitchenIcon />) },
  { category: "Kitchen", amenity: "Coffee maker", id: "15", icon: wrap(<CoffeeMakerIcon />) },
  { category: "Kitchen", amenity: "Dishwasher", id: "14", icon: wrap(<LocalLaundryServiceIcon />) },

  // Laundry
  { category: "Laundry", amenity: "Clothes drying rack", id: "54", icon: wrap(<CheckCircleIcon />) },
  { category: "Laundry", amenity: "Laundry detergent", id: "53", icon: wrap(<LocalLaundryServiceIcon />) },
  { category: "Laundry", amenity: "Washer and dryer", id: "52", icon: wrap(<LocalLaundryServiceIcon />) },

  // LivingArea
  { category: "LivingArea", amenity: "Board games", id: "36", icon: wrap(<ExtensionIcon />) },
  { category: "LivingArea", amenity: "Armchairs", id: "33", icon: wrap(<ChairIcon />) },
  { category: "LivingArea", amenity: "Books and magazines", id: "35", icon: wrap(<LibraryBooksIcon />) },
  { category: "LivingArea", amenity: "Sofa", id: "32", icon: wrap(<WeekendIcon />) },
  { category: "LivingArea", amenity: "Coffee table", id: "34", icon: wrap(<TableBarIcon />) },

  // Outdoor
  { category: "Outdoor", amenity: "Outdoor furniture", id: "79", icon: wrap(<OutdoorGrillIcon />) },
  { category: "Outdoor", amenity: "Grill", id: "80", icon: wrap(<OutdoorGrillIcon />) },
  { category: "Outdoor", amenity: "Garden or backyard", id: "84", icon: wrap(<GrassIcon />) },
  { category: "Outdoor", amenity: "Pool", id: "82", icon: wrap(<PoolIcon />) },
  { category: "Outdoor", amenity: "Fire pit", id: "81", icon: wrap(<FireplaceIcon />) },
  { category: "Outdoor", amenity: "Patio or balcony", id: "78", icon: wrap(<BalconyIcon />) },
  { category: "Outdoor", amenity: "Hot tub", id: "83", icon: wrap(<HotTubIcon />) },
  { category: "Outdoor", amenity: "Bicycle", id: "85", icon: wrap(<DirectionsBikeIcon />) },

  // Safety
  { category: "Safety", amenity: "Fire extinguisher", id: "44", icon: wrap(<FireExtinguisherIcon />) },
  { category: "Safety", amenity: "Lock on bedroom door", id: "45", icon: wrap(<LockPersonIcon />) },
  { category: "Safety", amenity: "Smoke detector", id: "42", icon: wrap(<SmokeFreeIcon />) },
  { category: "Safety", amenity: "Carbon monoxide detector", id: "43", icon: wrap(<RadarIcon />) },

  // Technology
  { category: "Technology", amenity: "Universal chargers", id: "40", icon: wrap(<ElectricalServicesIcon />) },
  { category: "Technology", amenity: "Streaming services", id: "38", icon: wrap(<CastIcon />) },
  { category: "Technology", amenity: "Work desk and chair", id: "41", icon: wrap(<DeskIcon />) },
  { category: "Technology", amenity: "Bluetooth speaker", id: "39", icon: wrap(<BluetoothIcon />) },
  { category: "Technology", amenity: "Smart TV", id: "37", icon: wrap(<TvIcon />) }
];

export default amenities;
