import {create} from "zustand";
import {PropertyBuilder} from "../services/data/PropertyBuilder";

const API_BASE_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

// old using Zustand
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
    }),
}));

// new using builder
export async function getAccommodationDetails (navigate) {
    const {accommodationDetails} = useFormStore.getState();

    const isBoat = accommodationDetails.type === "boat";
    const isCamper = accommodationDetails.type === "camper";

    const boatOrCamperSpecs = isBoat ? accommodationDetails.boatSpecifications : isCamper ? accommodationDetails.camperSpecifications : {};

    try {
        const propertyDTO = new PropertyBuilder()
            .addProperty({
                title: accommodationDetails.title,
                subtitle: accommodationDetails.subtitle,
                description: accommodationDetails.description,
                livingArea: accommodationDetails.livingArea,
                numberOfBathrooms: accommodationDetails.numberOfBathrooms,
                numberOfRooms: accommodationDetails.numberOfRooms,
                numberOfBedrooms: accommodationDetails.numberOfBedrooms,
                numberOfSleepingSpots: accommodationDetails.numberOfSleepingSpots,
                floors: accommodationDetails.floors,
            })
            .addPropertyType(accommodationDetails.propertyType)
            .addRules([
                {
                    rule: "PetsAllowed",
                    value: accommodationDetails.houseRules.AllowPets,
                },
                {
                    rule: "SmokingAllowed",
                    value: accommodationDetails.houseRules.AllowSmoking,
                },
                {
                    rule: "PartiesEventsAllowed",
                    value: accommodationDetails.houseRules.AllowParties,
                },
            ])
            .addPricing({
                roomRate: accommodationDetails.Rent,
                cleaning: accommodationDetails.CleaningFee,
                service: accommodationDetails.ServiceFee,
            })
            .addTechnicalVehicleDetails({
                length: accommodationDetails.length,
                height: accommodationDetails.height,
                fuelConsumption: accommodationDetails.fuelConsumption,
                speed: accommodationDetails.speed,
                renovationYear: accommodationDetails.renovationYear,
                transmission: accommodationDetails.transmission,
                generalPeriodicInspection:
                accommodationDetails.generalPeriodicInspection,
                fourWheelDrive: accommodationDetails.fourWheelDrive,
            })
            .addLocation(accommodationDetails.location)
            .addImages(accommodationDetails.images)
            .addAvailability(accommodationDetails.availability)
            .addAvailabilityRestrictions(accommodationDetails.availabilityRestrictions)
            .addCheckIn({
                checkIn: accommodationDetails.checkIn,
                checkOut: accommodationDetails.checkOut,
            })
            .addAmenities(accommodationDetails.amenities)
            .addGeneralDetails(accommodationDetails.generalDetails).build();

        console.log(propertyDTO)
        return propertyDTO;
    } catch (error) {
        console.error("Error getting accommodation data:", error);
    }
}
export default useFormStore;
