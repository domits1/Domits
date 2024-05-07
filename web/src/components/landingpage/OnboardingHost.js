import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import './onboardingHost.css';
import Select from 'react-select'
import countryList from 'react-select-country-list'
import MapComponent from "./data/MapComponent";
import { Auth } from "aws-amplify";

function OnboardingHost() {
    const navigate = useNavigate();
    const options = useMemo(() => countryList().getLabels(), []);
    const [location, setLocation] = useState({
        latitude: 0,
        longitude: 0,
    });

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const s3 = new AWS.S3({
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        region: process.env.REACT_APP_AWS_REGION
    });

    let [userId, setUserId] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        Auth.currentUserInfo().then(user => {
            if (user) {
                setUserId(user.attributes.sub);
            } else {
                navigate('/login'); // Redirect to login if not logged in
            }
        }).catch(error => {
            console.error("Error setting user id:", error);
            navigate('/login'); // Redirect on error
        });
    }, [navigate]);

    const [page, setPage] = useState(1); // Track the current page
    const [formData, setFormData] = useState({
        ID: generateUUID(),
        Title: "",
        Subtitle: "",
        Description: "",
        Rent: "",
        Guesttype: "",
        Guestamount: "",
        Bedrooms: "",
        Bathrooms: "",
        Beds: "",
        Country: "",
        PostalCode: "",
        Street: "",
        City: "",
        CancelPolicy: "",
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
        AccommodationType: "",
        Measurement: "",
        OwnerId: ""
    });

    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
    };

    const isFormFilled = () => {
        const excludedFields = ['OwnerId'];

        // Check if all fields except excluded ones are filled
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
    };

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

    const handleInputChange = (event) => {
        const { name, type, checked, value } = event.target;
        console.log(formData)

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

    const handleSubmit = async () => {
        try {
            const UserID = userId; // Assuming userId is available in scope
            const AccoID = formData.ID;
            const updatedFormData = { ...formData }; // Copy the original formData object
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const params = {
                    Bucket: 'accommodation',
                    Key: `images/${UserID}/${AccoID}/Image-${i + 1}`, // Numerical names for images
                    Body: file
                };
                const data = await s3.upload(params).promise();
                updatedFormData.Images[`image${i + 1}`] = data.Location;
                console.log(`Uploaded file ${i + 1}:`, data.Location);
            }
            setFormData(updatedFormData);
            setSelectedFiles([]);

            const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/CreateAccomodation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                console.log('Form data saved successfully');

            } else {
                console.error('Error saving form data');
            }
        } catch (error) {
            console.error('Error:', error);
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




    const renderPageContent = (page) => {
        switch (page) {
            case 1:
                return (
                    <main className="container">
                        <h2 className="onboardingSectionTitle">Accommodation Information</h2>
                        <section className="flex-row form-row">
                            <section className="form-section">

                                <label htmlFor="title">Title</label>
                                <input
                                    className="textInput locationText"
                                    id="title"
                                    name="Title"
                                    onChange={handleInputChange}
                                    value={formData.Title}
                                />
                                <label htmlFor="Subtitle">Subtitle</label>
                                <input
                                    className="textInput locationText"
                                    id="Subtitle"
                                    name="Subtitle"
                                    onChange={handleInputChange}
                                    value={formData.Subtitle}
                                />
                                <label htmlFor="description">Description</label>
                                <textarea
                                    className="textInput locationText"
                                    id="description"
                                    name="Description"
                                    onChange={handleInputChange}
                                    rows="5"
                                    value={formData.Description}
                                ></textarea>
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
                            <h2 className="onboardingSectionTitle">Images</h2>
                            <section className="flex-row">
                                {[...Array(5)].map((_, index) => (
                                    <section key={index} className="images-container">
                                        <input
                                            type="file"
                                            onChange={(e) => handleFileChange(e.target.files[0], index)}
                                            accept="image/*"
                                            className="file-input"
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

                        <nav className="formContainer">
                            <button className='nextButtons' onClick={() => navigate("/hostdashboard")}>
                                Go to dashboard
                            </button>
                            <button className="nextButtons" onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );
            case 2:
                return (
                    <main className="container">
                        <section className="quantity">
                            <h2 className="onboardingSectionTitle">Define Quantity</h2>
                            <div className="input-group">
                                {/* Any additional input-group content can go here */}
                            </div>

                            <div className="form-row">
                                <label htmlFor="bedrooms">How many bedrooms?</label>
                                <input
                                    type="number"
                                    id="bedrooms"
                                    name="Bedrooms"
                                    onChange={handleInputChange}
                                    value={formData.Bedrooms}
                                    min={0}
                                    className="textInput"
                                />

                                <label htmlFor="bathrooms">How many bathrooms?</label>
                                <input
                                    type="number"
                                    id="bathrooms"
                                    name="Bathrooms"
                                    onChange={handleInputChange}
                                    value={formData.Bathrooms}
                                    min={0}
                                    className="textInput"
                                />

                                <label htmlFor="beds">How many fixed beds?</label>
                                <input
                                    type="number"
                                    id="beds"
                                    name="Beds"
                                    onChange={handleInputChange}
                                    value={formData.Beds}
                                    min={0}
                                    className="textInput"
                                />

                                <label htmlFor="guests">Maximum amount of guests?</label>
                                <input
                                    type="number"
                                    id="guests"
                                    name="Guestamount"
                                    onChange={handleInputChange}
                                    value={formData.Guestamount}
                                    min={0}
                                    className="textInput"
                                />
                            </div>
                        </section>

                        <section className="details-policies formContainer">
                            <div className="formHolder">
                                <h2 className="onboardingSectionTitle">Details and Policies</h2>
                                <div className="formRow">
                                    <div className="room-features formRow">
                                        <div className="configurations">
                                            <label htmlFor="measurement">What are the measurements?</label>
                                            <input
                                                type="number"
                                                name="Measurement"
                                                placeholder="M²"
                                                onChange={handleInputChange}
                                                value={formData.Measurement}
                                                min={0}
                                                className="textInput"
                                            />

                                            <label htmlFor="accommodationType">Accommodation Type</label>
                                            <select
                                                value={formData.AccommodationType}
                                                onChange={handleInputChange}
                                                name="AccommodationType"
                                                className="textInput"
                                            >
                                                <option value="Room">Room</option>
                                                <option value="Shared Room">Shared Room</option>
                                                <option value="House">House</option>
                                                <option value="Apartment">Apartment</option>
                                                <option value="Villa">Villa</option>
                                                <option value="Cottage">Cottage</option>
                                                <option value="Hotel">Hotel</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <nav className="formContainer">
                            <button className="nextButtons" onClick={() => pageUpdater(page - 1)}>
                                Go back to change
                            </button>
                            <button className="nextButtons" onClick={() => pageUpdater(page + 1)}>
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>
                );

            case 3:
                return (
                    <main className="container">
                        <section>
                            <section className="locationInput">
                                <h2 className="onboardingSectionTitle">Fill in Location</h2>
                                <label htmlFor="country">Country</label>
                                <Select
                                    options={options.map(country => ({ value: country, label: country }))}
                                    name="Country"
                                    className="locationText"
                                    value={{ value: formData.Country, label: formData.Country }}
                                    onChange={handleCountryChange}
                                    id="country"
                                />
                                <label htmlFor="city">City</label>
                                <input
                                    className="textInput locationText"
                                    name="City"
                                    onChange={handleInputChange}
                                    value={formData.City}
                                    id="city"
                                />
                                <label htmlFor="street">Street + house nr.</label>
                                <input
                                    className="textInput locationText"
                                    name="Street"
                                    onChange={handleInputChange}
                                    value={formData.Street}
                                    id="street"
                                />
                                <label htmlFor="postal">Postal Code</label>
                                <input
                                    className="textInput locationText"
                                    name="PostalCode"
                                    onChange={handleInputChange}
                                    value={formData.PostalCode}
                                    id="postal"
                                />
                            </section>
                            <section className="map-section">
                                <h2 className="onboardingSectionTitle">What we show on Domits</h2>
                                <MapComponent location={location} />
                            </section>
                        </section>
                        <nav className="formContainer">
                            <button className="nextButtons" onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button className="nextButtons" onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                        </nav>
                    </main>
                );

                case 4:
                    return (
                        <main className="container">
                            <section className="room-features formRow">
                                <h2 className="onboardingSectionTitle">Systems and configurations</h2>
                                <div className="form-group">
                                    <p>Cancel policy</p>
                                    <label>
                                        <input
                                            type="radio"
                                            className="radioInput"
                                            name="CancelPolicy"
                                            onChange={handleInputChange}
                                            checked={formData.CancelPolicy === "Users can cancel anytime"}
                                            value="Users can cancel anytime"
                                        />
                                        Users can cancel anytime
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            className="radioInput"
                                            name="CancelPolicy"
                                            onChange={handleInputChange}
                                            checked={formData.CancelPolicy === "No cancel 24h before arrival"}
                                            value="No cancel 24h before arrival"
                                        />
                                        No cancel 24h before arrival
                                    </label>
                                </div>
                                <div className="form-group">
                                    <p>Guest type</p>
                                    <label>
                                        <input
                                            type="radio"
                                            className="radioInput"
                                            name="Guesttype"
                                            onChange={handleInputChange}
                                            checked={formData.Guesttype === "Any guest"}
                                            value="Any guest"
                                        />
                                        Any Guest
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            className="radioInput"
                                            name="Guesttype"
                                            onChange={handleInputChange}
                                            checked={formData.Guesttype === "Verified Domits guest"}
                                            value="Verified Domits guest"
                                        />
                                        Verified Domits guest
                                    </label>
                                </div>
                                <div className="form-group">
                                    <h2 className="onboardingSectionTitle">Add accommodation features</h2>
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
                                </div>
                                <div className="form-group">
                                    <h2 className="onboardingSectionTitle">Fill in safety measures</h2>
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
                                </div>
                            </section>
                            <nav className="formContainer">
                                <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                                <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                            </nav>
                        </main>
                    );
                

            case 5:
                return (
                    <main className="container">
                        <section class="room-features formRow">
                            <p>Price: {formData.Rent}</p>
                            <input className="priceSlider" type="range" name="Rent" onChange={handleInputChange} defaultValue={formData.Rent} min="40" max="1000" step="10" />
                        </section>
                        <nav class="formContainer">

                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button
                                className='nextButtons'
                                onClick={() => {
                                    if (isFormFilled()) {
                                        appendUserId(); // First action
                                        pageUpdater(page + 1); // Second action
                                    }
                                }}
                                style={{
                                    backgroundColor: 'green',
                                    cursor: isFormFilled() ? 'pointer' : 'not-allowed',
                                    opacity: isFormFilled() ? 1 : 0.5
                                }}
                                disabled={!isFormFilled()}
                            >Enlist</button>
                        </nav>
                    </main >
                );


            case 6:
                return (
                    <div className="container" style={{ width: '80%' }}>
                        {console.log(formData)}
                        <h2>Review your information</h2>
                        <div className="formRow">
                            <div className="reviewInfo">
                                <p>Title: {formData.Title}</p>
                                <p>Description: {formData.Description}</p>
                                <p>Rent: {formData.Rent}</p>
                                <p>Room Type: {formData.Roomtype}</p>
                                <p>Number of Guests: {formData.Guestamount}</p>
                                <p>Number of Bedrooms: {formData.Bedrooms}</p>
                                <p>Number of Bathrooms: {formData.Bathrooms}</p>
                                <p>Number of Fixed Beds: {formData.Beds}</p>
                                <p>Country: {formData.Country}</p>
                                <p>Postal Code: {formData.PostalCode}</p>
                                <p>Street + House Nr.: {formData.Street}</p>
                                <p>Neighbourhood: {formData.Neighbourhood}</p>
                            </div>
                            <div className="reviewInfo">
                                <p>Features:</p>
                                <ul>
                                    {Object.entries(formData.Features).map(([feature, value]) => (
                                        <p key={feature}>{feature}: {value ? 'Yes' : 'No'}</p>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className='buttonHolder'>
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button className='nextButtons' onClick={() => { handleSubmit(); pageUpdater(page + 1) }}>Confirm and proceed</button>
                        </div>
                        <p>Your accommodation ID: {formData.ID}</p>
                    </div >
                );


            case 7:
                return (
                    <div className="container">
                        <h2>
                            Congratulations! Your accommodation is being listed
                        </h2>
                        <p>It may take a while before your accommodation is verified</p>
                        <div className='buttonHolder'>
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button className='nextButtons' onClick={() => navigate("/hostdashboard")}>Go to dashboard</button>
                        </div>
                    </div >
                );
            default:
                return null;
        }
    };

    return (
        renderPageContent(page)
    );
}

export default OnboardingHost;