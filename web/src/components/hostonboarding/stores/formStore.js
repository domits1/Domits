import { create } from "zustand";

const useFormStore = create((set) => ({
  accommodationDetails: {
    type: "",
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
}));

export default useFormStore;
