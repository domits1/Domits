import { create } from "zustand";
import axios from "axios";
import { generateUUID } from "../utils/generateAccomodationId";

const API_BASE_URL =
  "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation";

const useFormStore = create((set) => ({
  completedSteps: [],
  accommodationDetails: {
    type: "",
    title: "",
    subtitle: "",
    guestAccessType: "",
    boatType: "",
    camperType: "",
    boatDetails: {
      country: "",
      city: "",
      harbor: "",
    },
    camperDetails: {
      country: "",
      city: "",
      street: "",
      zipCode: "",
    },
    address: {
      street: "",
      city: "",
      zipCode: "",
      country: "",
    },
    accommodationCapacity: {
      GuestAmount: 0,
      Cabins: 0,
      Bedrooms: 0,
      Bathrooms: 0,
      Beds: 0,
    },
    selectedAmenities: {},
    houseRules: {
      AllowSmoking: false,
      AllowPets: false,
      AllowParties: false,
      CheckIn: {
        From: "00:00",
        Til: "00:00",
      },
      CheckOut: {
        From: "00:00",
        Til: "00:00",
      },
    },
    images: {},
    description: "",
    boatSpecifications: {},
    camperSpecifications: {},
    Rent: "1",
    CleaningFee: "",
    ServiceFee: 0,
    Features: {
      ExtraServices: [],
    },
    availability: {
      MinimumStay: 1,
      MaximumStay: 30,
      MinimumAdvancedReservation: 1,
      MaximumAdvancedReservation: 1,
      selectedDates: [],
    },
    registrationNumber: "",
    category: "",
    fuelTank: "",
    fwd: "",
    gpi: "",
    harbor: "",
    hasLicense: "",
    height: "",
    isPro: false,
    length: "",
    licensePlate: "",
    manufacturer: "",
    minimumBookingPeriod: "",
    model: "",
    postalCode: "",
    renovated: "",
    rentedWithSkipper: false,
    requirement: "",
    rooms: 0,
    selfBuilt: false,
    speed: "",
    street: "",
    transmission: "",
    updatedAt: new Date().toISOString(),
    yoc: "",
    OwnerId: "",
  },
  setAccommodationType: (type) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        type: type,
      },
    })),
  setGuestAccessType: (accessType) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        guestAccessType: accessType,
      },
    })),
  setBoatType: (boatType) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        boatType: boatType,
      },
    })),
  setCamperType: (camperType) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        camperType: camperType,
      },
    })),
  setAddress: (details) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        address: { ...state.accommodationDetails.address, ...details },
      },
    })),
  setBoatDetails: (details) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        boatDetails: { ...state.accommodationDetails.boatDetails, ...details },
      },
    })),
  setCamperDetails: (details) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        camperDetails: {
          ...state.accommodationDetails.camperDetails,
          ...details,
        },
      },
    })),
  setAccommodationCapacity: (key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        accommodationCapacity: {
          ...state.accommodationDetails.accommodationCapacity,
          [key]: value,
        },
      },
    })),
  setAmenities: (category, amenities) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        selectedAmenities: {
          ...state.accommodationDetails.selectedAmenities,
          [category]: amenities,
        },
      },
    })),
  setHouseRule: (rule, value, subKey) =>
    set((state) => {
      const updatedHouseRules = { ...state.accommodationDetails.houseRules };

      if (subKey) {
        updatedHouseRules[rule][subKey] = value;
      } else {
        updatedHouseRules[rule] = value;
      }

      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          houseRules: updatedHouseRules,
        },
      };
    }),
  updateImage: (index, fileURL) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        images: {
          ...state.accommodationDetails.images,
          [`image${index + 1}`]: fileURL,
        },
      },
    })),
  deleteImage: (index) =>
    set((state) => {
      const updatedImages = { ...state.accommodationDetails.images };
      delete updatedImages[`image${index + 1}`];
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          images: updatedImages,
        },
      };
    }),
  updateAccommodationDetail: (key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        [key]: value,
      },
    })),
  updateDescription: (value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        description: value,
      },
    })),
  updateBoatSpecification: (key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        boatSpecifications: {
          ...state.accommodationDetails.boatSpecifications,
          [key]: value,
        },
      },
    })),
  updateCamperSpecification: (key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        camperSpecifications: {
          ...state.accommodationDetails.camperSpecifications,
          [key]: value,
        },
      },
    })),
  updatePricing: (field, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        [field]: value,
      },
    })),
  calculateServiceFee: () =>
    set((state) => {
      const rent = parseFloat(state.accommodationDetails.Rent) || 0;
      const cleaningFee =
        parseFloat(state.accommodationDetails.CleaningFee) || 0;
      const serviceFee = (rent + cleaningFee) * 0.1;
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          ServiceFee: serviceFee,
        },
      };
    }),
  updateAvailability: (key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        availability: {
          ...state.accommodationDetails.availability,
          [key]: value,
        },
      },
    })),
  updateSelectedDates: (dates) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        availability: {
          ...state.accommodationDetails.availability,
          selectedDates: dates,
        },
      },
    })),
  setRegistrationNumber: (registrationNumber) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        registrationNumber: registrationNumber,
      },
    })),
  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: [...state.completedSteps, step],
    })),
  setOwnerId: (id) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        ownerId: id,
      },
    })),
  resetAccommodationDetails: () =>
    set({
      accommodationDetails: { type: "" },
      guestAccessType: "",
      boatType: "",
      camperType: "",
      boatDetails: {
        country: "",
        city: "",
        harbor: "",
      },
      camperDetails: {
        country: "",
        city: "",
        street: "",
        zipCode: "",
      },
      address: {
        street: "",
        city: "",
        zipCode: "",
        country: "",
      },
      accommodationCapacity: {
        GuestAmount: 0,
        Cabins: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
      },
    }),
  submitAccommodation: async (navigate) => {
    const { accommodationDetails } = useFormStore.getState();

    try {
      const formattedData = {
        ID: generateUUID(),
        Title: accommodationDetails.title,
        Subtitle: accommodationDetails.subtitle,
        AccommodationType: accommodationDetails.type,
        Address: accommodationDetails.address,
        AllowParties: accommodationDetails.houseRules.AllowParties,
        AllowPets: accommodationDetails.houseRules.AllowPets,
        AllowSmoking: accommodationDetails.houseRules.AllowSmoking,
        Availability: accommodationDetails.availability,
        Bathrooms: accommodationDetails.accommodationCapacity.Bathrooms,
        Bedrooms: accommodationDetails.accommodationCapacity.Bedrooms,
        Beds: accommodationDetails.accommodationCapacity.Beds,
        BookedDates: accommodationDetails.bookedDates || [],
        Cabins: accommodationDetails.accommodationCapacity.Cabins,
        CamperBrand:
          accommodationDetails.camperSpecifications.CamperBrand || "",
        Capacity: accommodationDetails.accommodationCapacity.GuestAmount,
        Category: accommodationDetails.category,
        CheckIn: accommodationDetails.houseRules.CheckIn,
        CheckOut: accommodationDetails.houseRules.CheckOut,
        CleaningFee: accommodationDetails.CleaningFee,
        Country: accommodationDetails.address.country,
        CreatedAt: new Date().toISOString(),
        Description: accommodationDetails.description,
        Drafted: false,
        Features: accommodationDetails.Features,
        FuelTank: accommodationDetails.fuelTank,
        FWD: accommodationDetails.fwd,
        GPI: accommodationDetails.gpi,
        GuestAccess: accommodationDetails.guestAccessType,
        Harbor: accommodationDetails.harbor,
        HasLicense: accommodationDetails.hasLicense,
        Height: accommodationDetails.height,
        HouseRules: accommodationDetails.houseRules,
        Images: accommodationDetails.images,
        IsPro: accommodationDetails.isPro,
        Length: accommodationDetails.length,
        LicensePlate: accommodationDetails.licensePlate,
        Manufacturer: accommodationDetails.manufacturer,
        MinimumAdvancedReservation:
          accommodationDetails.availability.MinimumAdvancedReservation,
        MinimumBookingPeriod: accommodationDetails.minimumBookingPeriod,
        Model: accommodationDetails.model,
        OwnerId: accommodationDetails.ownerId,
        PostalCode: accommodationDetails.address.zipCode,
        RegistrationNumber: accommodationDetails.registrationNumber,
        Renovated: accommodationDetails.renovated,
        Rent: accommodationDetails.Rent,
        RentedWithSkipper: accommodationDetails.rentedWithSkipper,
        Requirement: accommodationDetails.requirement,
        Rooms: accommodationDetails.rooms,
        SelfBuilt: accommodationDetails.selfBuilt,
        ServiceFee: accommodationDetails.ServiceFee,
        Speed: accommodationDetails.speed,
        Street: accommodationDetails.address.street,
        Transmission: accommodationDetails.transmission,
        Type: accommodationDetails.type,
        UpdatedAt: new Date().toISOString(),
        YOC: accommodationDetails.yoc,
      };

      const response = await axios.post(API_BASE_URL, formattedData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("Accommodation uploaded successfully:", response.data);
      if (response.data.statusCode === 200){
        navigate("/hostdashboard");
      }
    } catch (error) {
      console.error("Error uploading accommodation:", error);
    }
  },
}));

export default useFormStore;
