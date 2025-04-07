import { create } from "zustand";

// old using Zustand
const useFormStore = create((set) => ({
    completedSteps: [],

    // Empty placeholder for accommodationdetails
    accommodationDetails: {
        type: "",
        title: "",
        subtitle: "",
        guestAccessType: "",
        boatType: "",
        camperType: "",
        boatDetails: {
            country: "", city: "", harbor: "",
        },
        camperDetails: {
            country: "", city: "", street: "", zipCode: "",
        },
        address: {
            street: "", city: "", zipCode: "", country: "",
        },
        accommodationCapacity: {
            GuestAmount: 0, Cabins: 0, Bedrooms: 0, Bathrooms: 0, Beds: 0,
        },
        selectedAmenities: {},
        houseRules: {
            AllowSmoking: false, AllowPets: false, AllowParties: false,
            CheckIn: {From: "00:00", Til: "00:00"},
            CheckOut: {From: "00:00", Til: "00:00"},
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

    // Actions to build the accommodationdetails file

    setAccommodationType: (type) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, type},
        })),

    setGuestAccessType: (accessType) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, guestAccessType: accessType},
        })),

    setBoatType: (boatType) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, boatType},
        })),

    setCamperType: (camperType) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, camperType},
        })),

    setAddress: (details) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                address: {...state.accommodationDetails.address, ...details},
            },
        })),

    setBoatDetails: (details) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                boatDetails: {...state.accommodationDetails.boatDetails, ...details},
            },
        })),

    setCamperDetails: (details) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                camperDetails: {...state.accommodationDetails.camperDetails, ...details},
            },
        })),

    setAccommodationCapacity: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                accommodationCapacity: {...state.accommodationDetails.accommodationCapacity, [key]: value},
            },
        })),

    setAmenities: (category, amenities) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                selectedAmenities: {...state.accommodationDetails.selectedAmenities, [category]: amenities},
            },
        })),

    setHouseRule: (rule, value, subKey) =>
        set((state) => {
            const updatedHouseRules = {...state.accommodationDetails.houseRules};
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
                images: {...state.accommodationDetails.images, [`image${index + 1}`]: fileURL},
            },
        })),

    deleteImage: (index) =>
        set((state) => {
            const updatedImages = {...state.accommodationDetails.images};
            delete updatedImages[`image${index + 1}`];
            return {
                accommodationDetails: {...state.accommodationDetails, images: updatedImages},
            };
        }),

    updateAccommodationDetail: (key, value) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, [key]: value},
        })),

    updateDescription: (value) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, description: value},
        })),

    updateBoatSpecification: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                boatSpecifications: {...state.accommodationDetails.boatSpecifications, [key]: value},
            },
        })),

    updateCamperSpecification: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                camperSpecifications: {...state.accommodationDetails.camperSpecifications, [key]: value},
            },
        })),

    updatePricing: (field, value) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, [field]: value},
        })),

    calculateServiceFee: () =>
        set((state) => {
            const rent = parseFloat(state.accommodationDetails.Rent) || 0;
            const cleaningFee = parseFloat(state.accommodationDetails.CleaningFee) || 0;
            const serviceFee = (rent + cleaningFee) * 0.1;
            return {
                accommodationDetails: {...state.accommodationDetails, ServiceFee: serviceFee},
            };
        }),

    updateAvailability: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                availability: {...state.accommodationDetails.availability, [key]: value},
            },
        })),

    updateSelectedDates: (dates) =>
        set((state) => {
            if (!Array.isArray(dates) || !dates[0]?.startDate || !dates[0]?.endDate) {
                console.error("Invalid dates array or missing properties:", dates);
                return state;
            }
            const {startDate, endDate} = dates[0];
            const formattedDates = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
            return {
                accommodationDetails: {
                    ...state.accommodationDetails,
                    availability: {...state.accommodationDetails.availability, selectedDates: formattedDates},
                },
            };
        }),

    setRegistrationNumber: (registrationNumber) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, registrationNumber},
        })),

    markStepComplete: (step) =>
        set((state) => ({
            completedSteps: [...state.completedSteps, step],
        })),

    setOwnerId: (id) =>
        set((state) => ({
            accommodationDetails: {...state.accommodationDetails, ownerId: id},
        })),

    // New nested field updater
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

    /// unused resetAccommodationDetails
    resetAccommodationDetails: () =>
        set({
            accommodationDetails: {
                type: "",
                title: "",
                subtitle: "",
                guestAccessType: "",
                boatType: "",
                camperType: "",
                boatDetails: {country: "", city: "", harbor: ""},
                camperDetails: {country: "", city: "", street: "", zipCode: ""},
                address: {street: "", city: "", zipCode: "", country: ""},
                accommodationCapacity: {GuestAmount: 0, Cabins: 0, Bedrooms: 0, Bathrooms: 0, Beds: 0},
                selectedAmenities: {},
                houseRules: {
                    AllowSmoking: false, AllowPets: false, AllowParties: false,
                    CheckIn: {From: "00:00", Til: "00:00"},
                    CheckOut: {From: "00:00", Til: "00:00"},
                },
                images: {},
                description: "",
                boatSpecifications: {},
                camperSpecifications: {},
                Rent: "1",
                CleaningFee: "",
                ServiceFee: 0,
                Features: {ExtraServices: []},
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
            completedSteps: [],
        }),


}));


export default useFormStore;
