import Apartment from "../../../images/icons/onboarding-type-residence.svg";
import House from "../../../images/icons/onboarding-type-home.svg";
import Villa from "../../../images/icons/onboarding-type-villa.svg";
import Boat from "../../../images/icons/house-boat.png";
import Camper from "../../../images/icons/camper-van.png";
import Cottage from "../../../images/icons/cottage.png";

export const accommodationData = {
  accommodation: {
    types: ["Villa", "House", "Apartment", "Boat", "Camper", "Cottage"],
    visibleTypes: ["Villa", "House", "Apartment"],
    labels: {
      House: "Home",
      Apartment: "Residence",
    },
    icons: {
      Villa,
      House,
      Apartment,
      Boat,
      Camper,
      Cottage,
    },
  },
};
