import React, { useState, useMemo, useEffect } from "react";
import {useLocation, useNavigate} from 'react-router-dom';
import spinner from "../../images/spinnner.gif";
import info from "../../images/icons/info.png";
import './onboardingHost.css';
import Select from 'react-select'
import countryList from 'react-select-country-list'
import MapComponent from "./data/MapComponent";
import { Storage, Auth } from "aws-amplify"
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
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
import CalendarComponent from "../hostdashboard/CalendarComponent";
const S3_BUCKET_NAME = 'accommodation';
const region = 'eu-north-1';
function OnboardingHost() {
    const navigate = useNavigate();
    const options = useMemo(() => countryList().getLabels(), []);
    const [isNew, setIsNew] = useState(true);
    const [oldAccoID, setOldAccoID] = useState('');
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const accommodationID = searchParams.get('ID');
    const [location, setLocation] = useState({
        latitude: 0,
        longitude: 0,
    });
    const [hasAccoType, setHasAccoType] = useState(false);
    const [hasGuestAccess, setHasGuestAccess] =useState(false);
    const [hasAddress, setHasAddress] = useState(false);
    const [hasSpecs, setHasSpecs] = useState(false);
    const [updatedIndex, setUpdatedIndex] = useState([]);

    useEffect(() => {
        const fetchAccommodation = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ID: oldAccoID }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }

                const responseData = await response.json();
                const data = JSON.parse(responseData.body);

                if (!data.hasOwnProperty('CleaningFee')) {
                    data.CleaningFee = 1;
                }

                setFormData(data);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            } finally {
                setIsLoading(false);
            }
        };


        if (!isNew && oldAccoID) {
            fetchAccommodation();
        } else {
            setIsLoading(false)
        }
    }, [isNew, oldAccoID]);
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    let [userId, setUserId] = useState(null);
    const [hasStripe, setHostStripe] = useState(false);
    const [accoTypes] = useState(["Apartment", "House", "Villa", "Boat", "Camper", "Cottage"]);
    const [boatTypes] = useState(["Motorboat", "Sailboat", "RIB", "Catamaran", "Yacht", "Barge", "House boat", "Jet ski", "Electric boat", "Boat without license"]);
    const [camperTypes] = useState(["Campervan", "Sprinter-Type", "Cabover Motorhome", "Semi-integrated Motorhome", "Integrated Motorhome", "Roof Tent", "Other"]);
    const [camperCategories] = useState(["Adventure", "Classic", "Compact", "Family"]);
    const [licenseTypes] = useState(["B", "C1", "C", "D1", "D"]);

    const accommodationIcons = {
        "Apartment": Apartment,
        "House": House,
        "Villa": Villa,
        "Boat": Boat,
        "Camper": Camper,
        "Cottage": Cottage
    };
    const boatIcons = {
        "Motorboat": Motorboat,
        "Sailboat": Sailboat,
        "RIB": RIB,
        "Catamaran": Catamaran,
        "Yacht": Yacht,
        "Barge": Barge,
        "House boat": HouseBoat,
        "Jet ski": JetSki,
        "Electric boat": ElectricBoat,
        "Boat without license": BoatWithoutLicense
    };
    const [selectedAccoType, setSelectedAccoType] = useState("");
    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            if (user) {
                setUserId(user.attributes.sub);
                if (accommodationID) {
                    setOldAccoID(accommodationID);
                    setIsNew(false);
                }
            } else {
                navigate('/login');
            }
        }).catch(error => {
            console.error("Error setting user id:", error);
            navigate('/login');
        });
    }, [navigate]);

    useEffect(() => {
        const checkHostStripeAcc = async (hostID) => {
            try {
                const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: hostID }),
                });
                const data = await response.json();
                if (data.hasStripeAccount) {
                    setHostStripe(true);
                }
            } catch (error) {
                console.error("Error fetching user data or Stripe status:", error);
            }
        }
        checkHostStripeAcc(userId);
    }, [userId]);

    const [page, setPage] = useState(0);
    const generateCommonFormData = () => ({
        ID: generateUUID(),
        Title: "",
        Subtitle: "",
        Description: "",
        Rent: 1,
        GuestAmount: 0,
        Country: "",
        City: "",
        Features: {
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
            EcoFriendly: []
        },
        Images: {
            image1: "",
            image2: "",
            image3: "",
            image4: "",
            image5: ""
        },
        DateRanges: [],
        Drafted: true,
        AccommodationType: "",
        ServiceFee: 0,
        CleaningFee: 0,
        OwnerId: "",
    });
    const generateBoatFormData = () => ({
        ...generateCommonFormData(),
        Harbour: "",
        Cabins: 0,
        Bathrooms: 0,
        Beds: 0,
        isPro: false,
        Manufacturer: "",
        Model: "",
        RentedWithSkipper: false,
        GPI: "",
        Capacity: "",
        Length: "",
        FuelTank: "",
        Speed: "",
        YOC: "",
        Renovated: "",
        Features: {
            ...generateCommonFormData().Features,
            Outdoor: [],
            NavigationEquipment: [],
            LeisureActivities: [],
            WaterSports: [],
        }
    });
    const generateCamperFormData = () => ({
        ...generateCommonFormData(),
        Rooms: 0,
        PostalCode: "",
        Street: "",
        Bathrooms: 0,
        Beds: 0,
        LicensePlate: "",
        Category: "",
        CamperBrand: "",
        Model: "",
        Requirement: "",
        GPI: "",
        Length: "",
        Height: "",
        Transmission: "",
        FuelTank: "",
        YOC: "",
        Renovated: "",
        FWD: false,
        SelfBuilt: false,
        Features: {
            ...generateCommonFormData().Features,
            Vehicle: [],
            Outdoor: [],
            NavigationEquipment: [],
            LeisureActivities: [],
            WaterSports: []
        }
    });
    const generateNormalAccommodationFormData = () => ({
        ...generateCommonFormData(),
        Bedrooms: 0,
        PostalCode: "",
        Street: "",
        Bathrooms: 0,
        Beds: 0,
        GuestAccess: ""
    });
    const [formData, setFormData] = useState('');
    const allAmenities = {
        Essentials: [
            'Wi-Fi',
            'Air conditioning',
            'Heating',
            'TV with cable/satellite',
            'Hot water',
            'Towels',
            'Bed linens',
            'Extra pillows and blankets',
            'Toilet paper',
            'Soap and shampoo'
        ],
        Kitchen: [
            'Refrigerator',
            'Microwave',
            'Oven',
            'Stove',
            'Dishwasher',
            'Coffee maker',
            'Toaster',
            'Basic cooking essentials',
            'Dishes and silverware',
            'Glasses and mugs',
            'Cutting board and knives',
            'Blender',
            'Kettle'
        ],
        Bathroom: [
            'Hair dryer',
            'Shower gel',
            'Conditioner',
            'Body lotion',
            'First aid kit'
        ],
        Bedroom: [
            'Hangers',
            'Iron and ironing board',
            'Closet/drawers',
            'Alarm clock'
        ],
        LivingArea: [
            'Sofa',
            'Armchairs',
            'Coffee table',
            'Books and magazines',
            'Board games'
        ],
        Technology: [
            'Smart TV',
            'Streaming services',
            'Bluetooth speaker',
            'Universal chargers',
            'Work desk and chair'
        ],
        Safety: [
            'Smoke detector',
            'Carbon monoxide detector',
            'Fire extinguisher',
            'Lock on bedroom door'
        ],
        FamilyFriendly: [
            'High chair',
            'Crib',
            'Children’s books and toys',
            'Baby safety gates',
            'Baby bath',
            'Baby monitor'
        ],
        Laundry: [
            'Washer and dryer',
            'Laundry detergent',
            'Clothes drying rack'
        ],
        Convenience: [
            'Keyless entry',
            'Self-check-in',
            'Local maps and guides',
            'Luggage drop-off allowed',
            'Parking space',
            'EV charger'
        ],
        Accessibility: [
            'Step-free access',
            'Wide doorways',
            'Accessible-height bed',
            'Accessible-height toilet',
            'Shower chair'
        ],
        ExtraServices: [
            'Cleaning service (add service fee manually)',
            'Concierge service',
            'Housekeeping',
            'Grocery delivery',
            'Airport shuttle',
            'Private chef',
            'Personal trainer',
            'Massage therapist'
        ],
        EcoFriendly: [
            'Recycling bins',
            'Energy-efficient appliances',
            'Solar panels',
            'Composting bin'
        ],
        Outdoor: [
            'Patio or balcony',
            'Outdoor furniture',
            'Grill',
            'Fire pit',
            'Pool',
            'Hot tub',
            'Garden or backyard',
            'Bicycle'
        ]
    };
    const boatAmenities = {
        ...allAmenities,
        Outdoor: [
            ...allAmenities.Outdoor,
            'Bimini',
            'Outdoor shower',
            'External table',
            'External speakers',
            'Teak deck',
            'Bow sundeck',
            'Aft sundeck',
            'Bathing Platform',
            'Bathing ladder'
        ],
        NavigationalEquipment: [
            'Bow thruster',
            'Electric windlass',
            'Autopilot',
            'GPS',
            'Depth sounder',
            'VHF',
            'Guides & Maps'
        ],
        LeisureActivities: [
            'Snorkeling equipment',
            'Fishing equipment',
            'Diving equipment'
        ],
        WaterSports: [
            'Water skis',
            'Monoski',
            'Wakeboard',
            'Towable Tube',
            'Inflatable banana',
            'Kneeboard'
        ]
    };
    const camperAmenities = {
        ...allAmenities,
        FamilyFriendly: [
            ...allAmenities.FamilyFriendly,
            'Baby seat',
        ],
        Outdoor: [
            ...allAmenities.Outdoor,
            'Outdoor shower',
            'External table and chairs',
            'External speakers'
        ],
        Vehicle: [
            'Bicycle carrier',
            'Reversing camera',
            'Airbags',
            'Cruise control',
            'Imperial',
            'Navigation',
            'Awning',
            'Parking sensors',
            'Power steering',
            'Tow bar',
            'Snow chains',
            'Winter tires'
        ],
    };
    const [typeAmenities, setTypeAmenities] = useState({});
    useEffect(() => {
        const getInitialFormData = (accoType) => {
            switch (accoType) {
                case 'Boat':
                    setFormData(generateBoatFormData);
                    setTypeAmenities(boatAmenities);
                    return;
                case 'Camper':
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
    };

    const hasImages = () => {
        for (const imageKey in formData.Images) {
            if (formData.Images[imageKey] === '') {
                return false;
            }
        }
        return true;
    }
    const separatePascalCase = (str) => {
        return str.replace(/([A-Z])/g, ' $1').trim();
    }
    useEffect(() => {
        if (formData.AccommodationType) setHasAccoType(true);
        if (formData.GuestAccess) setHasGuestAccess(true);
        switch (selectedAccoType) {
            case 'Boat':
                setHasAddress(!!(formData.Country && formData.City && formData.Harbour));
                setHasSpecs(!!(formData.Manufacturer && formData.Model && formData.GPI &&
                    formData.Capacity && formData.Length && formData.FuelTank && formData.Speed && formData.YOC));
                break;
            case 'Camper':
                setHasAddress(!!(formData.Country && formData.City && formData.PostalCode && formData.Street));
                setHasSpecs(!!(formData.Category && formData.LicensePlate && formData.CamperBrand && formData.Model && formData.Requirement && formData.GPI &&
                    formData.Height && formData.Length && formData.FuelTank && formData.Transmission && formData.YOC));
            default:
                setHasAddress(!!(formData.Country && formData.City && formData.PostalCode && formData.Street));
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
        setFormData(prevData => ({
            ...prevData,
            ServiceFee: fee
        }));
    }, [formData.Rent]);


    useEffect(() => {
        const appendUserId = () => {
            setFormData((prevData) => ({
                ...prevData,
                OwnerId: userId
            }));
        }
        appendUserId();
    }, [userId]);

    const handleLocationChange = async (Country, City, PostalCode, Street) => {
        const address = `${Country} ${City} ${Street} ${PostalCode}`;
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    address
                )}&key=AIzaSyDsc4bZSQfuPkpluzSPfT5eYnVRzPWD-ow`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch geocoding data');
            }
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                setLocation({
                    latitude: location.lat,
                    longitude: location.lng
                });
            } else {
                console.error('No results found for the provided address');
            }
        } catch (error) {
            console.error('Error fetching geocoding data:', error);
        }
    };

    const changeAccoType = (accommodationType) => {
        setFormData((prevData) => ({
            ...prevData,
            AccommodationType: accommodationType
        }));
    };
    const changeGuestAccess = (access) => {
        setFormData((prevData) => ({
            ...prevData,
            AccommodationType: selectedAccoType,
            GuestAccess: access
        }));
    };
    const changeCamperCategory = (category) => {
        setFormData((prevData) => ({
            ...prevData,
            Category: category
        }));
    };

    const resetCleaningFee = () => {
        if (!formData.Features.ExtraServices.includes('Cleaning service (add service fee manually)')) {
            setFormData((prevData) => ({
                ...prevData,
                CleaningFee: 0
            }));
        }
    };

    const incrementAmount = (field) => {
        setFormData(prevData => ({
            ...prevData,
            [field]: prevData[field] + 1
        }));
    };

    const decrementAmount = (field) => {
        if (formData[field] > 0) {
            setFormData(prevData => ({
                ...prevData,
                [field]: prevData[field] - 1
            }));
        }
    };

    const setDrafted = (value) => {
        setFormData((prevData) => ({
            ...prevData,
            Drafted: value
        }));
    }

    const handleAmenities = (category, amenity, checked) => {
        console.log({
            category: category,
            amenity: amenity
        });
        setFormData(prevFormData => {
            const updatedFeatures = { ...prevFormData.Features };

            if (amenity === 'Cleaning service (add service fee manually)') {
                resetCleaningFee();
            }
            if (checked) {
                updatedFeatures[category] = [...updatedFeatures[category], amenity];
            } else {
                updatedFeatures[category] = updatedFeatures[category].filter(item => item !== amenity);
            }

            return {
                ...prevFormData,
                Features: updatedFeatures
            };
        });
    };
    const handleCheckBoxChange = (event) => {
        const { name, type, checked, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: checked,
        }));
    }


    const handleInputChange = (event) => {
        const { name, type, checked, value } = event.target;
        if (type === 'checkbox') {
            setFormData((prevData) => ({
                ...prevData,
                Features: {
                    ...prevData.Features,
                    [name]: checked,
                },
                SystemConfiguration: {
                    ...prevData.Features,
                    [name]: checked,
                }
            }));
        } else if (type === 'radio') {
            setFormData((prevData) => ({
                ...prevData,
                [name]: !prevData[name],
            }));
        } else if (type === 'number' || type === 'range') {
            const newValue = value || '';
            setFormData((prevData) => ({
                ...prevData,
                [name]: newValue
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value
            }));

            if (name === 'City') {
                handleLocationChange(formData.Country, value, formData.PostalCode, formData.Street);
            } else if (name === 'PostalCode') {
                handleLocationChange(formData.Country, formData.City, value, formData.Street);
            } else if (name === 'Street') {
                handleLocationChange(formData.Country, formData.City, formData.PostalCode, value);
            }
        }
    };

    const handleCountryChange = (selectedOption) => {
        setFormData(currentFormData => ({
            ...currentFormData,
            Country: selectedOption.value
        }));
        handleLocationChange(selectedOption.value, formData.City, formData.PostalCode, formData.Street);
    };

    const setLicenseRequirement = (selectedOption) => {
        setFormData(currentFormData => ({
            ...currentFormData,
            Requirement: selectedOption.value
        }));
    };

    const constructURL = (userId, accommodationId, index) => {
        return `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/images/${userId}/${accommodationId}/Image-${index + 1}.jpg`;
    };

    const uploadImageToS3 = async (userId, accommodationId, image, index) => {
        const key = `images/${userId}/${accommodationId}/Image-${index + 1}.jpg`;

        try {
            await Storage.put(key, image, {
                bucket: S3_BUCKET_NAME,
                region: region,
                contentType: image.type,
                level: null,
                customPrefix: { public: '' }
            });
            return constructURL(userId, accommodationId, index);
        } catch (err) {
            console.error("Failed to upload file:", err);
            throw err;
        }
    }

    const removeImageFromS3 = async (userId, accommodationId, index) => {
        const key = `images/${userId}/${accommodationId}/Image-${index + 1}.jpg`;

        try {
            await Storage.remove(key, {
                bucket: S3_BUCKET_NAME,
                region: region,
                level: null,
                customPrefix: { public: '' }
            });
        } catch (err) {
            console.error("Failed to remove file:", err);
            throw err;
        }
    }
    const handleUpdate = async () => {
        try {
            setIsLoading(true);
            const AccoID = formData.ID;
            const updatedFormData = { ...formData };
            for (let i = 0; i < updatedIndex.length; i++) {
                const index = updatedIndex[i];
                await removeImageFromS3(userId, AccoID, index);
            }
            for (let i = 0; i < updatedIndex.length; i++) {
                const index = updatedIndex[i];
                const file = imageFiles[index];
                const location =  await uploadImageToS3(userId, AccoID, file, index);
                updatedFormData.Images[`image${i + 1}`] = location;
            }
            await setFormData(updatedFormData);
            setImageFiles([]);

            const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/EditAccommodation', {
                method: 'PUT',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                console.log('Accommodation updated successfully');
            } else {
                console.error('Error updating accommodation');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            const AccoID = formData.ID;
            const updatedFormData = { ...formData };
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const location =  await uploadImageToS3(userId, AccoID, file, i);
                updatedFormData.Images[`image${i + 1}`] = location;
            }
            await setFormData(updatedFormData);
            setImageFiles([]);

            const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            if (response.ok) {
                console.log('Form data saved successfully');
            } else {
                console.error('Error saving form data');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const [imageFiles, setImageFiles] = useState(Array.from({ length: 5 }, () => null));

    const handleFileChange = (file, index) => {
        const newImageFiles = [...imageFiles];
        newImageFiles[index] = file;
        setImageFiles(newImageFiles);

        const updatedFormData = { ...formData };
        if (file) {
            const key = `image${index + 1}`;
            updatedFormData.Images[key] = URL.createObjectURL(file);
        }
        setFormData(updatedFormData);
    };

    const handleDelete = (index) => {
        const newImageFiles = [...imageFiles];
        newImageFiles[index] = null;
        setImageFiles(newImageFiles);

        const updatedFormData = { ...formData };
        const key = `image${index + 1}`;
        updatedFormData.Images[key] = "";
        setFormData(updatedFormData);

        if (!updatedIndex.includes(index)) {
            setUpdatedIndex(prevUpdatedIndex => [...prevUpdatedIndex, index]);
        }
    };

    const updateDates = (dateRanges) => {
        if (dateRanges !== formData.DateRanges) {
            setFormData({
                ...formData,
                DateRanges: dateRanges
            });
        }
    };

    const [isLoading, setIsLoading] = useState(true);

    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                if (isLoading) {
                    return (
                        <main className="loading">
                            <h2 className="spinner-text">Please wait a moment...</h2>
                            <img className="spinner" src={spinner}/>
                        </main>
                    );
                } else
                return (
                    <main className="page-body">
                        <h2 className="onboardingSectionTitle">{isNew ? 'What best describes your accommodation?' : 'Edit your accommodation type'}</h2>
                        <section className="accommodation-types">
                            {accoTypes.map((option, index) => (
                                <div
                                    key={index}
                                    className={`option ${selectedAccoType === option ? 'selected' : ''}`}
                                    onClick={() => changeAccoType(option)}
                                >
                                    <img className="accommodation-icon" src={accommodationIcons[option]} alt={option}/>
                                    {option}
                                </div>
                            ))}
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => navigate("/hostdashboard")} style={{opacity: "75%"}}>
                                Go to dashboard
                            </button>
                            <button className={!hasAccoType ? 'onboarding-button-disabled' : 'onboarding-button'} disabled={!hasAccoType} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 1:
                return (
                    <main className='container'>
                        {selectedAccoType === 'Boat' ? (
                            <div>
                                <h2 className="onboardingSectionTitle">{isNew ? 'What type of boat do you own?' : 'Change the type of boat that you own'}</h2>
                                <section className="boat-types">
                                    {boatTypes.map((option, index) => (
                                        <div
                                            key={index}
                                            className={`option ${formData.GuestAccess === option ? 'selected' : ''}`}
                                            onClick={() => changeGuestAccess(option)}
                                        >
                                            <img className="accommodation-icon" src={boatIcons[option]} alt={option}/>
                                            {option}
                                        </div>
                                    ))}
                                </section>
                            </div>
                        ) : selectedAccoType === 'Camper' ? (
                            <div>
                                <h2 className="onboardingSectionTitle">{isNew ? 'What type of camper do you own?' : 'Change the type of camper that you own'}</h2>
                                <section className="accommodation-types" style={{padding: "5rem"}}>
                                    {camperTypes.map((option, index) => (
                                        <div
                                            key={index}
                                            className={`option ${formData.GuestAccess === option ? 'selected' : ''}`}
                                            onClick={() => changeGuestAccess(option)}
                                        >
                                            <img className="accommodation-icon" src={Camper} alt={option}/>
                                            {option}
                                        </div>
                                    ))}
                                </section>
                            </div>
                        ) : (
                            <section className="guest-access">
                                <h2 className="onboardingSectionTitle">{isNew ? 'What kind of space do your guests have access to?' : 'Change the type of access your guests can have'}</h2>
                                <div
                                    className={formData.GuestAccess === 'Entire house' ? 'guest-access-item-selected' : 'guest-access-item'}
                                    onClick={() => changeGuestAccess("Entire house")}>
                                    <h3 className="guest-access-header">Entire house</h3>
                                    <p>Guests have the entire space to themselves</p>
                                </div>
                                <div
                                    className={formData.GuestAccess === 'Room' ? 'guest-access-item-selected' : 'guest-access-item'}
                                    onClick={() => changeGuestAccess("Room")}>
                                    <h3 className="guest-access-header">Room</h3>
                                    <p>Guests have their own room in a house and share other spaces</p>
                                </div>
                                <div
                                    className={formData.GuestAccess === 'Shared room' ? 'guest-access-item-selected' : 'guest-access-item'}
                                    onClick={() => changeGuestAccess("Shared room")}>
                                    <h3 className="guest-access-header">A shared room</h3>
                                    <p>Guests sleep in a room or common area that they may share with you or others</p>
                                </div>
                            </section>
                        )}
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!hasGuestAccess ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!hasGuestAccess} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 2:
                return (
                    <main className='page-body'>
                        <h2 className="onboardingSectionTitle">
                            {isNew ? `Where can we find your 
                            ${selectedAccoType === 'Boat' || 'Camper' ? selectedAccoType.toLowerCase() : 'accommodation'}?`
                                : `Change the location of your ${formData.AccommodationType === 'Boat' || 'Camper' ? formData.AccommodationType.toLowerCase() : 'accommodation'}`}</h2>
                        <p className="onboardingSectionSubtitle">We only share your address with guests after they have
                            booked</p>

                        <section className="acco-location">
                            <section className="location-left">
                                <label htmlFor="country">
                                    {`Country${(selectedAccoType === 'Boat' || selectedAccoType === 'Camper') ? ' of registration' : ''}*`}
                                </label>
                                <Select
                                    options={options.map(country => ({value: country, label: country}))}
                                    name="Country"
                                    className="locationText"
                                    value={{value: formData.Country, label: formData.Country}}
                                    onChange={handleCountryChange}
                                    id="country"
                                    required={true}
                                />
                                <label htmlFor="city">City*</label>
                                <input
                                    className="textInput-field locationText"
                                    name="City"
                                    onChange={handleInputChange}
                                    value={formData.City}
                                    id="city"
                                    placeholder="Select your city"
                                    required={true}
                                />
                                {selectedAccoType !== 'Boat' ? (
                                    <>
                                        <label htmlFor="street">Street + house nr.*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Street"
                                            onChange={handleInputChange}
                                            value={formData.Street}
                                            id="street"
                                            placeholder="Enter your address"
                                            required={true}
                                        />
                                        <label htmlFor="postal">Postal Code*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="PostalCode"
                                            onChange={handleInputChange}
                                            value={formData.PostalCode}
                                            id="postal"
                                            placeholder="Enter your postal code"
                                            required={true}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label htmlFor="harbour">Harbour*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Harbour"
                                            onChange={handleInputChange}
                                            value={formData.Harbour}
                                            id="harbour"
                                            placeholder="Enter the name of the harbour"
                                            required={true}
                                        />
                                    </>
                                )}
                            </section>
                        </section>
                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!hasAddress ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!hasAddress} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 3:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'How many people can stay here?' : 'Adjust the maximum amount of guests'}</h2>
                        <section className="guest-amount">
                            <div className="guest-amount-item">
                                <p>Guests</p>
                                <div className="amount-btn-box">
                                    <button className="round-button" onClick={() => decrementAmount('GuestAmount')}>-
                                    </button>
                                    {formData.GuestAmount}
                                    <button className="round-button" onClick={() => incrementAmount('GuestAmount')}>+
                                    </button>
                                </div>
                            </div>
                            {selectedAccoType === 'Boat' ? (
                                <div className="guest-amount-item">
                                    <p>Cabins</p>
                                    <div className="amount-btn-box">
                                        <button className="round-button" onClick={() => decrementAmount('Cabins')}>-
                                        </button>
                                        {formData.Cabins}
                                        <button className="round-button" onClick={() => incrementAmount('Cabins')}>+
                                        </button>
                                    </div>
                                </div>
                            ) : selectedAccoType === 'Camper' ? (
                                <div className="guest-amount-item">
                                    <p>Rooms</p>
                                    <div className="amount-btn-box">
                                        <button className="round-button" onClick={() => decrementAmount('Rooms')}>-
                                        </button>
                                        {formData.Rooms}
                                        <button className="round-button" onClick={() => incrementAmount('Rooms')}>+
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="guest-amount-item">
                                    <p>Beds</p>
                                    <div className="amount-btn-box">
                                        <button className="round-button" onClick={() => decrementAmount('Bedrooms')}>-
                                        </button>
                                        {formData.Beds}
                                        <button className="round-button" onClick={() => incrementAmount('Bedrooms')}>+
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="guest-amount-item">
                                <p>Bathrooms</p>
                                <div className="amount-btn-box">
                                    <button className="round-button" onClick={() => decrementAmount('Bathrooms')}>-
                                    </button>
                                    {formData.Bathrooms}
                                    <button className="round-button" onClick={() => incrementAmount('Bathrooms')}>+
                                    </button>
                                </div>
                            </div>
                            <div className="guest-amount-item">
                                <p>Beds</p>
                                <div className="amount-btn-box">
                                    <button className="round-button" onClick={() => decrementAmount('Beds')}>-</button>
                                    {formData.Beds}
                                    <button className="round-button" onClick={() => incrementAmount('Beds')}>+</button>
                                </div>
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)} style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className="onboarding-button"
                                    onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 4:
                return (
                    <main className="page-body">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Let guests know what your space has to offer.' : 'Edit your amenities'}</h2>
                        <p className="onboardingSectionSubtitle">You can add more facilities after publishing your
                            listing</p>
                        <div className="amenity-groups">
                            {typeAmenities && formData.Features && Object.keys(typeAmenities).length > 0 && Object.keys(allAmenities).length > 0 && Object.keys(typeAmenities).map((category) => {
                                const amenities = typeAmenities[category] || [];
                                const featuresArray = formData.Features[category] || [];

                                return (
                                    <div key={category} style={{
                                        marginBottom: '5%',
                                        boxShadow: 'inset 0 0 20px 10px #dedede',
                                        padding: '5%',
                                        borderRadius: '2rem'
                                    }}>
                                        <h2 className="amenity-header">{separatePascalCase(category)}</h2>
                                        <section className="check-box">
                                            {amenities.map((amenity) => (
                                                <label key={amenity}>
                                                    <input
                                                        type="checkbox"
                                                        name={amenity}
                                                        onChange={(e) => handleAmenities(category, amenity, e.target.checked)}
                                                        checked={featuresArray.includes(amenity)}
                                                    />
                                                    {separatePascalCase(amenity)}
                                                </label>
                                            ))}
                                        </section>
                                    </div>
                                );
                            })}
                        </div>

                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className="onboarding-button"
                                    onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 5:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? `Add photos of your ${selectedAccoType.toLowerCase()}` : `Edit photos of your ${selectedAccoType.toLowerCase()}`}</h2>

                        <section className="accommodation-photos">
                            {!formData.Images ?
                                <section className="image-upload">
                                    <h2>Drag your photos here</h2>
                                    <p>Choose at least five photos</p>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileChange(e.target.files[0], 0)}
                                        accept="image/*"
                                        className="file-input-thumbnail"
                                        required={true}
                                    />
                                </section>
                                :
                                <section className="accommodation-images">
                                    {[...Array(5)].map((_, index) => (
                                        <section key={index} className="images-container">
                                            <input
                                                type="file"
                                                onChange={(e) => handleFileChange(e.target.files[0], index)}
                                                accept="image/*"
                                                className="file-input"
                                                required={true}
                                            />
                                            {formData.Images[`image${index + 1}`] && (
                                                <>
                                                    <img
                                                        src={formData.Images[`image${index + 1}`]}
                                                        alt={`Image ${index + 1}`}
                                                        className={index === 0 ? "accommodation-thumbnail" : "file-image"}
                                                    />
                                                    <button className="delete-button"
                                                            onClick={() => handleDelete(index)}>
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                            {!formData.Images[`image${index + 1}`] &&
                                                <div className="placeholder">Image {index + 1}</div>}
                                        </section>
                                    ))}
                                </section>
                            }
                        </section>

                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!hasImages() ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!hasImages()} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 6:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? `Name your ${selectedAccoType.toLowerCase()}` : `Edit the name of your ${selectedAccoType.toLowerCase()}`}</h2>
                        <p className="onboardingSectionSubtitle">A short title works best. Don't worry, you can always
                            change it later.</p>

                        <section className="accommodation-title">
                            <textarea
                                className="textInput locationText"
                                id="title"
                                name="Title"
                                onChange={handleInputChange}
                                value={formData.Title}
                                placeholder="Enter your title here..."
                                required={true}
                                maxLength={128}
                            />
                            <p>{formData.Title.length}/128</p>
                        </section>
                        <h2 className="onboardingSectionTitle">{isNew ? 'Give it a suitable subtitle' : 'Edit your subtitle'}</h2>
                        <section className="accommodation-title">
                            <textarea
                                className="textInput locationText"
                                id="Subtitle"
                                name="Subtitle"
                                onChange={handleInputChange}
                                value={formData.Subtitle}
                                placeholder="Enter your subtitle here..."
                                required={true}
                                maxLength={128}
                            />
                            <p>{formData.Subtitle.length}/128</p>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)} style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button
                                className={!(formData.Title && formData.Subtitle) ? 'onboarding-button-disabled' : 'onboarding-button'}
                                disabled={!(formData.Title && formData.Subtitle)} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 7:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Provide a description' : 'Edit your description'}</h2>
                        <p className="onboardingSectionSubtitle">Share what makes your space special.</p>

                        <section className="accommodation-title">
                            <textarea
                                className="textInput locationText title-input"
                                id="description"
                                name="Description"
                                onChange={handleInputChange}
                                value={formData.Description}
                                placeholder="Enter your title here..."
                                required={true}
                                maxLength={500}
                            />
                            <p>{formData.Description.length}/500</p>
                        </section>
                        {selectedAccoType === 'Boat' ? (
                            <div className="accommodation-specification">
                                <h1>General</h1>
                                <section className="accommodation-general">
                                    <label>Are you a professional?</label>
                                    <div className='radioBtn-box'>
                                        <label>
                                            <input
                                                type="radio"
                                                name='isPro'
                                                onChange={handleInputChange}
                                                checked={formData.isPro}
                                            />
                                            Yes
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name='isPro'
                                                onChange={handleInputChange}
                                                checked={!formData.isPro}
                                            />
                                            No
                                        </label>
                                    </div>
                                    <label htmlFor="city">Manufacturer*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="Manufacturer"
                                        onChange={handleInputChange}
                                        value={formData.Manufacturer}
                                        id="manufacturer"
                                        placeholder="Enter the manufacturer of your boat"
                                        required={true}
                                    />
                                    <label htmlFor="city">Model*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="Model"
                                        onChange={handleInputChange}
                                        value={formData.Model}
                                        id="model"
                                        placeholder="Enter the name of the model"
                                        required={true}
                                    />
                                    <label htmlFor="city">Is your boat rented with a skipper?</label>
                                    <div className='radioBtn-box'>
                                        <label>
                                            <input
                                                type="radio"
                                                name='RentedWithSkipper'
                                                onChange={handleInputChange}
                                                checked={formData.RentedWithSkipper}
                                            />
                                            Yes
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name='RentedWithSkipper'
                                                onChange={handleInputChange}
                                                checked={!formData.RentedWithSkipper}
                                            />
                                            No
                                        </label>
                                    </div>
                                    <label htmlFor="GPI">General periodic inspection*</label>
                                    <input
                                        type='date'
                                        className="textInput-field locationText"
                                        name="GPI"
                                        onChange={handleInputChange}
                                        value={formData.GPI}
                                        id="gpi"
                                        placeholder="DD/MM/YYYY"
                                        required={true}
                                    />
                                </section>
                                <h1>Technical</h1>
                                <section className="accommodation-technical">
                                    <div>
                                        <label htmlFor="capacity">Capacity (allowed)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Capacity"
                                            onChange={handleInputChange}
                                            value={formData.Capacity}
                                            id="capacity"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="length">Length (m)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Length"
                                            onChange={handleInputChange}
                                            value={formData.Length}
                                            id="length"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fuel">Fuel (L/h)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="FuelTank"
                                            onChange={handleInputChange}
                                            value={formData.FuelTank}
                                            id="fueltank"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="speed">Top speed (Km)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Speed"
                                            onChange={handleInputChange}
                                            value={formData.Speed}
                                            id="speed"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="YOC">Year of construction</label>
                                        <input
                                            type="number"
                                            className="textInput-field locationText"
                                            name="YOC"
                                            onChange={handleInputChange}
                                            value={formData.YOC}
                                            id="yoc"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder="YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="renovated">Renovated</label>
                                        <input
                                            type='number'
                                            className="textInput-field locationText"
                                            name="Renovated"
                                            onChange={handleInputChange}
                                            value={formData.Renovated}
                                            id="renovated"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder='YYYY'
                                        />
                                    </div>
                                </section>
                            </div>
                        ) : selectedAccoType === 'Camper' && (
                            <div className="accommodation-specification">
                                <h1>General</h1>
                                <section className="accommodation-general">
                                    <label>Category</label>
                                    <div className='radioBtn-box'>
                                        {camperCategories.map((category, index) => (
                                            <>
                                                <label key={index}>
                                                    <input
                                                        type="radio"
                                                        name='Category'
                                                        onChange={() => changeCamperCategory(category)}
                                                        checked={formData.Category === category}
                                                    />
                                                    {category}
                                                </label>
                                            </>
                                        ))}

                                    </div>
                                    <label htmlFor="city">License plate*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="LicensePlate"
                                        onChange={handleInputChange}
                                        value={formData.LicensePlate}
                                        id="licensePlate"
                                        placeholder="Enter the characters of your license plate"
                                        required={true}
                                    />
                                    <label htmlFor="city">Brand*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="CamperBrand"
                                        onChange={handleInputChange}
                                        value={formData.CamperBrand}
                                        id="camperbrand"
                                        placeholder="Enter the brand of your camper"
                                        required={true}
                                    />
                                    <label htmlFor="city">Model*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="Model"
                                        onChange={handleInputChange}
                                        value={formData.Model}
                                        id="model"
                                        placeholder="Enter the name of the model"
                                        required={true}
                                    />
                                    <label>
                                        Required driver’s license
                                    </label>
                                    <Select
                                        options={licenseTypes.map(licenseType => ({value: licenseType, label: licenseType}))}
                                        name="Requirement"
                                        className="locationText"
                                        value={{value: formData.Requirement, label: `${formData.Requirement ? formData.Requirement : 'Select the required license type'}`}}
                                        onChange={setLicenseRequirement}
                                        id="requirement"
                                        required={true}
                                    />
                                    <label style={{marginTop: '5%'}} htmlFor="GPI">General periodic inspection*</label>
                                    <input
                                        type='date'
                                        className="textInput-field locationText"
                                        name="GPI"
                                        onChange={handleInputChange}
                                        value={formData.GPI}
                                        id="gpi"
                                        placeholder="DD/MM/YYYY"
                                        required={true}
                                    />
                                </section>
                                <h1>Technical</h1>
                                <section className="accommodation-technical">
                                    <div>
                                        <label htmlFor="length">Length (m)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Length"
                                            onChange={handleInputChange}
                                            value={formData.Length}
                                            id="length"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="length">Height (m)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Height"
                                            onChange={handleInputChange}
                                            value={formData.Height}
                                            id="height"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fuel">Transmission</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Transmission"
                                            onChange={handleInputChange}
                                            value={formData.Transmission}
                                            id="transmission"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fuel">Fuel (L/h)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="FuelTank"
                                            onChange={handleInputChange}
                                            value={formData.FuelTank}
                                            id="fueltank"
                                            required={true}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="YOC">Year of construction</label>
                                        <input
                                            type="number"
                                            className="textInput-field locationText"
                                            name="YOC"
                                            onChange={handleInputChange}
                                            value={formData.YOC}
                                            id="yoc"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder="YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="renovated">Renovated</label>
                                        <input
                                            type='number'
                                            className="textInput-field locationText"
                                            name="Renovated"
                                            onChange={handleInputChange}
                                            value={formData.Renovated}
                                            id="renovated"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder='YYYY'
                                        />
                                    </div>
                                    <div className="check-box-vertical">
                                        <label>
                                            <input
                                                type="checkbox"
                                                name='FWD'
                                                onChange={handleCheckBoxChange}
                                                checked={formData.FWD}
                                            />
                                            4 x 4 Four-Wheel Drive
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                name='SelfBuilt'
                                                onChange={handleCheckBoxChange}
                                                checked={formData.SelfBuilt}
                                            />
                                            My camper is self-built
                                        </label>
                                    </div>
                                </section>
                            </div>
                        )}
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            {selectedAccoType === 'Boat' || selectedAccoType === 'Camper' ? (
                                <button
                                    className={!(formData.Description && hasSpecs) ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!(formData.Description && hasSpecs)}
                                    onClick={() => pageUpdater(page + 1)}>
                                    Confirm and proceed
                                </button>
                            ) : (
                                <button
                                    className={!formData.Description ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!formData.Description} onClick={() => pageUpdater(page + 1)}>
                                    Confirm and proceed
                                </button>
                            )}
                        </nav>
                    </main>
                );
            case 8:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Now set your rate' : 'Edit your rate'}</h2>
                        <h2 className="acco-price">{!isNaN(parseFloat(formData.Rent)) ? `€ ${parseFloat(formData.Rent).toFixed(0)}` : 'Enter your base rate'}</h2>
                        <section className="accommodation-pricing">
                            <div className="pricing-row">
                                <label>Base rate</label>
                                <input className="pricing-input" type="number" name="Rent" onChange={handleInputChange}
                                       defaultValue={formData.Rent} min={1} step={0.1}
                                       required={true}/>
                            </div>
                            {formData.Features.ExtraServices.includes('Cleaning service (add service fee manually)') &&
                                <div className="pricing-row">
                                    <label>Cleaning fee</label>
                                    <input className="pricing-input" type="number" name="CleaningFee"
                                           onChange={handleInputChange}
                                           defaultValue={formData.CleaningFee ? formData.CleaningFee : 1} min={1}
                                           step={0.1}
                                           required={true}/>
                                </div>}
                            <div className="pricing-row">
                                <label>Service fees</label>
                                <p className="pricing-input">
                                    €{((!isNaN(parseFloat(formData.ServiceFee)) ? parseFloat(formData.ServiceFee) : 0)).toFixed(2)}
                                </p>
                            </div>
                            <hr/>
                            <div className="pricing-row">
                                <label>Guest's price</label>
                                <p className="pricing-input">
                                    €{((!isNaN(parseFloat(formData.Rent)) ? parseFloat(formData.Rent) : 0) +
                                    (!isNaN(parseFloat(formData.CleaningFee)) ? parseFloat(formData.CleaningFee) : 0) +
                                    (!isNaN(parseFloat(formData.ServiceFee)) ? parseFloat(formData.ServiceFee) : 0)).toFixed(2)}
                                </p>
                            </div>
                        </section>
                        <section className="accommodation-pricing">
                            <div className="pricing-row">
                                <label>You earn</label>
                                <p className="pricing-input">
                                    €{((!isNaN(parseFloat(formData.Rent)) ? parseFloat(formData.Rent) : 0) +
                                    (!isNaN(parseFloat(formData.CleaningFee)) ? parseFloat(formData.CleaningFee) : 0)).toFixed(2)}
                                </p>
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!formData.Rent ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!formData.Rent} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 9:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Share your first availability' : 'Edit your availability'}</h2>
                        <p className="onboardingSectionSubtitle">You can edit and delete availabilities later within
                            your dashboard</p>
                        <section className="listing-calendar">
                            <CalendarComponent passedProp={formData} isNew={true} updateDates={updateDates}/>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className='onboarding-button'
                                    onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 10:
                return (
                    <div className="container" id="summary" style={{width: '80%'}}>
                        <h2>Please check if everything is correct</h2>
                        <table className="accommodation-summary">
                            <tbody>
                            <tr>
                                <th>
                                    <h3>
                                        Property Details:
                                    </h3>
                                </th>
                            </tr>
                            <tr>
                                <td>Title:</td>
                                <td>{formData.Title}</td>
                            </tr>
                            <tr>
                                <td>Description:</td>
                                <td>{formData.Description}</td>
                            </tr>
                            <tr>
                                <td>Rent:</td>
                                <td>{formData.Rent}</td>
                            </tr>
                            <tr>
                                <td>Accommodation Type:</td>
                                <td>{selectedAccoType}</td>
                            </tr>
                            <tr>
                                <td>Date Range:</td>
                                <td>
                                    {formData.DateRanges.length > 0 ? (
                                        `Available from ${DateFormatterDD_MM_YYYY(formData.DateRanges[0].startDate)} 
                                        to ${DateFormatterDD_MM_YYYY(formData.DateRanges[formData.DateRanges.length - 1].endDate)}`
                                    ) : "Date range not set"}
                                </td>
                            </tr>
                            <tr>
                                <td>Number of Guests:</td>
                                <td>{formData.GuestAmount}</td>
                            </tr>
                            {selectedAccoType === 'Boat' ? (
                                <tr>
                                    <td>Number of Cabins:</td>
                                    <td>{formData.Cabins}</td>
                                </tr>
                            ) : selectedAccoType === 'Camper' ? (
                                <tr>
                                    <td>Number of Rooms:</td>
                                    <td>{formData.Rooms}</td>
                                </tr>
                            ) : (
                                <tr>
                                    <td>Number of Bedrooms:</td>
                                    <td>{formData.Bedrooms}</td>
                                </tr>
                            )}
                            <tr>
                                <td>Number of Bathrooms:</td>
                                <td>{formData.Bathrooms}</td>
                            </tr>
                            <tr>
                                <td>Number of Fixed Beds:</td>
                                <td>{formData.Beds}</td>
                            </tr>
                            <tr>
                                <td>{`Country${(selectedAccoType === 'Boat' || selectedAccoType === 'Camper') ? ' of registration' : ''}:`}</td>
                                <td>{formData.Country}</td>
                            </tr>
                            <tr>
                                <td>City:</td>
                                <td>{formData.City}</td>
                            </tr>
                            { selectedAccoType === 'Boat' ? (
                                <tr>
                                    <td>Harbour:</td>
                                    <td>{formData.Harbour}</td>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <td>Postal Code:</td>
                                        <td>{formData.PostalCode}</td>
                                    </tr>
                                    <tr>
                                        <td>Street + House Nr.:</td>
                                        <td>{formData.Street}</td>
                                    </tr>
                                </>
                            )}
                            </tbody>
                        </table>
                        {
                            selectedAccoType === 'Boat' ? (
                                <>
                                    <th>
                                        <h3>Specifications:</h3>
                                    </th>
                                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                        <tbody>
                                        <tr>
                                            <td>Manufacturer:</td>
                                            <td>{formData.Manufacturer}</td>
                                        </tr>
                                        <tr>
                                            <td>Model:</td>
                                            <td>{formData.Model}</td>
                                        </tr>
                                        <tr>
                                            <td>General periodic inspection:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.GPI)}</td>
                                        </tr>
                                        <tr>
                                            <td>Maximum capacity:</td>
                                            <td>{formData.Capacity}{formData.Capacity > 1 ? 'People' : 'Person'}</td>
                                        </tr>
                                        <tr>
                                            <td>Length in meters:</td>
                                            <td>{formData.Length} meter</td>
                                        </tr>
                                        <tr>
                                            <td>Fuel usage:</td>
                                            <td>{formData.FuelTank} Liter(s) per hour</td>
                                        </tr>
                                        <tr>
                                            <td>Top speed:</td>
                                            <td>{formData.Speed} Kilometers per hour</td>
                                        </tr>
                                        <tr>
                                            <td>Year of construction:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.YOC)}</td>
                                        </tr>
                                        { formData.Renovated && (
                                            <tr>
                                                <td>Renovated on:</td>
                                                <td>{DateFormatterDD_MM_YYYY(formData.Renovated)}</td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </>
                            ) : selectedAccoType === 'Camper' && (
                                <>
                                    <th>
                                        <h3>Specifications:</h3>
                                    </th>
                                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                        <tbody>
                                        <tr>
                                            <td>License plate characters:</td>
                                            <td>{formData.LicensePlate}</td>
                                        </tr>
                                        <tr>
                                            <td>Brand:</td>
                                            <td>{formData.CamperBrand}</td>
                                        </tr>
                                        <tr>
                                            <td>Model:</td>
                                            <td>{formData.Model}</td>
                                        </tr>
                                        <tr>
                                            <td>Required type of driver's license:</td>
                                            <td>{formData.Requirement}</td>
                                        </tr>
                                        <tr>
                                            <td>General periodic inspection:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.GPI)}</td>
                                        </tr>
                                        <tr>
                                            <td>Height in meters:</td>
                                            <td>{formData.Height} meter</td>
                                        </tr>
                                        <tr>
                                            <td>Length in meters:</td>
                                            <td>{formData.Length} meter</td>
                                        </tr>
                                        <tr>
                                            <td>Fuel usage:</td>
                                            <td>{formData.FuelTank} Liter(s) per hour</td>
                                        </tr>
                                        <tr>
                                            <td>Transmission:</td>
                                            <td>{formData.Transmission}</td>
                                        </tr>
                                        <tr>
                                            <td>Year of construction:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.YOC)}</td>
                                        </tr>
                                        {formData.Renovated && (
                                            <tr>
                                                <td>Renovated on:</td>
                                                <td>{DateFormatterDD_MM_YYYY(formData.Renovated)}</td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </>
                            )
                        }
                        { !(Object.values(formData.Features).every(arr => arr.length === 0)) &&
                            <>
                                <th>
                                    <h3>Features:</h3>
                                </th>
                                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                    <tbody>
                                    {Object.keys(formData.Features).map(category => (
                                        <>
                                            {formData.Features[category].length > 0 && (
                                                <tr key={category}>
                                                    <td colSpan={2}
                                                        style={{
                                                            fontWeight: 'bold',
                                                            borderBottom: '1px solid #ccc'
                                                        }}>{category}:
                                                    </td>
                                                </tr>
                                            )}
                                            {formData.Features[category].map((amenity, index) => (
                                                <tr key={`${category}-${index}`}>
                                                    <td style={{borderBottom: '1px solid #ccc'}}>{amenity}</td>
                                                    <td style={{borderBottom: '1px solid #ccc'}}>Yes</td>
                                                </tr>
                                            ))}
                                        </>
                                    ))}
                                    </tbody>
                                </table>
                            </>
                        }


                        <p>Your accommodation ID: {formData.ID}</p>
                        <p>{formData.Drafted ? "Guests cannot book your accommodation before you set it live via Hostdashboard -> Listing"
                            : "Guests can book your accommodation anytime now!"}
                        </p>
                        <label>
                            <input
                                type="checkbox"
                                className="radioInput"
                                name="Drafted"
                                onChange={() => setDrafted(!formData.Drafted)}
                                disabled={!(formData.DateRanges.length > 0 && hasStripe)}
                                checked={formData.Drafted}
                            />
                            Mark as draft (Stripe account and date range is required)
                        </label>
                        <div className='onboarding-button-box'>
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}
                                    style={{opacity: "75%"}}>
                                Go back to change
                            </button>
                            <button className='onboarding-button' onClick={
                                isNew ? () => {
                                    handleSubmit();
                                    pageUpdater(page + 1)
                                } : () => {
                                    handleUpdate();
                                    pageUpdater(page + 1)
                                }
                            }>{isNew ? 'Confirm' : 'Confirm and update'}
                            </button>
                        </div>
                    </div>
                );
            case 11:
                if (isLoading) {
                    return (
                        <main className="loading">
                            <h2 className="spinner-text">Please wait a moment...</h2>
                            <img className="spinner" src={spinner}/>
                        </main>
                    );
                } else {
                    return (
                        <div className="container">
                            <h2>
                                Congratulations! Your accommodation is being listed
                            </h2>
                            <p className="onboardingSectionSubtitle">It may take a while before your accommodation is
                                verified</p>
                            <div className='button-box-last'>
                            <button className='onboarding-button' onClick={() => navigate("/hostdashboard/listings")}>Go to my listings
                                </button>
                                <button className='onboarding-button' onClick={() => navigate("/hostdashboard")}>Go to
                                    dashboard
                                </button>
                            </div>
                        </div>
                    );
                }
            default:
                return null;
        }
    };

    return (
        renderPageContent(page)
    );
}

export default OnboardingHost;