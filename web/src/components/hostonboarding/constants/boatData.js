import Motorboat from "../../../images/boat_types/motorboat.png";
import Sailboat from "../../../images/boat_types/sailboat.png";
import RIB from "../../../images/boat_types/rib.png";
import Catamaran from "../../../images/boat_types/catamaran.png";
import Yacht from "../../../images/boat_types/yacht.png";
import Barge from "../../../images/boat_types/barge.png";
import HouseBoat from "../../../images/boat_types/house_boat.png";
import Jetski from "../../../images/boat_types/jetski.png";
import ElectricBoat from "../../../images/boat_types/electric-boat.png";
import BoatWithoutLicense from "../../../images/boat_types/boat-without-license.png";

export const boatData = {
  boat: {
    types: [
      "Motorboat",
      "Sailboat",
      "RIB",
      "Catamaran",
      "Yacht",
      "Barge",
      "House boat",
      "Jetski",
      "Electric boat",
      "Boat without license",
    ],
    icons: {
      Motorboat,
      Sailboat,
      RIB,
      Catamaran,
      Yacht,
      Barge,
      "House boat": HouseBoat,
      Jetski,
      "Electric boat": ElectricBoat,
      "Boat without license": BoatWithoutLicense,
    },
  },
};
