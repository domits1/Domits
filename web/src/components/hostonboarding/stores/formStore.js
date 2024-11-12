import { create } from "zustand";

const useFormStore = create((set) => ({
  accommodationDetails: {
    type: "",
    guestAccessType: "",
    boatType: "",
    camperType: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    }
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
  setAddress: (address) =>
    set((state) => ({
      accommodationDetails: {
        ...state.accommodationDetails,
        address: address,
      },
    })),
  resetAccommodationDetails: () =>
    set({
      accommodationDetails: { type: "" },
      guestAccessType: "",
      boatType: "",
      camperType: "",
    }),
}));

export default useFormStore;
