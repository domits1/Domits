import {create} from "zustand";
import AccommodationDTO from "../services/AccommodationDTO";
import {submitAccommodation} from "../services/hostonboardingApi";

const API_BASE_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

const useFormStore = create((set) => ({
    completedSteps: [], accommodationDetails: {
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
            AllowSmoking: false, AllowPets: false, AllowParties: false, CheckIn: {
                From: "00:00", Til: "00:00",
            }, CheckOut: {
                From: "00:00", Til: "00:00",
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
    }, setAccommodationType: (type) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, type: type,
        },
    })), setGuestAccessType: (accessType) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, guestAccessType: accessType,
        },
    })), setBoatType: (boatType) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, boatType: boatType,
        },
    })), setCamperType: (camperType) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, camperType: camperType,
        },
    })), setAddress: (details) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, address: {...state.accommodationDetails.address, ...details},
        },
    })), setBoatDetails: (details) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, boatDetails: {...state.accommodationDetails.boatDetails, ...details},
        },
    })), setCamperDetails: (details) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, camperDetails: {
                ...state.accommodationDetails.camperDetails, ...details,
            },
        },
    })), setAccommodationCapacity: (key, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, accommodationCapacity: {
                ...state.accommodationDetails.accommodationCapacity, [key]: value,
            },
        },
    })), setAmenities: (category, amenities) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, selectedAmenities: {
                ...state.accommodationDetails.selectedAmenities, [category]: amenities,
            },
        },
    })), setHouseRule: (rule, value, subKey) => set((state) => {
        const updatedHouseRules = {...state.accommodationDetails.houseRules};

        if (subKey) {
            updatedHouseRules[rule][subKey] = value;
        } else {
            updatedHouseRules[rule] = value;
        }

        return {
            accommodationDetails: {
                ...state.accommodationDetails, houseRules: updatedHouseRules,
            },
        };
    }), updateImage: (index, fileURL) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, images: {
                ...state.accommodationDetails.images, [`image${index + 1}`]: fileURL,
            },
        },
    })), deleteImage: (index) => set((state) => {
        const updatedImages = {...state.accommodationDetails.images};
        delete updatedImages[`image${index + 1}`];
        return {
            accommodationDetails: {
                ...state.accommodationDetails, images: updatedImages,
            },
        };
    }), updateAccommodationDetail: (key, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, [key]: value,
        },
    })), updateDescription: (value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, description: value,
        },
    })), updateBoatSpecification: (key, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, boatSpecifications: {
                ...state.accommodationDetails.boatSpecifications, [key]: value,
            },
        },
    })), updateCamperSpecification: (key, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, camperSpecifications: {
                ...state.accommodationDetails.camperSpecifications, [key]: value,
            },
        },
    })), updatePricing: (field, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, [field]: value,
        },
    })), calculateServiceFee: () => set((state) => {
        const rent = parseFloat(state.accommodationDetails.Rent) || 0;
        const cleaningFee = parseFloat(state.accommodationDetails.CleaningFee) || 0;
        const serviceFee = (rent + cleaningFee) * 0.1;
        return {
            accommodationDetails: {
                ...state.accommodationDetails, ServiceFee: serviceFee,
            },
        };
    }), updateAvailability: (key, value) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, availability: {
                ...state.accommodationDetails.availability, [key]: value,
            },
        },
    })), updateSelectedDates: (dates) => set((state) => {
        if (!Array.isArray(dates) || !dates[0]?.startDate || !dates[0]?.endDate) {
            console.error("Invalid dates array or missing properties:", dates);
            return state;
        }

        const {startDate, endDate} = dates[0];
        const formattedDates = {
            startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        };

        return {
            accommodationDetails: {
                ...state.accommodationDetails, availability: {
                    ...state.accommodationDetails.availability, selectedDates: formattedDates,
                },
            },
        };
    }), setRegistrationNumber: (registrationNumber) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, registrationNumber: registrationNumber,
        },
    })), markStepComplete: (step) => set((state) => ({
        completedSteps: [...state.completedSteps, step],
    })), setOwnerId: (id) => set((state) => ({
        accommodationDetails: {
            ...state.accommodationDetails, ownerId: id,
        },
    })), resetAccommodationDetails: () => set({
        accommodationDetails: {type: ""}, guestAccessType: "", boatType: "", camperType: "", boatDetails: {
            country: "", city: "", harbor: "",
        }, camperDetails: {
            country: "", city: "", street: "", zipCode: "",
        }, address: {
            street: "", city: "", zipCode: "", country: "",
        }, accommodationCapacity: {
            GuestAmount: 0, Cabins: 0, Bedrooms: 0, Bathrooms: 0, Beds: 0,
        }, availability: {
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
    }), submitAccommodation: async (navigate) => {
        const {accommodationDetails} = useFormStore.getState();

        const isBoat = accommodationDetails.type === "boat";
        const isCamper = accommodationDetails.type === "camper";

        const boatOrCamperSpecs = isBoat ? accommodationDetails.boatSpecifications : isCamper ? accommodationDetails.camperSpecifications : {};

        try {
            const newFormat = new AccommodationDTO({
                id: "0",
                hostId: "0",
                title: accommodationDetails.title,
                subtitle: accommodationDetails.subtitle,
                description: accommodationDetails.description,
                guestCapacity: accommodationDetails.accommodationCapacity?.GuestAmount || 1,
                registrationNumber: accommodationDetails.registrationNumber,
                status: "INACTIVE",
                propertyAmenities: [{amenityId: "1"}],
                propertyAvailability: [{
                    availableStartDate: 2042483993580, availableEndDate: 2142483993580,
                },],
                propertyAvailabilityRestrictions: [{
                    restriction: "MinimumStay", value: 5
                },], // TODO: remove hardcoded propertyCheckIn
                propertyCheckIn: {
                    checkIn: {from: 1, till: 5}, checkOut: {from: 5, till: 10},
                }, // GENERAL DETAILS
                propertyGeneralDetails: [{
                    detail: "Bathrooms", value: accommodationDetails.accommodationCapacity?.Bedrooms || 0,
                }, {
                    detail: "Bedrooms", value: accommodationDetails.accommodationCapacity?.Bedrooms || 0,
                }, {
                    detail: "Beds", value: accommodationDetails.accommodationCapacity?.Beds || 0,
                }, {
                    detail: "Guests", value: accommodationDetails.accommodationCapacity?.GuestAmount || 1,
                },],
                propertyLocation: {
                    country: "Dummy",
                    city: "Dummy",
                    street: "Dummy",
                    houseNumber: 1,
                    houseNumberExtension: "a",
                    postalCode: "0000AB",
                },
                propertyPricing: {
                    roomRate: accommodationDetails.Rent, cleaning: 0, service: 0,
                }, // TODO: remove hardcoded propertyrules
                propertyRules: [{
                    rule: "PetsAllowed", value: true,
                }, {
                    rule: "SmokingAllowed", value: true,
                }, {
                    rule: "PartiesEventsAllowed", value: false,
                },],
                propertyType: {
                    property_type: accommodationDetails.type, spaceType: "Full house",
                },
                propertyImages: [{
                    key: "images/1/1/Image-1.webp",
                },],
                propertyTechnicalDetails: {
                    length: 1,
                    height: 1,
                    fuelConsumption: 1,
                    speed: 1,
                    renovationYear: 2020,
                    transmission: "Manual",
                    generalPeriodicInspection: 2024,
                    fourWheelDrive: true,
                },
            });

            console.log(
                "Submitting accommodation data:",
                JSON.stringify(newFormat, null, 2),
            );

            const response = await submitAccommodation()
            /// THIS is the result of the form:
            //Remove this line if you don't want to log the response
            console.log("Accommodation uploaded successfully:", response.data);
            console.log("Testing formattedData:", newFormat);
            //Remove this line if you don't want to log the response
            if (response.data.statusCode === 200) {
                navigate("/hostdashboard");
            }
        } catch (error) {
            console.error("Error uploading accommodation:", error);
        }
    }
    ,
}));

export default useFormStore;
