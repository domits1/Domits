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

    const handleFileSubmit = async () => {
        try {
            const UserID = userId; // Assuming userId is available in scope
            const AccoID = formData.ID;
            const updatedFormData = { ...formData }; // Copy the original formData object
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const params = {
                    Bucket: 'accommodation',
                    Key: `images/${UserID}/${AccoID}/Image-${i + 1}.jpg`, // Include file extension ".jpg"
                    Body: file
                };
                const data = await s3.upload(params).promise();
                // Update the corresponding property in the formData object
                updatedFormData.Images[`image${i + 1}`] = data.Location;
            }
            // Set the updated formData object with image paths
            setFormData(updatedFormData);
            // Reset selectedFiles after successful upload
            setSelectedFiles([]);
        } catch (error) {
            console.error('Error uploading files:', error);
        }
    };


    const handleFileChange = (event) => {
        const files = Array.from(event.target.files).filter(
            (file) => file.type.startsWith('image/')
        );
        if (files.length + selectedFiles.length > 5) {
            alert('You can only upload up to 5 images.');
            return;
        }
    
        // Update formData.Images with the selected files
        const updatedImages = { ...formData.Images };
        files.forEach((file, index) => {
            updatedImages[`image${selectedFiles.length + index + 1}`] = file.name;
        });
    
        setFormData((prevData) => ({
            ...prevData,
            Images: updatedImages
        }));
    
        setSelectedFiles([...selectedFiles, ...files]);
    };
    
    const handleDelete = (index) => {
        const updatedFiles = [...selectedFiles];
        const imageKeys = Object.keys(formData.Images);
        updatedFiles.splice(index, 1);
    
        // Update the corresponding image key to an empty string
        const updatedImages = { ...formData.Images };
        updatedImages[imageKeys[index]] = '';
    
        setSelectedFiles(updatedFiles);
        setFormData((prevData) => ({
            ...prevData,
            Images: updatedImages,
        }));
    };
    
    

    const combinedSubmit = async () => {
        await handleFileSubmit(); // Wait for handleFileSubmit to complete
        handleSubmit(); // Then execute handleSubmit
    }


    const renderPageContent = (page) => {
        switch (page) {
            case 1:
                return (
                    <div>
                        <div class="formContainer">
                            <div class="form-section">
                                <div className="formRow">
                                    <div class="quantity">
                                        <h2 className="onboardingSectionTitle">Define quantity</h2>
                                        <div className="input-group">
                                            <label for="guests">Maximun amount of guests?</label>
                                            <input className="textInput" type="number" id="guests" name="Guestamount" onChange={handleInputChange} value={formData.Guests} min={0}></input>
                                        </div>
                                        <div className="input-group">
                                            <label for="bedrooms">How many bedrooms?</label>
                                            <input className="textInput" type="number" id="bedrooms" name="Bedrooms" onChange={handleInputChange} value={formData.Bedrooms} min={0}></input>
                                        </div>
                                        <div className="input-group">
                                            <label for="bathrooms">How many bathrooms?</label>
                                            <input className="textInput" type="number" id="bathrooms" name="Bathrooms" onChange={handleInputChange} value={formData.Bathrooms} min={0}></input>
                                        </div>
                                        <div className="input-group">
                                            <label for="beds">How many fixed beds?</label>
                                            <input className="textInput" type="number" id="beds" name="Beds" onChange={handleInputChange} value={formData.Beds} min={0}></input>
                                        </div>
                                    </div>
                                </div>
                                <div class="locationInput">
                                    <h2 className="onboardingSectionTitle">Fill in Location</h2>
                                    <div className="input-group">
                                        <label for="country">Country</label>
                                        <Select
                                            options={options.map(country => ({ value: country, label: country }))}
                                            name="Country"
                                            className="locationText"
                                            value={{ value: formData.Country, label: formData.Country }}
                                            onChange={handleCountryChange}
                                            id="country"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label for="city">City</label>
                                        <input
                                            className="textInput locationText"
                                            name="City"
                                            onChange={handleInputChange}
                                            value={formData.City}
                                            id="city"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label for="street">
                                            Street + house nr.
                                        </label>
                                        <input
                                            className="textInput locationText"
                                            name="Street"
                                            onChange={handleInputChange}
                                            value={formData.Street}
                                            id="street"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label for="postal">
                                            Postal Code
                                        </label>
                                        <input
                                            className="textInput locationText"
                                            name="PostalCode"
                                            onChange={handleInputChange}
                                            value={formData.PostalCode}
                                            id="postal"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div class="map-section">
                                <h2 className="onboardingSectionTitle">What we show on Domits</h2>
                                <MapComponent location={location} />
                            </div>
                        </div>
                        <div class="formContainer">
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)} disabled={true}>Go back to change</button>
                            <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                        </div>
                    </div>
                );


            case 2:
                return (
                    <div>
                        <div class="formContainer mBottom">
                            <div class="form-section">
                                <h2 className="onboardingSectionTitle">Add accomodation features</h2>
                                <div class="room-features formRow">
                                    <div>
                                        <label><input type="checkbox" className="radioInput" name="Wifi" onChange={handleInputChange} checked={formData.Features.Wifi}></input>Wifi</label>
                                        <label><input type="checkbox" className="radioInput" name="Television" onChange={handleInputChange} checked={formData.Features.Television}></input>Television</label>
                                        <label><input type="checkbox" className="radioInput" name="Kitchen" onChange={handleInputChange} checked={formData.Features.Kitchen}></input>Kitchen</label>
                                        <label><input type="checkbox" className="radioInput" name="WashingMachine" onChange={handleInputChange} checked={formData.Features.WashingMachine}></input>Washing machine</label>
                                    </div>
                                    <div>
                                        <label><input type="checkbox" className="radioInput" name="Airconditioning" onChange={handleInputChange} checked={formData.Features.Airconditioning}></input>Airconditioning</label>
                                        <label><input type="checkbox" className="radioInput" name="Onsiteparking" onChange={handleInputChange} checked={formData.Features.Onsiteparking}></input>Onsite parking</label>
                                        <label><input type="checkbox" className="radioInput" name="Homeoffice" onChange={handleInputChange} checked={formData.Features.Homeoffice}></input>Home office</label>
                                    </div>
                                </div>
                                <h2 className="onboardingSectionTitle">Fill in safety measures</h2>
                                <div class="room-features formRow">
                                    <div>
                                        <label><input type="checkbox" className="radioInput" name="Smokedetector" onChange={handleInputChange} checked={formData.Features.Smokedetector}></input>Smoke detector</label>
                                        <label><input type="checkbox" className="radioInput" name="FirstAidkit" onChange={handleInputChange} checked={formData.Features.FirstAidkit}></input>First Aid kit</label>
                                    </div>
                                    <div>
                                        <label><input type="checkbox" className="radioInput" name="Fireextinguisher" onChange={handleInputChange} checked={formData.Features.Fireextinguisher}></input>Fire extinguisher</label>
                                    </div>
                                </div>
                            </div>
                            <div class="front-section">
                                <div className="room-info">
                                    <h2 className="onboardingSectionTitle">Add accomodation information</h2>
                                    <label for="title">Title</label>
                                    <input className="textInput locationText" id="title" name="Title" onChange={handleInputChange} value={formData.Title}></input>
                                    <label for="Subtitle">Subtitle</label>
                                    <input className="textInput locationText" id="Subtitle" name="Subtitle" onChange={handleInputChange} value={formData.Subtitle}></input>
                                    <label for="description" className="mTop" style={{ alignItems: 'start' }}>Description</label>
                                    <textarea className="textInput locationText" id="description" name="Description" onChange={handleInputChange} rows="10" cols="30" value={formData.Description}></textarea>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="nextButtons"><input type="file" name="images" className="file-input" accept="image/*" onChange={handleFileChange}></input>Add your images</label>
                            <div className="flex-row">
                                {[...Array(5)].map((_, index) => (
                                    <div key={index} className="image-container">
                                        {selectedFiles[index] && (
                                            <>
                                                <img
                                                    src={URL.createObjectURL(selectedFiles[index])}
                                                    alt={`Image ${index + 1}`}
                                                    className="image"
                                                />
                                                <button className="delete-button" onClick={() => handleDelete(index)}>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        {!selectedFiles[index] && <div className="placeholder">Placeholder</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div class="formContainer">
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                        </div>
                    </div>
                );


            case 3:
                return (
                    <div>
                        <div class="formContainer">
                            <div className="formHolder">
                                <h2 className="onboardingSectionTitle">Systems and configurations</h2>
                                <div className="formRow">
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Guest type</label>
                                            <label><input type="radio" className="radioInput" name="Guesttype" onChange={handleInputChange} checked={formData.Guesttype === "Any guest"} value="Any guest"></input>Any Guest</label>
                                            <label><input type="radio" className="radioInput" name="Guesttype" onChange={handleInputChange} checked={formData.Guesttype === "Verified Domits guest"} value="Verified Domits guest"></input>Verified Domits guest</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p>Price: {formData.Rent}</p>
                            <input className="priceSlider" type="range" name="Rent" onChange={handleInputChange} defaultValue={formData.Rent} min="40" max="1000" step="10" />
                            <div className="formHolder">
                                <h2 className="onboardingSectionTitle">Details and Policies</h2>
                                <div className="formRow">
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>What are the measurements?</label>
                                            <input className="textInput" type="number" name="Measurement" placeholder="M²" onChange={handleInputChange} defaultValue={formData.Measurement} min={0}></input>
                                            <label>Accommodation Type</label>
                                            <select
                                                value={formData.AccommodationType}
                                                onChange={handleInputChange}
                                                className="textInput"
                                                name="AccommodationType"
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
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Cancel policy</label>
                                            <label><input type="radio" className="radioInput" name="CancelPolicy" onChange={handleInputChange} checked={formData.CancelPolicy === "Users can cancel anytime"} value="Users can cancel anytime"></input>Users can cancel anytime</label>
                                            <label><input type="radio" className="radioInput" name="CancelPolicy" onChange={handleInputChange} checked={formData.CancelPolicy === "No cancel 24h before arrival"} value="No cancel 24h before arrival"></input>No cancel 24h before arrival </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="formContainer">
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

                        </div>

                    </div>
                );


            case 4:
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
                                <p>Number of Guests: {formData.Guests}</p>
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
                            <div className="reviewInfo">
                                <p>System Configuration:</p>
                                <ul>
                                    {Object.entries(formData.SystemConfiguration).map(([config, value]) => (
                                        <p key={config}>{config}: {value ? 'Yes' : 'No'}</p>
                                    ))}
                                </ul>
                                <p>Monthly Discount: {formData.Monthlypercent}%</p>
                                <p>Weekly Discount: {formData.Weeklypercent}%</p>
                                <p>First Booker Discount: {formData.FirstBookerpercent}%</p>
                            </div>
                        </div>
                        <div className='buttonHolder'>
                            <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                            <button className='nextButtons' onClick={() => { combinedSubmit(); pageUpdater(page + 1) }}>Confirm and proceed</button>
                        </div>
                        <p>Your accommodation ID: {formData.ID}</p>
                    </div >
                );


            case 5:
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

        <div className="container">
            {renderPageContent(page)}

        </div>
    );
}

export default OnboardingHost;