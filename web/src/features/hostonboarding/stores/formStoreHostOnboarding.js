import { create } from "zustand"

/**
 * Zustand based store for managing multi page host-onboarding of a new accommodation.
 * Stores the accommodationdetails, steps-progress and dynamically updated nested fields.
 * @type {UseBoundStore<Mutate<StoreApi<{setAmenities: function(*, *): *, setBoatDetails: function(*): *, updateSelectedDates: function(*): *, setGuestAccessType: function(*): *, setAccommodationType: function(*): *, updateImage: function(*, *): *, setOwnerId: function(*): *, setAccommodationCapacity: function(*, *): *, completedSteps: [], setCamperType: function(*): *, deleteImage: function(*): *, markStepComplete: function(*): *, updateNestedField: function(*, *, *): *, updateAvailability: function(*, *): *, setAddress: function(*): *, accommodationDetails: {camperDetails: {country: string, zipCode: string, city: string, street: string}, images: {}, address: {zipCode: string, country: string, city: string, street: string}, boatSpecifications: {}, camperSpecifications: {}, ReservationsID: string, accommodationCapacity: {Cabins: number, Bedrooms: number, GuestAmount: number, Bathrooms: number, Beds: number}, description: string, availability: {PaymentDeadlineAfterBooking: string, PaymentDeadlineBeforeCheckIn: string, MinimumStay: number, selectedDates: [], MinimumAdvancedReservation: number, MaximumStay: number, MaximumAdvancedReservation: number, ExpirationTime: number, MinimumBookingPeriod: number}, type: string, title: string, boatType: string, CleaningFee: string, boatDetails: {country: string, city: string, harbor: string}, ServiceFee: string, guestAccessType: string, OwnerId: string, selectedAmenities: {}, registrationNumber: string, subtitle: string, Features: {ExtraServices: []}, houseRules: {AllowPets: boolean, CheckOut: {Til: string, From: string}, AllowParties: boolean, CheckIn: {Til: string, From: string}, AllowSmoking: boolean}, camperType: string, Rent: string}, setHouseRule: function(*, *, *): *, updateBoatSpecification: function(*, *): *, calculateServiceFee: function(): *, updatePricing: function(*, *): *, updateDescription: function(*): *, setBoatType: function(*): *, setCamperDetails: function(*): *, updateAccommodationDetail: function(*, *): *, setRegistrationNumber: function(*): *, updateCamperSpecification: function(*, *): *}>, []>>}
 */
const useFormStoreHostOnboarding = create((set) => ({
  // Step progress
  completedSteps: [],

  // Main form data - Empty placeholder/constructor
  accommodationDetails: {
    type: "",
    title: "",
    subtitle: "",
    guestAccessType: "",
    boatType: "",
    camperType: "",

    boatDetails: { country: "", city: "", harbor: "" },
    camperDetails: { country: "", city: "", street: "", zipCode: "" },
    address: { street: "", city: "", zipCode: "", country: "" },

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
      CheckIn: { From: "00:00", Til: "00:00" },
      CheckOut: { From: "00:00", Til: "00:00" },
    },

    images: {},
    description: "",
    boatSpecifications: {},
    camperSpecifications: {},
    Rent: "100",
    CleaningFee: "",
    ServiceFee: "0",

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
  },

  /* ------- Basic Setters ------- */

  // Sets accommodationtype       Villa, House, Boat, Camper, Cottage
  setAccommodationType: (type) =>
    set((state) => ({
      accommodationDetails: { ...state.accommodationDetails, type },
    })),

  // Sets the boundaries of access type (room/entire house..)
  setHouseType: (accessType) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        guestAccessType: accessType,
      },
    })),

  setBoatType: (boatType) =>
    set((state) => ({
      accommodationDetails: { ...state.accommodationDetails, boatType },
    })),

  setCamperType: (camperType) =>
    set((state) => ({
      accommodationDetails: { ...state.accommodationDetails, camperType },
    })),

  setAddress: (details) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        address: { ...state.accommodationDetails.address, ...details },
      },
    })),

  // ------- Nested Setters -------
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
      const updated = { ...state.accommodationDetails.houseRules }
      subKey ? (updated[rule][subKey] = value) : (updated[rule] = value)
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          houseRules: updated,
        },
      }
    }),

  // ------- Image Handlers -------
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
      const updated = { ...state.accommodationDetails.images }
      delete updated[`image${index + 1}`]
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          images: updated,
        },
      }
    }),

  // ------- Field Setters -------
  updateAccommodationDetail: (key, value) =>
    set((state) => ({
      accommodationDetails: { ...state.accommodationDetails, [key]: value },
    })),

  updateNestedField: (section, key, value) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        [section]: {
          ...state.accommodationDetails[section],
          [key]: value,
        },
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
      const rent = parseFloat(state.accommodationDetails.Rent) || 0
      const cleaning = parseFloat(state.accommodationDetails.CleaningFee) || 0
      const fee = (rent + cleaning) * 0.1
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          ServiceFee: fee,
        },
      }
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
      const { startDate, endDate } = dates?.[0] || {}
      if (!startDate || !endDate) {
        console.error("Invalid dates array or missing properties:", dates)
        return state
      }
      return {
        accommodationDetails: {
          ...state.accommodationDetails,
          availability: {
            ...state.accommodationDetails.availability,
            selectedDates: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          },
        },
      }
    }),

  setRegistrationNumber: (registrationNumber) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        registrationNumber,
      },
    })),

  setOwnerId: (id) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        OwnerId: id,
      },
    })),

  // ------- Step Tracking -------
  markStepComplete: (step) =>
    set((state) => ({
      completedSteps: [...state.completedSteps, step],
    })),
}))

export default useFormStoreHostOnboarding
