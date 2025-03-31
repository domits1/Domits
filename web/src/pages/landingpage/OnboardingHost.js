import {useEffect, useMemo, useState} from "react";
import {renderHostOnBoarding} from "./views/RenderHostOnBoarding";
import {useLocation, useNavigate} from "react-router-dom";
import "./styles/onboardingHost.css";
import countryList from "react-select-country-list";
import {Auth, Storage} from "aws-amplify";
import Apartment from "../../images/icons/flat.png";
import House from "../../images/icons/house.png";
import Villa from "../../images/icons/mansion.png";
import Boat from "../../images/icons/house-boat.png";
import Camper from "../../images/icons/camper-van.png";
import Cottage from "../../images/icons/cottage.png";
import Motorboat from "../../images/boat_types/motorboat.png";
import Sailboat from "../../images/boat_types/sailboat.png";
import RIB from "../../images/boat_types/rib.png";
import Catamaran from "../../images/boat_types/catamaran.png";
import Yacht from "../../images/boat_types/yacht.png";
import Barge from "../../images/boat_types/barge.png";
import HouseBoat from "../../images/boat_types/house_boat.png";
import JetSki from "../../images/boat_types/jetski.png";
import ElectricBoat from "../../images/boat_types/electric-boat.png";
import BoatWithoutLicense from "../../images/boat_types/boat-without-license.png";
import imageCompression from "browser-image-compression";

const S3_BUCKET_NAME = "accommodation";
const region = "eu-north-1";

