import React from "react";

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

const amenities = [
  // Accessibility
  {category: "Accessibility", amenity: "Accessible-height bed", id: "63", icon: <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Accessibility", amenity: "Accessible-height toilet", id: "64", icon: <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Accessibility", amenity: "Wide doorways", id: "62", icon: <DoorSlidingIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Accessibility", amenity: "Step-free access", id: "61", icon: <AccessibleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Accessibility", amenity: "Shower chair", id: "65", icon: <BathtubIcon sx={{color: 'var(--primary-color)'}}/>},

  // Bathroom
  {category: "Bathroom", amenity: "Shower gel", id: "24", icon: <SoapIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bathroom", amenity: "First aid kit", id: "27", icon: <MedicalServicesIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bathroom", amenity: "Hair dryer", id: "23", icon: <AirIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bathroom", amenity: "Body lotion", id: "26", icon: <SoapIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bathroom", amenity: "Conditioner", id: "25", icon: <SoapIcon sx={{color: 'var(--primary-color)'}}/>},

  // Bedroom
  {category: "Bedroom", amenity: "Alarm clock", id: "31", icon: <AccessAlarmIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bedroom", amenity: "Hangers", id: "28", icon: <CheckroomIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bedroom", amenity: "Closet/drawers", id: "30", icon: <CheckroomIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Bedroom", amenity: "Iron and ironing board", id: "29", icon: <IronIcon sx={{color: 'var(--primary-color)'}}/>},

  // Convenience
  {category: "Convenience", amenity: "Parking space", id: "59", icon: <LocalParkingIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Convenience", amenity: "EV charger", id: "60", icon: <EvStationIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Convenience", amenity: "Luggage drop-off allowed", id: "58", icon: <LuggageIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Convenience", amenity: "Keyless entry", id: "55", icon: <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Convenience", amenity: "Self-check-in", id: "56", icon: <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Convenience", amenity: "Local maps and guides", id: "57", icon: <MapIcon sx={{color: 'var(--primary-color)'}}/>},

  // EcoFriendly
  {category: "EcoFriendly", amenity: "Energy-efficient appliances", id: "75", icon: <EnergySavingsLeafIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "EcoFriendly", amenity: "Solar panels", id: "76", icon: <SolarPowerIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "EcoFriendly", amenity: "Composting bin", id: "77", icon: <DeleteIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "EcoFriendly", amenity: "Recycling bins", id: "74", icon: <RecyclingIcon sx={{color: 'var(--primary-color)'}}/>},

  // Essentials
  {category: "Essentials", amenity: "Air conditioning", id: "2", icon: <AcUnitIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Toilet paper", id: "8", icon: <WcIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Soap and shampoo", id: "9", icon: <SoapIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Wi-Fi", id: "1", icon: <WifiIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Bed linens", id: "6", icon: <BedIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Hot water", id: "5", icon: <WhatshotIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "TV with cable/satellite", id: "4", icon: <TvIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Extra pillows and blankets", id: "7", icon: <BedIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Essentials", amenity: "Heating", id: "3", icon: <HvacIcon sx={{color: 'var(--primary-color)'}}/>},

  // ExtraServices
  {category: "ExtraServices", amenity: "Cleaning service (add service fee manually)", id: "66", icon: <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Private chef", id: "71", icon: <RamenDiningIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Housekeeping", id: "68", icon: <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Airport shuttle", id: "70", icon: <AirportShuttleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Grocery delivery", id: "69", icon: <LocalGroceryStoreIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Concierge service", id: "67", icon: <CleaningServicesIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Personal trainer", id: "72", icon: <DirectionsRunIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "ExtraServices", amenity: "Massage therapist", id: "73", icon: <SpaIcon sx={{color: 'var(--primary-color)'}}/>},

  // FamilyFriendly
  {category: "FamilyFriendly", amenity: "Baby safety gates", id: "49", icon: <FenceIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "FamilyFriendly", amenity: "Baby bath", id: "50", icon: <BathtubIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "FamilyFriendly", amenity: "Children's books and toys", id: "48", icon: <ToysIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "FamilyFriendly", amenity: "Baby monitor", id: "51", icon: <LiveTvIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "FamilyFriendly", amenity: "High chair", id: "46", icon: <ChairAltIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "FamilyFriendly", amenity: "Crib", id: "47", icon: <CribIcon sx={{color: 'var(--primary-color)'}}/>},

  // Kitchen
  {category: "Kitchen", amenity: "Kettle", id: "22", icon: <EmojiFoodBeverageIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Dishes and silverware", id: "18", icon: <FlatwareIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Toaster", id: "16", icon: <BreakfastDiningIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Stove", id: "13", icon: <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Glasses and mugs", id: "19", icon: <FreeBreakfastIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Microwave", id: "11", icon: <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Cutting board and knives", id: "20", icon: <FoodBankIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Blender", id: "21", icon: <BlenderIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Oven", id: "12", icon: <MicrowaveIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Basic cooking essentials", id: "17", icon: <FlatwareIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Refrigerator", id: "10", icon: <KitchenIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Coffee maker", id: "15", icon: <CoffeeMakerIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Kitchen", amenity: "Dishwasher", id: "14", icon: <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>},

  // Laundry
  {category: "Laundry", amenity: "Clothes drying rack", id: "54", icon: <CheckCircleIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Laundry", amenity: "Laundry detergent", id: "53", icon: <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Laundry", amenity: "Washer and dryer", id: "52", icon: <LocalLaundryServiceIcon sx={{color: 'var(--primary-color)'}}/>},

  // LivingArea
  {category: "LivingArea", amenity: "Board games", id: "36", icon: <ExtensionIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "LivingArea", amenity: "Armchairs", id: "33", icon: <ChairIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "LivingArea", amenity: "Books and magazines", id: "35", icon: <LibraryBooksIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "LivingArea", amenity: "Sofa", id: "32", icon: <WeekendIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "LivingArea", amenity: "Coffee table", id: "34", icon: <TableBarIcon sx={{color: 'var(--primary-color)'}}/>},

  // Outdoor
  {category: "Outdoor", amenity: "Outdoor furniture", id: "79", icon: <OutdoorGrillIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Grill", id: "80", icon: <OutdoorGrillIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Garden or backyard", id: "84", icon: <GrassIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Pool", id: "82", icon: <PoolIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Fire pit", id: "81", icon: <FireplaceIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Patio or balcony", id: "78", icon: <BalconyIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Hot tub", id: "83", icon: <HotTubIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Outdoor", amenity: "Bicycle", id: "85", icon: <DirectionsBikeIcon sx={{color: 'var(--primary-color)'}}/>},

  // Safety
  {category: "Safety", amenity: "Fire extinguisher", id: "44", icon: <FireExtinguisherIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Safety", amenity: "Lock on bedroom door", id: "45", icon: <LockPersonIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Safety", amenity: "Smoke detector", id: "42", icon: <SmokeFreeIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Safety", amenity: "Carbon monoxide detector", id: "43", icon: <RadarIcon sx={{color: 'var(--primary-color)'}}/>},

  // Technology
  {category: "Technology", amenity: "Universal chargers", id: "40", icon: <ElectricalServicesIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Technology", amenity: "Streaming services", id: "38", icon: <CastIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Technology", amenity: "Work desk and chair", id: "41", icon: <DeskIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Technology", amenity: "Bluetooth speaker", id: "39", icon: <BluetoothIcon sx={{color: 'var(--primary-color)'}}/>},
  {category: "Technology", amenity: "Smart TV", id: "37", icon: <TvIcon sx={{color: 'var(--primary-color)'}}/>}
];

export default amenities;
