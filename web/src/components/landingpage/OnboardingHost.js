import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';

import './landing.css';

function OnboardingHost() {

    const navigate = useNavigate();

    const [page, setPage] = useState(1); // Track the current page
    const [formData, setFormData] = useState({
        Title: "",
        Description: "",
        Rent: "",
        Ownertype: "",
        Bookingsystem: "",
        Roomtype: "",
        Guests: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
        Country: "",
        PostalCode: "",
        Street: "",
        Neighbourhood: "",
        Bookingsystem: "",
        Ownertype: "",
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
        SystemConfiguration: {
            UnverifiedGuest: false,
            VerifiedGuest: false,
            Monthlydiscount: false,
            Weeklydiscount: false,
            FirstBookerdiscount: false,
        },
        Monthlypercent: 0,
        Weeklypercent: 0,
        FirstBookerpercent: 0,

    });

    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
    };

    const isFormFilled = () => {
        // Exclude specific fields from the check
        const excludedFields = ['Monthlypercent', 'Weeklypercent', 'FirstBookerpercent'];

        for (const key in formData) {
            // Skip checking for excluded fields
            if (excludedFields.includes(key)) {
                continue;
            }

            // Check if value is empty or zero
            if (formData[key] === "" || formData[key] === 0) {
                return false;
            }
        }
        return true;
    };


    const handleInputChange = (event) => {
        const { name, type, checked, value } = event.target;
        // For checkboxes, update Features object property directly
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
            // Check if value is 0 and set it to an empty string
            const newValue = value === '0' ? '' : value;
            setFormData((prevData) => ({
                ...prevData,
                [name]: newValue
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value
            }));
        }
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
                // Reset form data or navigate to next page
            } else {
                console.error('Error saving form data');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const renderPageContent = (page) => {
        switch (page) {
            case 1:
                return (
                    <div>
                        <div class="formContainer">
                            <div class="form-section">
                                <div className="formRow">
                                    <div class="room-type">
                                        <label><input className="radioInput" type="radio" name="Roomtype" onChange={handleInputChange} checked={formData.Roomtype === "entireHouse"} value="entireHouse"></input> Entire house</label>
                                        <label><input className="radioInput" type="radio" name="Roomtype" onChange={handleInputChange} checked={formData.Roomtype === "room"} value="room"></input> Room</label>
                                        <label><input className="radioInput" type="radio" name="Roomtype" onChange={handleInputChange} checked={formData.Roomtype === "sharedRoom"} value="sharedRoom"></input> Shared room</label>
                                    </div>


                                    <div class="quantity">
                                        <label>How many guests? <input className="textInput" type="number" name="Guests" onChange={handleInputChange} value={formData.Guests} min={0}></input></label>
                                        <label>How many bedrooms? <input className="textInput" type="number" name="Bedrooms" onChange={handleInputChange} value={formData.Bedrooms} min={0}></input></label>
                                        <label>How many bathrooms? <input className="textInput" type="number" name="Bathrooms" onChange={handleInputChange} value={formData.Bathrooms} min={0}></input></label>
                                        <label>How many fixed beds? <input className="textInput" type="number" name="Beds" onChange={handleInputChange} value={formData.Beds} min={0}></input></label>
                                    </div>
                                </div>

                                <div class="locationInput">
                                    <h2>Fill in Location</h2>
                                    <label>Country<input className="textInput locationText" name="Country" onChange={handleInputChange} value={formData.Country}></input></label>
                                    <label>Postal Code <input className="textInput locationText" name="PostalCode" onChange={handleInputChange} value={formData.PostalCode}></input></label>
                                    <label>Street + house nr.<input className="textInput locationText" name="Street" onChange={handleInputChange} value={formData.Street}></input></label>
                                    <label>Neighbourhood<input className="textInput locationText" name="Neighbourhood" onChange={handleInputChange} value={formData.Neighbourhood}></input></label>
                                </div>
                            </div>
                            <div class="map-section">
                                <label>What we show on Domits.com</label>
                                <div id="map-placeholder">Map is still being worked on</div>
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
                        <div class="formContainer">
                            <div class="form-section">
                                <label>Add accomodation features</label>
                                <h2>Fill in ammendities</h2>
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
                                <h2>Fill in safety measures</h2>
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
                                    <label>Add accomodation information</label>
                                    <label>Title<input className="textInput locationText" name="Title" onChange={handleInputChange} value={formData.Title}></input></label>
                                    <label style={{ alignItems: 'start' }}>Description<textarea className="textInput locationText" name="Description" onChange={handleInputChange} rows="10" cols="30" value={formData.Description}></textarea></label>

                                    <div id="map-placeholder">Images are still being worked on</div>
                                </div>
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
                                <h2>Systems and configurations</h2>
                                <div className="formRow">
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Preferred booking system</label>
                                            <label><input type="radio" className="radioInput" name="Bookingsystem" onChange={handleInputChange} checked={formData.Bookingsystem === "Guests book immediately"} value="Guests book immediately"></input>Let guests book immediately</label>
                                            <label><input type="radio" className="radioInput" name="Bookingsystem" onChange={handleInputChange} checked={formData.Bookingsystem === "Booking request"} value="Booking request"></input>Review a booking request</label>
                                        </div>
                                    </div>
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Guest type</label>
                                            <label><input type="checkbox" className="radioInput" name="UnverifiedGuest" onChange={handleInputChange} checked={formData.SystemConfiguration.UnverifiedGuest}></input>Unverified guest</label>
                                            <label><input type="checkbox" className="radioInput" name="VerifiedGuest" onChange={handleInputChange} checked={formData.SystemConfiguration.VerifiedGuest}></input>Verified Domits guest</label>
                                        </div>
                                    </div>
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Enlist as</label>
                                            <label><input type="radio" className="radioInput" name="Ownertype" onChange={handleInputChange} checked={formData.Ownertype === "Private owner"} value="Private owner"></input>Private owner</label>
                                            <label><input type="radio" className="radioInput" name="Ownertype" onChange={handleInputChange} checked={formData.Ownertype === "Corporation"} value="Corporation"></input>Corporation</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p>Rent: {formData.Rent}</p>
                            <input className="priceSlider" type="range" name="Rent" onChange={handleInputChange} defaultValue={formData.Rent} min="0" max="10000" step="100" />
                            <div className="formHolder">
                                <h2>Discounts and Policies</h2>
                                <div className="formRow">
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label>Do you offer discounts?</label>
                                            <label><input type="checkbox" className="radioInput" name="Monthlydiscount" onChange={handleInputChange} checked={formData.SystemConfiguration.Monthlydiscount}></input>Monthly discount</label>
                                            <label><input type="checkbox" className="radioInput" name="Weeklydiscount" onChange={handleInputChange} checked={formData.SystemConfiguration.Weeklydiscount}></input>Weekly discount</label>
                                            <label><input type="checkbox" className="radioInput" name="FirstBookerdiscount" onChange={handleInputChange} checked={formData.SystemConfiguration.FirstBookerdiscount}></input>First Booker discount</label>
                                        </div>
                                    </div>
                                    <div class="room-features formRow">
                                        <div className="configurations">
                                            <label><input type="number" className="textInput" name="Monthlypercent" onChange={handleInputChange} value={formData.Monthlypercent} disabled={!formData.SystemConfiguration.Monthlydiscount}></input>%</label>
                                            <label><input type="number" className="textInput" name="Weeklypercent" onChange={handleInputChange} value={formData.Weeklypercent} disabled={!formData.SystemConfiguration.Weeklydiscount}></input>%</label>
                                            <label><input type="number" className="textInput" name="FirstBookerpercent" onChange={handleInputChange} value={formData.FirstBookerpercent} disabled={!formData.SystemConfiguration.FirstBookerdiscount}></input>%</label>
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
                                onClick={isFormFilled() ? () => pageUpdater(page + 1) : null}
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
                    <div class="formContainer">
                        <div class="form-section">
                            <h2>Review your information</h2>
                            <div>
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
                                <p>Features:</p>
                                <ul>
                                    {Object.entries(formData.Features).map(([feature, value]) => (
                                        <li key={feature}>{feature}: {value ? 'Yes' : 'No'}</li>
                                    ))}
                                </ul>
                                <p>System Configuration:</p>
                                <ul>
                                    {Object.entries(formData.SystemConfiguration).map(([config, value]) => (
                                        <li key={config}>{config}: {value ? 'Yes' : 'No'}</li>
                                    ))}
                                </ul>
                                <p>Monthly Discount: {formData.Monthlypercent}%</p>
                                <p>Weekly Discount: {formData.Weeklypercent}%</p>
                                <p>First Booker Discount: {formData.FirstBookerpercent}%</p>
                            </div>
                            <div className='buttonHolder'>
                                <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                                <button
                                    className='nextButtons' onClick={() => { handleSubmit(); pageUpdater(page + 1) }}>Confirm and proceed</button>
                            </div>
                        </div>
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
                            <button className='nextButtons' onClick={() => navigate("/hostdashboard")}>Go to dashboard</button>
                        </div>
                    </div >
                );
            default:
                return null;
        }
    };

    return (

        <div>
            {renderPageContent(page)}

        </div>
    );
}

export default OnboardingHost;
