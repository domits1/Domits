import React, { useState, useMemo, useEffect } from "react";
import {useLocation, useNavigate} from 'react-router-dom';
import spinner from "../../images/spinnner.gif";
import info from "../../images/icons/info.png";
import './onboardingHost.css';
import Select from 'react-select'
import countryList from 'react-select-country-list'
import MapComponent from "./data/MapComponent";
import { Storage, Auth } from "aws-amplify"
import Calendar from "../hostdashboard/Calendar";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import Apartment from "../../images/icons/flat.png";
import House from "../../images/icons/house.png";
import Villa from "../../images/icons/mansion.png";
import Boat from "../../images/icons/house-boat.png";
import Camper from "../../images/icons/camper-van.png";
import Cottage from "../../images/icons/cottage.png";
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
    let [hasAccoType, setHasAccoType] = useState(false);
    let [hasGuestAccess, setHasGuestAccess] =useState(false);
    let [hasAddress, setHasAddress] = useState(false);

    useEffect(() => {
        const fetchAccommodation = async () => {
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
            }
        };


        if (!isNew && oldAccoID) {
            fetchAccommodation();
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
    const accommodationIcons = {
        "Apartment": Apartment,
        "House": House,
        "Villa": Villa,
        "Boat": Boat,
        "Camper": Camper,
        "Cottage": Cottage
    };
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
    const [formData, setFormData] = useState({
        ID: generateUUID(),
        Title: "",
        Subtitle: "",
        Description: "",
        Rent: 1,
        GuestAmount: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
        Country: "",
        PostalCode: "",
        Street: "",
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
            image5: "",
        },
        StartDate: "",
        EndDate: "",
        Drafted: true,
        AccommodationType: "",
        ServiceFee: 0,
        GuestAccess: "",
        OwnerId: "",
        CleaningFee: 0
    });

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
            Outdoor: [
            'Patio or balcony',
            'Outdoor furniture',
            'Grill',
            'Fire pit',
            'Pool',
            'Hot tub',
            'Garden or backyard',
            'Bicycle'
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
        ]
    };

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
    useEffect(() => {
        if (formData.AccommodationType) {
            setHasAccoType(true);
        }
        if (formData.GuestAccess) {
            setHasGuestAccess(true);
        }
        if (formData.Country && formData.City && formData.Street && formData.PostalCode) {
            setHasAddress(true);
        } else {
            setHasAddress(false);
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
            GuestAccess: access
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


    const handleInputChange = (event) => {
        const { name, type, checked, value } = event.target;
        console.log(formData);
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
    const handleUpdate = async () => {
        try {
            setIsLoading(true);

            setImageFiles([]);

            if (!formData.CleaningFee) {
                setFormData((prevData) => ({
                    ...prevData,
                    CleaningFee: 0
                }));
            }
            console.log(formData);
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
        updatedFormData.Images[key] = ""; // Clear the value associated with the key
        setFormData(updatedFormData);
    };

    const updateDates = (start, end) => {
        setFormData(prev => ({ ...prev, StartDate: start, EndDate: end }));
    };
    const [isLoading, setIsLoading] = useState(true);

    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'What best describes your accommodation?' : 'Edit your accommodation type'}</h2>

                        <section className="accommodation-types">
                            {accoTypes.map((option, index) => (
                                <div
                                    key={index}
                                    className={`option ${formData.AccommodationType === option ? 'selected' : ''}`}
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
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'What kind of space do your guests have access to?' : 'Change the type of access your guests can have'}</h2>

                        <section className="guest-access">
                            <div className={formData.GuestAccess === 'Entire house' ? 'guest-access-item-selected' : 'guest-access-item'}
                                 onClick={() => changeGuestAccess("Entire house")}>
                                <h3 className="guest-access-header">Entire house</h3>
                                <p>Guests have the entire space to themselves</p>
                            </div>
                            <div className={formData.GuestAccess === 'Room' ? 'guest-access-item-selected' : 'guest-access-item'}
                                 onClick={() => changeGuestAccess("Room")}>
                                <h3 className="guest-access-header">Room</h3>
                                <p>Guests have their own room in a house and share other spaces</p>
                            </div>
                            <div className={formData.GuestAccess === 'Shared room' ? 'guest-access-item-selected' : 'guest-access-item'}
                                 onClick={() => changeGuestAccess("Shared room")}>
                                <h3 className="guest-access-header">A shared room</h3>
                                <p>Guests sleep in a room or common area that they may share with you or others</p>
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)} style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!hasGuestAccess ? 'onboarding-button-disabled' : 'onboarding-button'} disabled={!hasGuestAccess} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 2:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Where can we find your accommodation?' : 'Change the location of your accommodation'}</h2>
                        <p className="onboardingSectionSubtitle">We only share your address with guests after they have
                            booked</p>

                        <section className="acco-location">
                            <section className="location-left">
                                <label htmlFor="country">Country*</label>
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
                            </section>
                            <section className="location-right">
                                <h2 className="onboardingSectionTitle">What we show on Domits</h2>
                                <MapComponent location={location}/>
                            </section>
                        </section>
                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)} style={{opacity: "75%"}}>
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
                            <div className="guest-amount-item">
                                <p>Bedrooms</p>
                                <div className="amount-btn-box">
                                    <button className="round-button" onClick={() => decrementAmount('Bedrooms')}>-
                                    </button>
                                    {formData.Bedrooms}
                                    <button className="round-button" onClick={() => incrementAmount('Bedrooms')}>+
                                    </button>
                                </div>
                            </div>
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
                    <main className="container">
                        <h2 className="onboardingSectionTitle">{isNew ? 'Let guests know what your space has to offer.' : 'Edit your amenities'}</h2>
                        <p className="onboardingSectionSubtitle">You can add more facilities after publishing your
                            listing</p>
                        <div>
                            {Object.keys(allAmenities).map(category => (
                                <div key={category} style={{marginBottom: '5%'}}>
                                    <h2 className="amenity-header">{category}</h2>
                                    <section className="check-box">
                                        {allAmenities[category].map(amenity => (
                                            <label key={amenity}>
                                                <input
                                                    type="checkbox"
                                                    className="radioInput"
                                                    name={amenity}
                                                    onChange={(e) => handleAmenities(category, amenity, e.target.checked)}
                                                    checked={formData.Features[category].includes(amenity)}
                                                />
                                                {amenity}
                                            </label>
                                        ))}
                                    </section>
                                </div>
                            ))}
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
                        <h2 className="onboardingSectionTitle">{isNew ? 'Add photos of your home' : 'Edit photos of your home'}</h2>

                        <section className="accommodation-photos">
                            {!formData.Images.image1 ?
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
                        <h2 className="onboardingSectionTitle">{isNew ? 'Name your home' : 'Edit the name of your home'}</h2>
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
                                maxLength={32}
                            />
                            <p>{formData.Title.length}/32</p>
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
                                maxLength={32}
                            />
                            <p>{formData.Subtitle.length}/32</p>
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
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)} style={{opacity: "75%"}}>
                                Go back
                            </button>
                            <button className={!formData.Description ? 'onboarding-button-disabled' : 'onboarding-button'}
                                    disabled={!formData.Description} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
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
                                           defaultValue={formData.CleaningFee ? formData.CleaningFee : 1} min={1} step={0.1}
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
                            <Calendar passedProp={formData} isNew={true} updateDates={updateDates}/>
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
                    <div className="container" style={{width: '80%'}}>
                        <h2>Please check if everything is correct</h2>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <tbody>
                            <tr>
                                <th style={{
                                    textAlign: 'left',
                                    borderBottom: '1px solid #ccc',
                                    paddingBottom: '8px'
                                }}>Property Details
                                </th>
                                <th style={{
                                    textAlign: 'left',
                                    borderBottom: '1px solid #ccc',
                                    paddingBottom: '8px'
                                }}>Value
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
                                <td>Room Type:</td>
                                <td>{formData.AccommodationType}</td>
                            </tr>
                            <tr>
                                <td>Date Range:</td>
                                <td>
                                    {formData.StartDate && formData.EndDate ? (
                                        `Available from ${DateFormatterDD_MM_YYYY(formData.StartDate)} to ${DateFormatterDD_MM_YYYY(formData.EndDate)}`
                                    ) : "Date range not set"}
                                </td>
                            </tr>
                            <tr>
                                <td>Number of Guests:</td>
                                <td>{formData.Guestamount}</td>
                            </tr>
                            <tr>
                                <td>Number of Bedrooms:</td>
                                <td>{formData.Bedrooms}</td>
                            </tr>
                            <tr>
                                <td>Number of Bathrooms:</td>
                                <td>{formData.Bathrooms}</td>
                            </tr>
                            <tr>
                                <td>Number of Fixed Beds:</td>
                                <td>{formData.Beds}</td>
                            </tr>
                            <tr>
                                <td>Country:</td>
                                <td>{formData.Country}</td>
                            </tr>
                            <tr>
                                <td>Postal Code:</td>
                                <td>{formData.PostalCode}</td>
                            </tr>
                            <tr>
                                <td>Street + House Nr.:</td>
                                <td>{formData.Street}</td>
                            </tr>
                            </tbody>
                        </table>
                        <h3>Features:</h3>
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <tbody>
                            {Object.keys(formData.Features).map(category => (
                                <>
                                    {formData.Features[category].length > 0 && (
                                        <tr key={category}>
                                            <td colSpan={2}
                                                style={{fontWeight: 'bold', borderBottom: '1px solid #ccc'}}>{category}:
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
                                disabled={!(formData.StartDate && formData.EndDate && hasStripe)}
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
                        <div className="loading">
                            <p className="spinner-text">Please wait a moment...</p>
                            <img className="spinner" src={spinner}/>
                        </div>
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