function OnboardingHost() {
    const navigate = useNavigate();
    const options = useMemo(() => countryList().getLabels(), []);
    const [isNew, setIsNew] = useState(true);
    const [oldAccoID, setOldAccoID] = useState("");
    const {search} = useLocation();
    const searchParams = new URLSearchParams(search);
    const accommodationID = searchParams.get("ID");
    const [location, setLocation] = useState({
        latitude: 0,
        longitude: 0,
    });
    const [hasAccoType, setHasAccoType] = useState(false);
    const [hasGuestAccess, setHasGuestAccess] = useState(false);
    const [isDeclarationChecked, setDeclarationChecked] = useState(false);
    const [isTermsChecked, setTermsChecked] = useState(false);
    const [hasAddress, setHasAddress] = useState(false);
    const [hasSpecs, setHasSpecs] = useState(false);
    const [updatedIndex, setUpdatedIndex] = useState([]);

    useEffect(() => {
        const fetchAccommodation = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ID: accommodationID}),
                    },
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch accommodation data");
                }

                const responseData = await response.json();
                const data = JSON.parse(responseData.body);

                if (!data.hasOwnProperty("CleaningFee")) {
                    data.CleaningFee = 1;
                }

                setFormData(data);
            } catch (error) {
                console.error("Error fetching accommodation data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isNew && accommodationID) {
            fetchAccommodation();
        } else {
            setIsLoading(false);
        }
    }, [isNew, accommodationID]);

    function generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            },
        );
    }

    let [userId, setUserId] = useState(null);
    const [hasStripe, setHostStripe] = useState(false);
    const [accoTypes] = useState([
        "Apartment",
        "House",
        "Villa",
        "Boat",
        "Camper",
        "Cottage",
    ]);
    const [boatTypes] = useState([
        "Motorboat",
        "Sailboat",
        "RIB",
        "Catamaran",
        "Yacht",
        "Barge",
        "House boat",
        "Jet ski",
        "Electric boat",
        "Boat without license",
    ]);
    const [camperTypes] = useState([
        "Campervan",
        "Sprinter-Type",
        "Cabover Motorhome",
        "Semi-integrated Motorhome",
        "Integrated Motorhome",
        "Roof Tent",
        "Other",
    ]);
    const [camperCategories] = useState([
        "Adventure",
        "Classic",
        "Compact",
        "Family",
    ]);
    const [licenseTypes] = useState(["B", "C1", "C", "D1", "D"]);

    const accommodationIcons = {
        Apartment: Apartment,
        House: House,
        Villa: Villa,
        Boat: Boat,
        Camper: Camper,
        Cottage: Cottage,
    };
    const boatIcons = {
        Motorboat: Motorboat,
        Sailboat: Sailboat,
        RIB: RIB,
        Catamaran: Catamaran,
        Yacht: Yacht,
        Barge: Barge,
        "House boat": HouseBoat,
        "Jet ski": JetSki,
        "Electric boat": ElectricBoat,
        "Boat without license": BoatWithoutLicense,
    };
    const [formData, setFormData] = useState({});
    const [selectedAccoType, setSelectedAccoType] = useState("");
    const [selectedBoatType, setSelectedBoatType] = useState("");
    const [selectedCamperType, setSelectedCamperType] = useState("");

    useEffect(() => {
        if (formData.GuestAccess) {
            setSelectedBoatType(formData.GuestAccess);
        }
    }, [formData.GuestAccess]);

    useEffect(() => {
        if (formData.GuestAccess) {
            setSelectedCamperType(formData.GuestAccess);
        }
    }, [formData.GuestAccess]);

    useEffect(() => {
        Auth.currentUserInfo()
            .then((user) => {
                if (user) {
                    setUserId(user.attributes.sub);
                    if (accommodationID) {
                        setOldAccoID(accommodationID);
                        setIsNew(false);
                    }
                } else {
                    navigate("/login");
                }
            })
            .catch((error) => {
                console.error("Error setting user id:", error);
                navigate("/login");
            });
    }, [navigate]);

    useEffect(() => {
        const checkHostStripeAcc = async (hostID) => {
            try {
                const response = await fetch(
                    `https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`,
                    {
                        method: "POST",
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                        },
                        body: JSON.stringify({sub: hostID}),
                    },
                );
                const data = await response.json();
                const parsedBody = JSON.parse(data.body);

                if (parsedBody.hasStripeAccount) {
                    setHostStripe(true);
                }
            } catch (error) {
                console.error("Error fetching user data or Stripe status:", error);
            }
        };
        checkHostStripeAcc(userId);
    }, [userId]);

    const [page, setPage] = useState(0);

    const generateCommonFormData = (existingData = {}, isNew = true) => ({
        ID: isNew ? generateUUID() : existingData.ID,
        Title: existingData.Title || "",
        Subtitle: existingData.Subtitle || "",
        Description: existingData.Description || "",
        Rent: existingData.Rent || 1,
        Country: existingData.Country || "",
        City: existingData.City || "",
        Features: existingData.Features || {},
        Essentials: [],
        Kitchen: [],
        Bathroom: [],
        Bedroom: [],
        LivingArea: [],
        Technology: [],
        Safety: [],
        Outdoor: [],
        FamilyFriendly: [],
        Laundry: [],
        Convenience: [],
        Accessibility: [],
        ExtraServices: [],
        EcoFriendly: [],
        AllowSmoking: existingData.AllowSmoking || false,
        AllowPets: existingData.AllowPets || false,
        AllowParties: existingData.AllowParties || false,
        CheckIn: existingData.CheckIn || {
            From: "",
            Til: "",
        },
        CheckOut: existingData.CheckOut || {
            From: "",
            Til: "",
        },
        Images: existingData.Images || {
            image1: "",
            image2: "",
            image3: "",
            image4: "",
            image5: "",
        },
        DateRanges: existingData.DateRanges || [],
        Drafted: existingData.Drafted || true,
        AccommodationType: existingData.AccommodationType || "",
        ServiceFee: existingData.ServiceFee || 0,
        CleaningFee: existingData.CleaningFee || 0,
        OwnerId: existingData.OwnerId || userId,
        GuestAmount: isNew ? 0 : formData.GuestAmount,
        MinimumStay: isNew
            ? 0
            : Number.isFinite(existingData.MinimumStay)
                ? existingData.MinimumStay
                : 0,
        MinimumAdvanceReservation: isNew
            ? 0
            : Number.isFinite(existingData.MinimumAdvanceReservation)
                ? existingData.MinimumAdvanceReservation
                : 0,
        MaximumStay: isNew
            ? 0
            : Number.isFinite(existingData.MaximumStay)
                ? existingData.MaximumStay
                : 0,
        MaximumAdvanceReservation: isNew
            ? 0
            : Number.isFinite(existingData.MaximumAdvanceReservation)
                ? existingData.MaximumAdvanceReservation
                : 0,
    });

    const generateNormalAccommodationFormData = () => ({
        ...generateCommonFormData(formData, isNew),
        Bedrooms: isNew ? 0 : formData.Bedrooms,
        PostalCode: isNew ? "" : formData.PostalCode,
        Street: isNew ? "" : formData.Street,
        Bathrooms: isNew ? 0 : formData.Bathrooms,
        Beds: isNew ? 0 : formData.Beds,
        GuestAccess: isNew ? "" : formData.GuestAccess,
        GuestAmount: isNew ? 0 : formData.GuestAmount,
    });

    const generateBoatFormData = () => ({
        ...generateCommonFormData(formData, isNew),
        Harbour: isNew ? "" : formData.Harbour,
        Cabins: isNew ? 0 : formData.Cabins,
        Bathrooms: isNew ? 0 : formData.Bathrooms,
        Beds: isNew ? 0 : formData.Beds,
        isPro: isNew ? false : formData.isPro,
        Manufacturer: isNew ? "" : formData.Manufacturer,
        Model: isNew ? "" : formData.Model,
        RentedWithSkipper: isNew ? false : formData.RentedWithSkipper,
        HasLicense: isNew ? false : formData.HasLicense,
        GPI: isNew ? "" : formData.GPI,
        Capacity: isNew ? "" : formData.Capacity,
        Length: isNew ? "" : formData.Length,
        FuelTank: isNew ? "" : formData.FuelTank,
        Speed: isNew ? "" : formData.Speed,
        YOC: isNew ? "" : formData.YOC,
        Renovated: isNew ? "" : formData.Renovated,
        Features: {
            ...generateCommonFormData(formData).Features,
            Outdoor: isNew ? [] : formData.Features?.Outdoor || [],
            NavigationEquipment: isNew
                ? []
                : formData.Features?.NavigationEquipment || [],
            LeisureActivities: isNew
                ? []
                : formData.Features?.LeisureActivities || [],
            WaterSports: isNew ? [] : formData.Features?.WaterSports || [],
        },
    });
    const generateCamperFormData = () => ({
        ...generateCommonFormData(formData, isNew),
        Bedrooms: isNew ? 0 : formData.Bedrooms,
        PostalCode: isNew ? "" : formData.PostalCode,
        Street: isNew ? "" : formData.Street,
        Bathrooms: isNew ? 0 : formData.Bathrooms,
        Beds: isNew ? 0 : formData.Beds,
        LicensePlate: isNew ? "" : formData.LicensePlate,
        Category: isNew ? "" : formData.Category,
        CamperBrand: isNew ? "" : formData.CamperBrand,
        Model: isNew ? "" : formData.Model,
        Requirement: isNew ? "" : formData.Requirement,
        GPI: isNew ? "" : formData.GPI,
        Length: isNew ? "" : formData.Length,
        Height: isNew ? "" : formData.Height,
        Transmission: isNew ? "" : formData.Transmission,
        FuelTank: isNew ? "" : formData.FuelTank,
        YOC: isNew ? "" : formData.YOC,
        Renovated: isNew ? "" : formData.Renovated,
        FWD: isNew ? false : formData.FWD,
        SelfBuilt: isNew ? false : formData.SelfBuilt,
        Features: {
            ...generateCommonFormData(formData).Features,
            Vehicle: isNew ? [] : formData.Features?.Vehicle || [],
            Outdoor: isNew ? [] : formData.Features?.Outdoor || [],
            NavigationEquipment: isNew
                ? []
                : formData.Features?.NavigationEquipment || [],
            LeisureActivities: isNew
                ? []
                : formData.Features?.LeisureActivities || [],
            WaterSports: isNew ? [] : formData.Features?.WaterSports || [],
        },
    });

    const allAmenities = {
        Essentials: [
            "Wi-Fi",
            "Air conditioning",
            "Heating",
            "TV with cable/satellite",
            "Hot water",
            "Towels",
            "Bed linens",
            "Extra pillows and blankets",
            "Toilet paper",
            "Soap and shampoo",
        ],
        Kitchen: [
            "Refrigerator",
            "Microwave",
            "Oven",
            "Stove",
            "Dishwasher",
            "Coffee maker",
            "Toaster",
            "Basic cooking essentials",
            "Dishes and silverware",
            "Glasses and mugs",
            "Cutting board and knives",
            "Blender",
            "Kettle",
        ],
        Bathroom: [
            "Hair dryer",
            "Shower gel",
            "Conditioner",
            "Body lotion",
            "First aid kit",
        ],
        Bedroom: [
            "Hangers",
            "Iron and ironing board",
            "Closet/drawers",
            "Alarm clock",
        ],
        LivingArea: [
            "Sofa",
            "Armchairs",
            "Coffee table",
            "Books and magazines",
            "Board games",
        ],
        Technology: [
            "Smart TV",
            "Streaming services",
            "Bluetooth speaker",
            "Universal chargers",
            "Work desk and chair",
        ],
        Safety: [
            "Smoke detector",
            "Carbon monoxide detector",
            "Fire extinguisher",
            "Lock on bedroom door",
        ],
        FamilyFriendly: [
            "High chair",
            "Crib",
            "Children’s books and toys",
            "Baby safety gates",
            "Baby bath",
            "Baby monitor",
        ],
        Laundry: ["Washer and dryer", "Laundry detergent", "Clothes drying rack"],
        Convenience: [
            "Keyless entry",
            "Self-check-in",
            "Local maps and guides",
            "Luggage drop-off allowed",
            "Parking space",
            "EV charger",
        ],
        Accessibility: [
            "Step-free access",
            "Wide doorways",
            "Accessible-height bed",
            "Accessible-height toilet",
            "Shower chair",
        ],
        ExtraServices: [
            "Cleaning service (add service fee manually)",
            "Concierge service",
            "Housekeeping",
            "Grocery delivery",
            "Airport shuttle",
            "Private chef",
            "Personal trainer",
            "Massage therapist",
        ],
        EcoFriendly: [
            "Recycling bins",
            "Energy-efficient appliances",
            "Solar panels",
            "Composting bin",
        ],
        Outdoor: [
            "Patio or balcony",
            "Outdoor furniture",
            "Grill",
            "Fire pit",
            "Pool",
            "Hot tub",
            "Garden or backyard",
            "Bicycle",
        ],
    };
    const boatAmenities = {
        ...allAmenities,
        Outdoor: [
            ...allAmenities.Outdoor,
            "Bimini",
            "Outdoor shower",
            "External table",
            "External speakers",
            "Teak deck",
            "Bow sundeck",
            "Aft sundeck",
            "Bathing Platform",
            "Bathing ladder",
        ],
        NavigationalEquipment: [
            "Bow thruster",
            "Electric windlass",
            "Autopilot",
            "GPS",
            "Depth sounder",
            "VHF",
            "Guides & Maps",
        ],
        LeisureActivities: [
            "Snorkeling equipment",
            "Fishing equipment",
            "Diving equipment",
        ],
        WaterSports: [
            "Water skis",
            "Monoski",
            "Wakeboard",
            "Towable Tube",
            "Inflatable banana",
            "Kneeboard",
        ],
    };
    const camperAmenities = {
        ...allAmenities,
        FamilyFriendly: [...allAmenities.FamilyFriendly, "Baby seat"],
        Outdoor: [
            ...allAmenities.Outdoor,
            "Outdoor shower",
            "External table and chairs",
            "External speakers",
        ],
        Vehicle: [
            "Bicycle carrier",
            "Reversing camera",
            "Airbags",
            "Cruise control",
            "Imperial",
            "Navigation",
            "Awning",
            "Parking sensors",
            "Power steering",
            "Tow bar",
            "Snow chains",
            "Winter tires",
        ],
    };
    const [typeAmenities, setTypeAmenities] = useState({});
    useEffect(() => {
        const getInitialFormData = (accoType) => {
            switch (accoType) {
                case "Boat":
                    setFormData(generateBoatFormData);
                    setTypeAmenities(boatAmenities);
                    return;
                case "Camper":
                    setFormData(generateCamperFormData);
                    setTypeAmenities(camperAmenities);
                    return;
                default:
                    setFormData(generateNormalAccommodationFormData);
                    setTypeAmenities(allAmenities);
                    return;
            }
        };
        getInitialFormData(selectedAccoType);
    }, [selectedAccoType]);
    useEffect(() => {
        if (formData.AccommodationType) {
            setSelectedAccoType(formData.AccommodationType);
        }
    }, [formData.AccommodationType]);

    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const hasImages = () => {
        for (const imageKey in formData.Images) {
            if (formData.Images[imageKey] === "") {
                return false;
            }
        }
        return true;
    };
    const separatePascalCase = (str) => {
        return str.replace(/([A-Z])/g, " $1").trim();
    };
    useEffect(() => {
        if (formData.AccommodationType) setHasAccoType(true);
        if (formData.GuestAccess) setHasGuestAccess(true);
        switch (selectedAccoType) {
            case "Boat":
                setHasAddress(
                    !!(formData.Country && formData.City && formData.Harbour),
                );
                setHasSpecs(
                    !!(
                        formData.Manufacturer &&
                        formData.Model &&
                        formData.GPI &&
                        formData.Capacity &&
                        formData.Length &&
                        formData.FuelTank &&
                        formData.Speed &&
                        formData.YOC
                    ),
                );
                break;
            case "Camper":
                setHasAddress(
                    !!(
                        formData.Country &&
                        formData.City &&
                        formData.PostalCode &&
                        formData.Street
                    ),
                );
                setHasSpecs(
                    !!(
                        formData.Category &&
                        formData.LicensePlate &&
                        formData.CamperBrand &&
                        formData.Model &&
                        formData.Requirement &&
                        formData.GPI &&
                        formData.Height &&
                        formData.Length &&
                        formData.FuelTank &&
                        formData.Transmission &&
                        formData.YOC
                    ),
                );
                break;
            default:
                setHasAddress(
                    !!(
                        formData.Country &&
                        formData.City &&
                        formData.PostalCode &&
                        formData.Street
                    ),
                );
                break;
        }
    }, [formData]);

    const calculateServiceFee = () => {
        const rent = parseFloat(formData.Rent);
        if (isNaN(rent)) {
            return 0;
        } else {
            return rent * 0.15;
        }
    };

    useEffect(() => {
        const fee = calculateServiceFee();
        setFormData((prevData) => ({
            ...prevData,
            ServiceFee: fee,
        }));
    }, [formData.Rent]);

    useEffect(() => {
        const appendUserId = () => {
            setFormData((prevData) => ({
                ...prevData,
                OwnerId: userId,
            }));
        };
        appendUserId();
    }, [userId]);

    const handleLocationChange = async (Country, City, PostalCode, Street) => {
        const address = `${Country} ${City} ${Street} ${PostalCode}`;
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    address,
                )}&key=AIzaSyDsc4bZSQfuPkpluzSPfT5eYnVRzPWD-ow`,
            );

            if (!response.ok) {
                throw new Error("Failed to fetch geocoding data");
            }
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                setLocation({
                    latitude: location.lat,
                    longitude: location.lng,
                });
            } else {
                console.error("No results found for the provided address");
            }
        } catch (error) {
            console.error("Error fetching geocoding data:", error);
        }
    };

    const changeAccoType = (accommodationType) => {
        setFormData((prevData) => ({
            ...prevData,
            AccommodationType: accommodationType,
        }));
    };
    const changeGuestAccess = (option) => {
        if (selectedAccoType === "Boat") {
            setSelectedBoatType(option);
        } else if (selectedAccoType === "Camper") {
            setSelectedCamperType(option);
        } else {
            setFormData((prev) => ({...prev, GuestAccess: option}));
        }
    };
    useEffect(() => {
        if (selectedBoatType) {
            setFormData((prev) => ({...prev, GuestAccess: selectedBoatType}));
        }
    }, [selectedBoatType]);
    useEffect(() => {
        if (selectedCamperType) {
            setFormData((prev) => ({...prev, GuestAccess: selectedCamperType}));
        }
    }, [selectedCamperType]);
    const changeCamperCategory = (category) => {
        setFormData((prevData) => ({
            ...prevData,
            Category: category,
        }));
    };

    const resetCleaningFee = () => {
        if (
            !formData.Features.ExtraServices.includes(
                "Cleaning service (add service fee manually)",
            )
        ) {
            setFormData((prevData) => ({
                ...prevData,
                CleaningFee: 0,
            }));
        }
    };

    const incrementAmount = (field) => {
        setFormData((prevData) => ({
            ...prevData,
            [field]: prevData[field] + 1,
        }));
    };

    const decrementAmount = (field) => {
        if (formData[field] > 0) {
            setFormData((prevData) => ({
                ...prevData,
                [field]: prevData[field] - 1,
            }));
        }
    };

    const setDrafted = (value) => {
        setFormData((prevData) => ({
            ...prevData,
            Drafted: value,
        }));
    };

    const handleAmenities = (category, amenity, checked) => {
        setFormData((prevFormData) => {
            const updatedFeatures = {...prevFormData.Features};

            if (amenity === "Cleaning service (add service fee manually)") {
                resetCleaningFee();
            }

            if (!Array.isArray(updatedFeatures[category])) {
                updatedFeatures[category] = [];
            }
            if (checked) {
                updatedFeatures[category] = [...updatedFeatures[category], amenity];
            } else {
                updatedFeatures[category] = updatedFeatures[category].filter(
                    (item) => item !== amenity,
                );
            }

            return {
                ...prevFormData,
                Features: updatedFeatures,
            };
        });
    };
    const handleCheckBoxChange = (event) => {
        const {name, type, checked, value} = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: checked,
        }));
    };

    const handleHouseRulesChange = (field, value, subField = null) => {
        if (subField) {
            setFormData((prevData) => ({
                ...prevData,
                [field]: {
                    ...prevData[field],
                    [subField]: value,
                },
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [field]: value,
            }));
        }
    };

    const handleInputChange = (event) => {
        const {name, type, checked, value} = event.target;

        if (type === "checkbox") {
            setFormData((prevData) => ({
                ...prevData,
                Features: {
                    ...prevData.Features,
                    [name]: checked,
                },
                SystemConfiguration: {
                    ...prevData.SystemConfiguration,
                    [name]: checked,
                },
            }));
        } else if (type === "radio") {
            setFormData((prevData) => ({
                ...prevData,
                [name]: !prevData[name],
            }));
        } else if (type === "number" || type === "range") {
            let newValue = parseFloat(value);

            if (name === "Rent") {
                if (newValue > 150000) {
                    newValue = 150000;
                } else if (newValue < 1) {
                    newValue = 1;
                }
            }

            setFormData((prevData) => ({
                ...prevData,
                [name]: newValue || "",
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));

            if (name === "City") {
                handleLocationChange(
                    formData.Country,
                    value,
                    formData.PostalCode,
                    formData.Street,
                );
            } else if (name === "PostalCode") {
                handleLocationChange(
                    formData.Country,
                    formData.City,
                    value,
                    formData.Street,
                );
            } else if (name === "Street") {
                handleLocationChange(
                    formData.Country,
                    formData.City,
                    formData.PostalCode,
                    value,
                );
            }
        }
    };

    const handleInputRestrictions = (event) => {
        const input = event.target;

        if (input.value.length > 6) {
            input.value = input.value.slice(0, 6);
        }

        if (parseFloat(input.value) > 100000) {
            input.value = 100000;
        }
    };

    const handleCountryChange = (selectedOption) => {
        setFormData((currentFormData) => ({
            ...currentFormData,
            Country: selectedOption.value,
        }));
        handleLocationChange(
            selectedOption.value,
            formData.City,
            formData.PostalCode,
            formData.Street,
        );
    };

    const setLicenseRequirement = (selectedOption) => {
        setFormData((currentFormData) => ({
            ...currentFormData,
            Requirement: selectedOption.value,
        }));
    };

    const constructURL = (userId, accommodationId, index, size = "") => {
        const folder = size ? `${size}/` : "";
        return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/images/${userId}/${accommodationId}/${folder}Image-${index + 1}.webp`;
    };

    const uploadImagesInDifferentSizes = async (
        file,
        userId,
        accommodationId,
        index,
    ) => {
        const sizes = {
            mobile: {maxWidthOrHeight: 300, maxSizeMB: 0.1, quality: 0.85}, // Higher compression for mobile ~100kb
            homepage: {maxWidthOrHeight: 800, maxSizeMB: 0.3, quality: 0.9}, // Balanced quality for homepage ~200kb
            detail: {maxWidthOrHeight: 1200, maxSizeMB: 0.5, quality: 0.95}, // Priority on quality for detail ~500kb
        };

        for (const [key, sizeOptions] of Object.entries(sizes)) {
            try {
                console.log(`Uploading image for size: ${key}, index: ${index}`);

                const compressedFile = await imageCompression(file, {
                    ...sizeOptions,
                    fileType: "image/webp",
                    initialQuality: sizeOptions.quality,
                });

                const keyPath = `images/${userId}/${accommodationId}/${key}/Image-${index + 1}.webp`;

                await Storage.put(keyPath, compressedFile, {
                    bucket: S3_BUCKET_NAME,
                    region: region,
                    contentType: "image/webp",
                    level: "public",
                    customPrefix: {public: ""},
                });
            } catch (error) {
                console.error(`Error uploading ${key} image:`, error);
            }
        }
    };

    const removeImageFromS3 = async (userId, accommodationId, index) => {
        const folders = ["", "mobile", "homepage", "detail"];

        for (const folder of folders) {
            const key = folder
                ? `images/${userId}/${accommodationId}/${folder}/Image-${index + 1}.webp`
                : `images/${userId}/${accommodationId}/Image-${index + 1}.webp`;

            try {
                await Storage.remove(key, {
                    bucket: S3_BUCKET_NAME,
                    region: region,
                    level: "public",
                    customPrefix: {public: ""},
                });
                console.log(`Deleted ${key} successfully`);
            } catch (err) {
                console.error(`Failed to remove ${key}:`, err);
            }
        }
    };
    const handleUpdate = async () => {
        try {
            setIsLoading(true);
            const AccoID = formData.ID;
            const updatedFormData = {...formData};

            for (let i = 0; i < updatedIndex.length; i++) {
                const index = updatedIndex[i];
                await removeImageFromS3(userId, AccoID, index);
            }

            for (let i = 0; i < updatedIndex.length; i++) {
                const index = updatedIndex[i];
                const file = imageFiles[index];
                if (file) {
                    await uploadImagesInDifferentSizes(file, userId, AccoID, index);
                    updatedFormData.Images[`image${index + 1}`] = constructURL(
                        userId,
                        AccoID,
                        index,
                        "mobile",
                    );
                    updatedFormData.Images[`image${index + 1}`] = constructURL(
                        userId,
                        AccoID,
                        index,
                        "homepage",
                    );
                    updatedFormData.Images[`image${index + 1}`] = constructURL(
                        userId,
                        AccoID,
                        index,
                        "detail",
                    );
                }
            }

            const response = await fetch(
                "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/EditAccommodation",
                {
                    method: "PUT",
                    body: JSON.stringify(updatedFormData),
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            if (response.ok) {
                console.log("Accommodation updated successfully");
            } else {
                console.error("Error updating accommodation");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            const AccoID = formData.ID;
            const updatedFormData = {...formData};

            // Upload images and generate URLs
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                if (file) {
                    await uploadImagesInDifferentSizes(file, userId, AccoID, i);
                    updatedFormData.Images[`image${i + 1}`] = constructURL(
                        userId,
                        AccoID,
                        i,
                        "mobile",
                    );

                    updatedFormData.Images[`image${i + 1}`] = constructURL(
                        userId,
                        AccoID,
                        i,
                        "homepage",
                    );
                    updatedFormData.Images[`image${i + 1}`] = constructURL(
                        userId,
                        AccoID,
                        i,
                        "detail",
                    );
                }
            }

            await setFormData(updatedFormData);
            setImageFiles([]);

            const endpoint = isNew ? "CreateAccomodation" : "EditAccommodation";
            const method = isNew ? "POST" : "PUT";

            const response = await fetch(
                {
                    method,
                    body: JSON.stringify(updatedFormData),
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            )

            if (response.ok) {
                console.log(
                    isNew
                        ? "Accommodation created successfully"
                        : "Accommodation updated successfully",
                );
            } else {
                console.error("Error saving form data");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const [imageFiles, setImageFiles] = useState(
        Array.from({length: 5}, () => null),
    );

    const handleFileChange = async (file, index) => {
        if (file) {
            const newImageFiles = [...imageFiles];
            newImageFiles[index] = file;
            setImageFiles(newImageFiles);

            await uploadImagesInDifferentSizes(file, userId, formData.ID, index);

            const updatedFormData = {...formData};
            updatedFormData.Images[`image${index + 1}`] = constructURL(
                userId,
                formData.ID,
                index,
                "mobile",
            );
            updatedFormData.Images[`image${index + 1}`] = constructURL(
                userId,
                formData.ID,
                index,
                "homepage",
            );
            updatedFormData.Images[`image${index + 1}`] = constructURL(
                userId,
                formData.ID,
                index,
                "detail",
            );
            setFormData(updatedFormData);
        }
    };

    const handleDelete = async (index) => {
        const newImageFiles = [...imageFiles];
        newImageFiles[index] = null;
        setImageFiles(newImageFiles);

        const updatedFormData = {...formData};
        const key = `Image-${index + 1}`;
        updatedFormData.Images[key] = "";
        setFormData(updatedFormData);

        if (!updatedIndex.includes(index)) {
            setUpdatedIndex((prevUpdatedIndex) => [...prevUpdatedIndex, index]);
        }

        try {
            // Verwijder de afbeelding ook uit S3
            await removeImageFromS3(userId, formData.ID, index);
            console.log(`Image ${index + 1} successfully deleted from S3`);
        } catch (error) {
            console.error(`Failed to delete image ${index + 1} from S3:`, error);
        }
    };

    const updateDates = (dateRanges) => {
        if (dateRanges !== formData.DateRanges) {
            setFormData({
                ...formData,
                DateRanges: dateRanges,
            });
        }
    };

    const [isLoading, setIsLoading] = useState(true);
    const renderPageContent = renderHostOnBoarding(isLoading, isNew, accoTypes, selectedAccoType, changeAccoType, accommodationIcons, navigate, hasAccoType, pageUpdater, boatTypes, selectedBoatType, changeGuestAccess, boatIcons, camperTypes, selectedCamperType, formData, hasGuestAccess, options, handleCountryChange, handleInputChange, hasAddress, decrementAmount, incrementAmount, typeAmenities, allAmenities, separatePascalCase, handleAmenities, handleHouseRulesChange, handleFileChange, handleDelete, hasImages, camperCategories, changeCamperCategory, licenseTypes, setLicenseRequirement, handleCheckBoxChange, hasSpecs, handleInputRestrictions, updateDates, setFormData, setDrafted, hasStripe, setDeclarationChecked, setTermsChecked, isDeclarationChecked, isTermsChecked, handleSubmit, handleUpdate);

    return renderPageContent(page);
}

export default OnboardingHost;
