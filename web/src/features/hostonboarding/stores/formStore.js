import { create } from "zustand";
import axios from "axios";

const API_BASE_URL = "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation";

const initialAccommodationDetails = {
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
    Rent: "180",
    CleaningFee: "",
    ServiceFee: 0,
    Features: { ExtraServices: [] },
    availability: { ExpirationTime: 72, MinimumStay: 1, MinimumBookingPeriod: 3, MaximumStay: 10, MinimumAdvancedReservation: 1, MaximumAdvancedReservation: 1, PaymentDeadlineAfterBooking: "24", PaymentDeadlineBeforeCheckIn: "36", selectedDates: [] },
    registrationNumber: "", ReservationsID: "", OwnerId: "",
    Drafted: true, bookedDates: [], category: "", rooms: 0,
};

const useFormStore = create((set, get) => ({
    completedSteps: [],
    accommodationDetails: { ...initialAccommodationDetails },

    setAccommodationType: (type) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, type: type },
        })),
    setGuestAccessType: (accessType) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, guestAccessType: accessType },
        })),
    setBoatType: (boatType) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, boatType: boatType },
        })),
    setCamperType: (camperType) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, camperType: camperType },
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
                camperDetails: { ...state.accommodationDetails.camperDetails, ...details },
            },
        })),
    setAccommodationCapacity: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                accommodationCapacity: { ...state.accommodationDetails.accommodationCapacity, [key]: value },
            },
        })),
    setAmenities: (category, amenities) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                selectedAmenities: { ...state.accommodationDetails.selectedAmenities, [category]: amenities },
            },
        })),
    setHouseRule: (rule, value, subKey) =>
        set((state) => {
            const updatedHouseRules = { ...state.accommodationDetails.houseRules };
            if (subKey && updatedHouseRules[rule]) {
                updatedHouseRules[rule] = { ...updatedHouseRules[rule], [subKey]: value };
            } else {
                updatedHouseRules[rule] = value;
            }
            return {
                accommodationDetails: { ...state.accommodationDetails, houseRules: updatedHouseRules },
            };
        }),
    updateImage: (index, fileURL) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                images: { ...state.accommodationDetails.images, [`image${index + 1}`]: fileURL },
            },
        })),
    deleteImage: (index) =>
        set((state) => {
            const updatedImages = { ...state.accommodationDetails.images };
            delete updatedImages[`image${index + 1}`];
            return {
                accommodationDetails: { ...state.accommodationDetails, images: updatedImages },
            };
        }),
    updateAccommodationDetail: (key, value) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, [key]: value },
        })),
    updateDescription: (value) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, description: value },
        })),
    updateBoatSpecification: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                boatSpecifications: { ...state.accommodationDetails.boatSpecifications, [key]: value },
            },
        })),
    updateCamperSpecification: (key, value) =>
        set((state) => ({
            accommodationDetails: {
                ...state.accommodationDetails,
                camperSpecifications: { ...state.accommodationDetails.camperSpecifications, [key]: value },
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
            const cleaningFee = parseFloat(state.accommodationDetails.CleaningFee) || 0;
            const serviceFee = (rent + cleaningFee) * 0.10;
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
                availability: { ...state.accommodationDetails.availability, [key]: value },
            },
        })),
    updateSelectedDates: (dates) =>
        set((state) => {
            if (!Array.isArray(dates) || !dates[0]?.startDate || !dates[0]?.endDate) {
                return state;
            }
            const { startDate, endDate } = dates[0];
            const formattedRange = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            };
            return {
                accommodationDetails: {
                    ...state.accommodationDetails,
                    availability: {
                        ...state.accommodationDetails.availability,
                        selectedDates: [formattedRange],
                    },
                },
            };
        }),
    setRegistrationNumber: (registrationNumber) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, registrationNumber: registrationNumber },
        })),
    markStepComplete: (step) =>
        set((state) => ({
            completedSteps: state.completedSteps.includes(step) ? state.completedSteps : [...state.completedSteps, step],
        })),
    setOwnerId: (id) =>
        set((state) => ({
            accommodationDetails: { ...state.accommodationDetails, ownerId: id },
        })),
    resetAccommodationDetails: () =>
        set({
            accommodationDetails: { ...initialAccommodationDetails },
            completedSteps: [],
        }),
    submitAccommodation: async (navigate) => {
        const { accommodationDetails } = get();
        const isBoat = accommodationDetails.type === "boat";
        const isCamper = accommodationDetails.type === "camper";
        const locationSource = isBoat
            ? accommodationDetails.boatDetails
            : isCamper
                ? accommodationDetails.camperDetails
                : accommodationDetails.address;
        const specifications = isBoat
            ? accommodationDetails.boatSpecifications
            : isCamper
                ? accommodationDetails.camperSpecifications
                : {};
        const safeParseFloat = (val) => parseFloat(val) || 0;
        const safeParseInt = (val, defaultVal = 0) => parseInt(val, 10) || defaultVal;

        try {
            const formattedData = {
                Title: accommodationDetails.title || "",
                Subtitle: accommodationDetails.subtitle || "",
                AccommodationType: accommodationDetails.type || "",
                AllowParties: accommodationDetails.houseRules?.AllowParties || false,
                AllowPets: accommodationDetails.houseRules?.AllowPets || false,
                AllowSmoking: accommodationDetails.houseRules?.AllowSmoking || false,
                Availability: accommodationDetails.availability || {},
                Bathrooms: safeParseInt(accommodationDetails.accommodationCapacity?.Bathrooms),
                Bedrooms: safeParseInt(accommodationDetails.accommodationCapacity?.Bedrooms),
                Beds: safeParseInt(accommodationDetails.accommodationCapacity?.Beds),
                BookedDates: accommodationDetails.bookedDates || [],
                Cabins: safeParseInt(accommodationDetails.accommodationCapacity?.Cabins),
                Capacity: safeParseInt(accommodationDetails.accommodationCapacity?.GuestAmount),
                Category: accommodationDetails.category || "",
                CheckIn: accommodationDetails.houseRules?.CheckIn || { From: "00:00", Til: "00:00" },
                CheckOut: accommodationDetails.houseRules?.CheckOut || { From: "00:00", Til: "00:00" },
                CleaningFee: safeParseFloat(accommodationDetails.CleaningFee),
                CreatedAt: new Date().toISOString(),
                Description: accommodationDetails.description || "",
                Drafted: accommodationDetails.Drafted !== undefined ? accommodationDetails.Drafted : true,
                Features: accommodationDetails.Features || { ExtraServices: [] },
                GuestAccess: accommodationDetails.guestAccessType || "",
                Images: Object.values(accommodationDetails.images || {}),
                OwnerId: accommodationDetails.ownerId || "",
                PaymentAfterBookingHours: safeParseInt(accommodationDetails.availability?.PaymentDeadlineAfterBooking, 24),
                PaymentBeforeCheckInHours: safeParseInt(accommodationDetails.availability?.PaymentDeadlineBeforeCheckIn, 36),
                RegistrationNumber: accommodationDetails.registrationNumber || "",
                Rent: safeParseFloat(accommodationDetails.Rent),
                ReservationExpirationTime: safeParseInt(accommodationDetails.availability?.ExpirationTime, 72),
                Rooms: safeParseInt(accommodationDetails.rooms),
                ServiceFee: safeParseFloat(accommodationDetails.ServiceFee),
                UpdatedAt: new Date().toISOString(),
                Country: locationSource?.country || "",
                City: locationSource?.city || "",
                Latitude: locationSource?.latitude ?? null,
                Longitude: locationSource?.longitude ?? null,
                Harbor: isBoat ? (locationSource?.harbor || "") : undefined,
                Street: !isBoat ? (locationSource?.street || "") : undefined,
                PostalCode: !isBoat ? (locationSource?.zipCode || "") : undefined,
                FuelTank: safeParseFloat(specifications?.FuelTank),
                FWD: specifications?.FWD || false,
                GPI: specifications?.GPI || "",
                HasLicense: specifications?.HasLicense || false,
                Height: safeParseFloat(specifications?.Height),
                IsPro: specifications?.IsPro || false,
                Length: safeParseFloat(specifications?.Length),
                LicensePlate: isCamper ? (specifications?.LicensePlate || "") : undefined,
                Manufacturer: specifications?.Manufacturer || "",
                MinimumAdvancedReservation: safeParseInt(accommodationDetails.availability?.MinimumAdvancedReservation, 1),
                MinimumBookingPeriod: safeParseInt(accommodationDetails.availability?.MinimumBookingPeriod, 3),
                MaximumStay: safeParseInt(accommodationDetails.availability?.MaximumStay, 10),
                MinimumStay: safeParseInt(accommodationDetails.availability?.MinimumStay, 1),
                Model: specifications?.Model || "",
                RentedWithSkipper: isBoat ? (specifications?.RentedWithSkipper || false) : undefined,
                Requirement: specifications?.Requirement || "",
                SelfBuilt: isCamper ? (specifications?.SelfBuilt || false) : undefined,
                Speed: safeParseFloat(specifications?.Speed),
                Transmission: isCamper ? (specifications?.Transmission || "") : undefined,
                YOC: safeParseInt(specifications?.YOC),
                SelectedDates: accommodationDetails.availability?.selectedDates || [],
            };

            const response = await axios.post(API_BASE_URL, formattedData, {
                headers: { "Content-Type": "application/json" },
            });

            if (response.status >= 200 && response.status < 300) {
                navigate("/hostdashboard");
            } else {
                alert(`Submission failed: ${response.data?.message || 'Unknown error'}`);
            }
        } catch (error) {
            alert(`Error uploading accommodation: ${error.response?.data?.message || error.message || 'Please try again.'}`);
        }
    },
}));

export default useFormStore;