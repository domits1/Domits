// --- START OF FILE formStore.js ---

import { create } from "zustand";
import axios from "axios";

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
      latitude: null, // Added for map
      longitude: null, // Added for map
    },
    camperDetails: {
      country: "",
      city: "",
      street: "",
      zipCode: "",
      latitude: null, // Added for map
      longitude: null, // Added for map
    },
    address: {
      street: "",
      city: "",
      zipCode: "",
      country: "",
      latitude: null, // Added for map
      longitude: null, // Added for map
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
      ExpirationTime: 72,
      MinimumStay: 1,
      MinimumBookingPeriod: 3,
      MaximumStay: 10,
      MinimumAdvancedReservation: 1,
      MaximumAdvancedReservation: 1,
      PaymentDeadlineAfterBooking: "24",
      PaymentDeadlineBeforeCheckIn: "36",
      selectedDates: [],
    },
    registrationNumber: "",
    ReservationsID: "",
    OwnerId: "",
    // Added Drafted state, ensure it exists or provide default
    Drafted: true,
    // Added bookedDates if needed by API, ensure it exists or provide default
    bookedDates: [],
    // Added category if needed by API, ensure it exists or provide default
    category: "",
    // Added rooms if needed by API, ensure it exists or provide default
    rooms: 0,
  },

  // --- Setters for basic types (Unchanged from working version) ---
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

  // --- Setters for Address/Details (Ensure they merge correctly) ---
  setAddress: (details) =>
      set((state) => ({
        accommodationDetails: {
          ...state.accommodationDetails,
          // Merge incoming details with existing address state
          address: { ...state.accommodationDetails.address, ...details },
        },
      })),
  setBoatDetails: (details) =>
      set((state) => ({
        accommodationDetails: {
          ...state.accommodationDetails,
          // Merge incoming details with existing boatDetails state
          boatDetails: { ...state.accommodationDetails.boatDetails, ...details },
        },
      })),
  setCamperDetails: (details) =>
      set((state) => ({
        accommodationDetails: {
          ...state.accommodationDetails,
          // Merge incoming details with existing camperDetails state
          camperDetails: {
            ...state.accommodationDetails.camperDetails,
            ...details,
          },
        },
      })),

  // --- Other Setters (Unchanged from working version unless needed) ---
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
      set((state) => {
        // Keep existing validation and formatting
        if (!Array.isArray(dates) || !dates[0]?.startDate || !dates[0]?.endDate) {
          console.error("Invalid dates array or missing properties:", dates);
          return state;
        }
        const { startDate, endDate } = dates[0];
        const formattedDates = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
        return {
          accommodationDetails: {
            ...state.accommodationDetails,
            availability: {
              ...state.accommodationDetails.availability,
              selectedDates: formattedDates, // Assuming API expects this structure
            },
          },
        };
      }),
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

  // --- Reset Function (Updated) ---
  resetAccommodationDetails: () =>
      set({
        // Reset to the initial state structure, including new lat/lng fields
        accommodationDetails: {
          type: "",
          title: "",
          subtitle: "",
          guestAccessType: "",
          boatType: "",
          camperType: "",
          boatDetails: {
            country: "", city: "", harbor: "", latitude: null, longitude: null,
          },
          camperDetails: {
            country: "", city: "", street: "", zipCode: "", latitude: null, longitude: null,
          },
          address: {
            street: "", city: "", zipCode: "", country: "", latitude: null, longitude: null,
          },
          accommodationCapacity: { GuestAmount: 0, Cabins: 0, Bedrooms: 0, Bathrooms: 0, Beds: 0 },
          selectedAmenities: {},
          houseRules: { AllowSmoking: false, AllowPets: false, AllowParties: false, CheckIn: { From: "00:00", Til: "00:00" }, CheckOut: { From: "00:00", Til: "00:00" } },
          images: {},
          description: "",
          boatSpecifications: {},
          camperSpecifications: {},
          Rent: "1", CleaningFee: "", ServiceFee: 0,
          Features: { ExtraServices: [] },
          availability: { ExpirationTime: 72, MinimumStay: 1, MinimumBookingPeriod: 3, MaximumStay: 10, MinimumAdvancedReservation: 1, MaximumAdvancedReservation: 1, PaymentDeadlineAfterBooking: "24", PaymentDeadlineBeforeCheckIn: "36", selectedDates: [] },
          registrationNumber: "", ReservationsID: "", OwnerId: "",
          Drafted: true, bookedDates: [], category: "", rooms: 0,
        },
        completedSteps: [], // Also reset completed steps
      }),

  // --- Submit Function (Carefully Re-integrated) ---
  submitAccommodation: async (navigate) => {
    const { accommodationDetails } = useFormStore.getState();

    const isBoat = accommodationDetails.type === "boat";
    const isCamper = accommodationDetails.type === "camper";

    // Determine the correct source for location details
    const locationSource = isBoat
        ? accommodationDetails.boatDetails
        : isCamper
            ? accommodationDetails.camperDetails
            : accommodationDetails.address;

    // Determine the correct source for specifications
    const specifications = isBoat
        ? accommodationDetails.boatSpecifications
        : isCamper
            ? accommodationDetails.camperSpecifications
            : {}; // Default to empty object if neither boat nor camper

    try {
      // Build the formattedData object, referencing the working version's structure
      // and carefully adding/sourcing the location fields and lat/lng.
      const formattedData = {
        // Fields directly from accommodationDetails (like in working version)
        Title: accommodationDetails.title || "",
        Subtitle: accommodationDetails.subtitle || "",
        AccommodationType: accommodationDetails.type || "", // Use 'type' consistently
        AllowParties: accommodationDetails.houseRules?.AllowParties || false,
        AllowPets: accommodationDetails.houseRules?.AllowPets || false,
        AllowSmoking: accommodationDetails.houseRules?.AllowSmoking || false,
        Availability: accommodationDetails.availability || {}, // Ensure this structure matches API
        Bathrooms: accommodationDetails.accommodationCapacity?.Bathrooms || 0,
        Bedrooms: accommodationDetails.accommodationCapacity?.Bedrooms || 0,
        Beds: accommodationDetails.accommodationCapacity?.Beds || 0,
        BookedDates: accommodationDetails.bookedDates || [], // Ensure this structure matches API
        Cabins: accommodationDetails.accommodationCapacity?.Cabins || 0, // Note: Cabins might be boat-specific
        Capacity: accommodationDetails.accommodationCapacity?.GuestAmount || 0,
        Category: accommodationDetails.category || "", // Add if needed by API
        CheckIn: accommodationDetails.houseRules?.CheckIn || { From: "00:00", Til: "00:00" }, // Ensure correct structure/default
        CheckOut: accommodationDetails.houseRules?.CheckOut || { From: "00:00", Til: "00:00" }, // Ensure correct structure/default
        CleaningFee: parseFloat(accommodationDetails.CleaningFee) || 0, // Ensure numeric
        CreatedAt: new Date().toISOString(),
        Description: accommodationDetails.description || "",
        Drafted: accommodationDetails.Drafted !== undefined ? accommodationDetails.Drafted : true, // Default to true if undefined
        Features: accommodationDetails.Features || { ExtraServices: [] }, // Ensure correct structure/default
        GuestAccess: accommodationDetails.guestAccessType || "",
        HouseRules: accommodationDetails.houseRules || {}, // Ensure this structure matches API
        Images: Object.values(accommodationDetails.images || {}), // Get image URLs
        OwnerId: accommodationDetails.ownerId || "",
        PaymentAfterBookingHours: parseInt(accommodationDetails.availability?.PaymentDeadlineAfterBooking, 10) || 24, // Ensure numeric
        PaymentBeforeCheckInHours: parseInt(accommodationDetails.availability?.PaymentDeadlineBeforeCheckIn, 10) || 36, // Ensure numeric
        RegistrationNumber: accommodationDetails.registrationNumber || "",
        Rent: parseFloat(accommodationDetails.Rent) || 0, // Ensure numeric
        ReservationExpirationTime: parseInt(accommodationDetails.availability?.ExpirationTime, 10) || 72, // Ensure numeric
        Rooms: accommodationDetails.rooms || 0, // Add if needed by API
        ServiceFee: accommodationDetails.ServiceFee || 0, // Calculated separately
        Type: accommodationDetails.type || "", // Redundant? AccommodationType used above. Check API req.
        UpdatedAt: new Date().toISOString(),

        // Location fields sourced from locationSource
        Country: locationSource?.country || "",
        City: locationSource?.city || "",
        Latitude: locationSource?.latitude ?? null, // Send null if not set
        Longitude: locationSource?.longitude ?? null, // Send null if not set

        // Conditional Location fields
        Harbor: isBoat ? (locationSource?.harbor || "") : "", // Only for boats
        Street: !isBoat ? (locationSource?.street || "") : "", // Not for boats
        PostalCode: !isBoat ? (locationSource?.zipCode || "") : "", // Not for boats

        // Specification fields sourced from specifications object
        CamperBrand: isCamper ? (specifications?.CamperBrand || "") : "", // Only for camper
        FuelTank: specifications?.FuelTank || 0, // Might be vehicle specific
        FWD: specifications?.FWD || false, // Might be vehicle specific
        GPI: specifications?.GPI || "", // Boat specific? Check usage
        HasLicense: specifications?.HasLicense || false, // Might be vehicle specific
        Height: specifications?.Height || 0, // Might be vehicle specific
        IsPro: specifications?.IsPro || false, // Boat specific? Check usage
        Length: specifications?.Length || 0, // Might be vehicle specific
        LicensePlate: isCamper ? (specifications?.LicensePlate || "") : "", // Only for camper
        Manufacturer: specifications?.Manufacturer || "", // Might be vehicle specific
        MinimumAdvancedReservation: parseInt(accommodationDetails.availability?.MinimumAdvancedReservation, 10) || 0, // Sourced from availability
        MinimumBookingPeriod: parseInt(accommodationDetails.availability?.MinimumBookingPeriod, 10) || 0, // Sourced from availability - Check if MinimumBookingPeriod belongs elsewhere? Your working code had it separate. Let's assume it's in availability based on structure.
        Model: specifications?.Model || "", // Might be vehicle specific
        Renovated: specifications?.Renovated || 0, // Add if needed by API
        RentedWithSkipper: isBoat ? (specifications?.RentedWithSkipper || false) : false, // Only for boat
        Requirement: specifications?.Requirement || "", // Might be vehicle specific
        SelfBuilt: isCamper ? (specifications?.SelfBuilt || false) : false, // Only for camper
        Speed: specifications?.Speed || 0, // Might be vehicle specific
        Transmission: isCamper ? (specifications?.Transmission || "") : "", // Only for camper
        YOC: specifications?.YOC || 0, // Might be vehicle specific (Year of Construction)
      };

      console.log(
          "Submitting accommodation data:",
          JSON.stringify(formattedData, null, 2)
      );

      const response = await axios.post(API_BASE_URL, formattedData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("Accommodation uploaded successfully:", response.data);
      // Check status code robustly
      if (response.status === 200 || response.data?.statusCode === 200) {
        navigate("/hostdashboard");
      } else {
        console.error("Submission failed:", response.status, response.data);
        // Handle submission failure feedback if needed
      }
    } catch (error) {
      // Log detailed error information
      console.error(
          "Error uploading accommodation:",
          error.response?.data || error.message || error
      );
      // Handle submission error feedback if needed
    }
  },
}));

export default useFormStore;

// --- END OF FILE formStore.js ---