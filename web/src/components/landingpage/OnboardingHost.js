import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
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
import WiFi from "../../images/icons/Wifi.png";
import Airconditioning from "../../images/icons/Airconditioning.png";
import OnsiteParking from "../../images/icons/Onsiteparking.png";
import Television from "../../images/icons/Television.png";
import Kitchen from "../../images/icons/Kitchen.png";
import Washingmachine from "../../images/icons/Washingmachine.png";
import Smokedetector from  "../../images/icons/Smokedetector.png";
import FirstAidKit from  "../../images/icons/FirstAidKit.png";
import HomeOffice from  "../../images/icons/Homeoffice.png";
import FireExtinguisher from "../../images/icons/Fireextinguisher.png";

const S3_BUCKET_NAME = 'accommodation';
const region = 'eu-north-1';
function OnboardingHost() {
    const navigate = useNavigate();
    const options = useMemo(() => countryList().getLabels(), []);
    const [location, setLocation] = useState({
        latitude: 0,
        longitude: 0,
    });
    let [hasAccoType, setHasAccoType] = useState(false);
    let [hasGuestAccess, setHasGuestAccess] =useState(false);
    let [hasAddress, setHasAddress] = useState(false);
    let [stepOne, setStepOne] = useState(null);
    let [stepTwo, setStepTwo] = useState(null);
    let [stepThree, setStepThree] = useState(null);

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
        Rent: "100",
        Guestamount: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
        Country: "",
        PostalCode: "",
        Street: "",
        City: "",
        Features: {
            Wifi: false,
            Television: false,
            Kitchen: false,
            WashingMachine: false,
            Airconditioning: false,
            Onsiteparking: false,
            Homeoffice: false,
            Smokedetector: false,
            FirstAidkit: false,
            Fireextinguisher: false,
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
        GuestAccess: "",
        OwnerId: ""
    });

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
        if (formData.Title && formData.Subtitle && formData.Description && hasImages()) {
            setStepOne(false);
        } else {
            setStepOne(true);
        }

        if (formData.Guestamount && formData.Bedrooms && formData.Bathrooms && formData.Beds) {
            setStepTwo(false);
        } else {
            setStepTwo(true);
        }

        if (formData.Country && formData.City && formData.Street && formData.PostalCode) {
            setHasAddress(true);
        } else {
            setHasAddress(false);
        }
    }, [formData]);

    const isFormFilled = () => {
        const excludedFields = ['OwnerId', 'StartDate', 'EndDate'];
        for (const key in formData) {
            if (excludedFields.includes(key)) {
                continue;
            }
            if (key === 'Images') {
                // Check if all keys inside the Images object are filled
                for (const imageKey in formData.Images) {
                    if (formData.Images[imageKey] === '') {
                        return false;
                    }
                }
            } else if (formData[key] === "" || formData[key] === 0) {
                return false;
            }
        }
        return true;
    }


    const appendUserId = () => {
        setFormData((prevData) => ({
            ...prevData,
            OwnerId: userId
        }));
    }

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
        console.log(formData);
    };
    const changeGuestAccess = (access) => {
        setFormData((prevData) => ({
            ...prevData,
            GuestAccess: access
        }));
        console.log(formData);
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

    const toggleFeature = (feature) => {
        setFormData(prevData => ({
            ...prevData,
            Features: {
                ...prevData.Features,
                [feature]: !prevData.Features[feature]
            }
        }));
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
                },
                Drafted: checked,
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
    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            const AccoID = formData.ID;
            const updatedFormData = { ...formData }; // Copy the original formData object
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const location =  await uploadImageToS3(userId, AccoID, file, i);
                console.log(location);
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

        // Construct formData based on current imageFiles
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

        // Construct formData based on current imageFiles
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
                        <h2 className="onboardingSectionTitle">What best describes your accommodation?</h2>

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
                        <h2 className="onboardingSectionTitle">What kind of space do your guests have access to?</h2>

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
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}>
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
                        <h2 className="onboardingSectionTitle">Where can we find your accommodation?</h2>
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
                                    className="textInput locationText"
                                    name="City"
                                    onChange={handleInputChange}
                                    value={formData.City}
                                    id="city"
                                    placeholder="Select your city"
                                    required={true}
                                />
                                <label htmlFor="street">Street + house nr.*</label>
                                <input
                                    className="textInput locationText"
                                    name="Street"
                                    onChange={handleInputChange}
                                    value={formData.Street}
                                    id="street"
                                    placeholder="Enter your address"
                                    required={true}
                                />
                                <label htmlFor="postal">Postal Code*</label>
                                <input
                                    className="textInput locationText"
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
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}>
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
                        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
                        <section className="guest-amount">
                            <div className="guest-amount-item">
                                <p>Guests</p>
                                <div className="amount-btn-box">
                                    <button className="round-button" onClick={() => decrementAmount('Guestamount')}>-
                                    </button>
                                    {formData.Guestamount}
                                    <button className="round-button" onClick={() => incrementAmount('Guestamount')}>+
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
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}>
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
                        <h2 className="onboardingSectionTitle">Let guests know what your space has to offer.</h2>
                        <p className="onboardingSectionSubtitle">You can add more facilities after publishing your listing</p>
                        <section className="accommodation-types">
                            <div className={`option ${formData.Features.Wifi ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Wifi')}>
                                <img className="amenity-icon" src={WiFi} alt="Wifi"/>
                                WiFi
                            </div>
                            <div className={`option ${formData.Features.Airconditioning ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Airconditioning')}>
                                <img className="amenity-icon" src={Airconditioning} alt="Airco"/>
                                Air conditioning
                            </div>
                            <div className={`option ${formData.Features.Onsiteparking ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Onsiteparking')}>
                                <img className="amenity-icon" src={OnsiteParking} alt="OnsiteParking"/>
                                Onsite parking
                            </div>
                            <div className={`option ${formData.Features.Television ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Television')}>
                                <img className="amenity-icon" src={Television} alt="Television"/>
                                Television
                            </div>
                            <div className={`option ${formData.Features.Kitchen ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Kitchen')}>
                                <img className="amenity-icon" src={Kitchen} alt="Kitchen"/>
                                Kitchen
                            </div>
                            <div className={`option ${formData.Features.WashingMachine ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('WashingMachine')}>
                                <img className="amenity-icon" src={Washingmachine} alt="Washingmachine"/>
                                Washing machine
                            </div>
                            <div className={`option ${formData.Features.Homeoffice ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Homeoffice')}>
                                <img className="amenity-icon" src={HomeOffice} alt="Homeoffice"/>
                                Home office
                            </div>
                            <div className={`option ${formData.Features.Smokedetector ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Smokedetector')}>
                                <img className="amenity-icon" src={Smokedetector} alt="Smokedetector"/>
                                Smoke detector
                            </div>
                            <div className={`option ${formData.Features.FirstAidkit ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('FirstAidkit')}>
                                <img className="amenity-icon" src={FirstAidKit} alt="Firstaidkit"/>
                                First aid kit
                            </div>
                            <div className={`option ${formData.Features.Fireextinguisher ? 'selected' : ''}`}
                                 onClick={() => toggleFeature('Fireextinguisher')}>
                                <img className="amenity-icon" src={FireExtinguisher} alt="Fireextinguisher"/>
                                Fire extinguisher
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button className='onboarding-button' onClick={() => pageUpdater(page - 1)}>
                                Go back
                            </button>
                            <button className="onboarding-button"
                                    onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 100:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">Step 1: Accommodation Information</h2>
                        <section className="flex-row form-row">
                            <section className="form-section">

                                <label htmlFor="title">Title*</label>
                                <input
                                    className="textInput locationText"
                                    id="title"
                                    name="Title"
                                    onChange={handleInputChange}
                                    value={formData.Title}
                                    placeholder="Enter your title here..."
                                    required={true}
                                />
                                <label htmlFor="Subtitle">Subtitle*</label>
                                <input
                                    className="textInput locationText"
                                    id="Subtitle"
                                    name="Subtitle"
                                    onChange={handleInputChange}
                                    value={formData.Subtitle}
                                    placeholder="Enter your subtitle here..."
                                    required={true}
                                />
                                <label htmlFor="description">Description*</label>
                                <textarea
                                    className="textInput locationText"
                                    id="description"
                                    name="Description"
                                    onChange={handleInputChange}
                                    rows="5"
                                    value={formData.Description}
                                    placeholder="Tell us something about your accommodation..."
                                    required={true}
                                ></textarea>
                                <label htmlFor="accommodationType">Accommodation Type*</label>
                                <select
                                    value={formData.AccommodationType}
                                    onChange={handleInputChange}
                                    name="AccommodationType"
                                    className="textInput"
                                    required={true}
                                >
                                    <option value="Room">Room</option>
                                    <option value="Shared Room">Shared Room</option>
                                    <option value="House">House</option>
                                    <option value="Apartment">Apartment</option>
                                    <option value="Villa">Villa</option>
                                    <option value="Cottage">Cottage</option>
                                    <option value="Hotel">Hotel</option>
                                    <option value="Boat">Boat</option>
                                    <option value="Camper">Camper</option>
                                </select>
                            </section>
                            <section className="images-container thumbnail-container">
                                {imageFiles[0] && (
                                    <img
                                        src={URL.createObjectURL(imageFiles[0])}
                                        alt="First Image"
                                        className="file-image placeholder"
                                    />
                                )}
                                {!imageFiles[0] && <div className="placeholder">Your Thumbnail</div>}
                            </section>
                        </section>
                        <section className="form-section">
                            <h2 className="onboardingSectionTitle">Images*</h2>
                            <section className="flex-row">
                                {[...Array(5)].map((_, index) => (
                                    <section key={index} className="images-container">
                                        <input
                                            type="file"
                                            onChange={(e) => handleFileChange(e.target.files[0], index)}
                                            accept="image/*"
                                            className="file-input"
                                            required={true}
                                        />
                                        {imageFiles[index] && (
                                            <>
                                                <img
                                                    src={URL.createObjectURL(imageFiles[index])}
                                                    alt={`Image ${index + 1}`}
                                                    className="file-image"
                                                />
                                                <button className="delete-button" onClick={() => handleDelete(index)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        {!imageFiles[index] && <div className="placeholder">Image {index + 1}</div>}
                                    </section>
                                ))}
                            </section>
                        </section>

                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>
                        <nav className="formContainer">
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>
                                Go back
                            </button>
                            <button className="nextButtons" disabled={stepOne} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 101:
                return (
                    <main className="container">
                        <section className="quantity">
                            <h2 className="onboardingSectionTitle">Step 2: Specifications</h2>
                            <div className="input-group">
                            </div>
                            <div className="form-row">
                                <label htmlFor="guests">Maximum amount of guests*</label>
                                <input
                                    type="number"
                                    id="guests"
                                    name="Guestamount"
                                    onChange={handleInputChange}
                                    value={formData.Guestamount}
                                    min={0}
                                    className="textInput"
                                    placeholder="How many guests can you accept?"
                                    required={true}
                                />
                                <label htmlFor="bedrooms">Amount of bedrooms*</label>
                                <input
                                    type="number"
                                    id="bedrooms"
                                    name="Bedrooms"
                                    onChange={handleInputChange}
                                    value={formData.Bedrooms}
                                    min={0}
                                    className="textInput"
                                    placeholder="How many badrooms does it have?"
                                    required={true}
                                />

                                <label htmlFor="bathrooms">Amount of bathrooms*</label>
                                <input
                                    type="number"
                                    id="bathrooms"
                                    name="Bathrooms"
                                    onChange={handleInputChange}
                                    value={formData.Bathrooms}
                                    min={0}
                                    className="textInput"
                                    placeholder="How many bathrooms does it have?"
                                    required={true}
                                />

                                <label htmlFor="beds">Amount of beds*</label>
                                <input
                                    type="number"
                                    id="beds"
                                    name="Beds"
                                    onChange={handleInputChange}
                                    value={formData.Beds}
                                    min={0}
                                    className="textInput"
                                    placeholder="How many fixed beds does it have?"
                                    required={true}
                                />
                            </div>
                        </section>
                        <div className="form-group">
                            <h2 className="onboardingSectionTitle">Fill in safety measures</h2>
                            <section className="check-box">
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Smokedetector"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Smokedetector}
                                    />
                                    Smoke detector
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="FirstAidkit"
                                        onChange={handleInputChange}
                                        checked={formData.Features.FirstAidkit}
                                    />
                                    First Aid kit
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Fireextinguisher"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Fireextinguisher}
                                    />
                                    Fire extinguisher
                                </label>
                            </section>
                        </div>
                        <div className="form-group">
                            <h2 className="onboardingSectionTitle">Add accommodation features</h2>
                            <p>You can select one or more items below</p>
                            <section className="check-box">
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Wifi"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Wifi}
                                    />
                                    Wifi
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Television"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Television}
                                    />
                                    Television
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Kitchen"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Kitchen}
                                    />
                                    Kitchen
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="WashingMachine"
                                        onChange={handleInputChange}
                                        checked={formData.Features.WashingMachine}
                                    />
                                    Washing machine
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Airconditioning"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Airconditioning}
                                    />
                                    Airconditioning
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Onsiteparking"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Onsiteparking}
                                    />
                                    Onsite parking
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        className="radioInput"
                                        name="Homeoffice"
                                        onChange={handleInputChange}
                                        checked={formData.Features.Homeoffice}
                                    />
                                    Home office
                                </label>
                            </section>
                        </div>
                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>
                        <nav className="formContainer">
                            <button className="nextButtons" onClick={() => pageUpdater(page - 1)}>
                                Go back to change
                            </button>
                            <button className="nextButtons" disabled={stepTwo} onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 4:
                return (
                    <main className="container">
                        <section class="room-features formRow">
                            <h2 className="onboardingSectionTitle">Step 4: Pricing</h2>
                            <p>Price per night*: {formData.Rent}</p>
                            <div className="slider-bar">
                                <p>40</p>
                                <input className="priceSlider" type="range" name="Rent" onChange={handleInputChange}
                                       defaultValue={formData.Rent} min="40" max="1000" step="10"
                                       required={true}/>
                                <p>1000</p>
                            </div>
                        </section>
                        <h2 className="onboardingSectionTitle">Availabilities</h2>
                        <section className="listing-calendar">
                            <Calendar passedProp={formData} isNew={true} updateDates={updateDates}/>
                        </section>
                        <label>
                            <input
                                type="checkbox"
                                className="radioInput"
                                name="Drafted"
                                onChange={handleInputChange}
                                disabled={!(formData.StartDate && formData.EndDate && hasStripe)}
                                checked={formData.Drafted}
                            />
                            Mark as draft (Stripe account and date range is required)
                        </label>
                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>
                        <nav class="formContainer">
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change
                            </button>
                            <button
                                className='nextButtons'
                                onClick={() => {
                                    if (isFormFilled) {
                                        appendUserId();
                                        pageUpdater(page + 1);
                                    }
                                }}
                                style={{
                                    backgroundColor: 'green',
                                    width: '7vw',
                                    cursor: isFormFilled() ? 'pointer' : 'not-allowed',
                                    opacity: isFormFilled() ? 1 : 0.5
                                }}
                                disabled={!isFormFilled()}
                            >Enlist
                            </button>
                        </nav>
                    </main>
                );


            case 6:
                return (
                    <div className="container" style={{width: '80%'}}>
                        <h2>Step 5: Review your information</h2>
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
                            {Object.entries(formData.Features).map(([feature, value]) => (
                                <tr key={feature}>
                                    <td style={{borderBottom: '1px solid #ccc'}}>{feature}:</td>
                                    <td style={{borderBottom: '1px solid #ccc'}}>{value ? 'Yes' : 'No'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        <div className='buttonHolder'>
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change
                            </button>
                            <button className='nextButtons' onClick={() => {
                                handleSubmit();
                                pageUpdater(page + 1)
                            }}>Confirm and proceed
                            </button>
                        </div>
                        <p>Your accommodation ID: {formData.ID}</p>
                    </div>
                );


            case 7:
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
                            <p>It may take a while before your accommodation is verified</p>
                            <div className='buttonHolder'>
                                <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to
                                    change
                                </button>
                                <button className='nextButtons' onClick={() => navigate("/hostdashboard")}>Go to
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