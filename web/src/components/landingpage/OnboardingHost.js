import React, { useState } from "react";
import Page from "./Calculator";
import FAQ from "./Faq";
import './landing.css';

function OnboardingHost() {
    const [page, setPage] = useState(1); // Track the current page
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        Roomtype: "",
        Guests: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
        Country: "",
        PostalCode: "",
        Street: "",
        Neighbourhood: "",
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
        }
    });

    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
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
                }
            }));
        } else {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value
            }));
        }
    };


    const renderPageContent = (page) => {
        switch (page) {
            case 1:
                return (
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
                            <div className='buttonHolder'>
                                <button type="button" className='nextButtons'>Go back to change</button>
                                <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                            </div>
                        </div>
                        <div class="map-section">
                            <label>What we show on Domits.com</label>
                            <div id="map-placeholder">Map is still being worked on</div>
                        </div>
                    </div>
                );
            case 2:
                return (
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

                            <div className='buttonHolder'>
                                <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                                <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                            </div>
                        </div>
                        <div class="front-section">
                            <div className="room-info">
                                <label>Add accomodation information</label>
                                <label>Title<input className="textInput locationText" name="title" onChange={handleInputChange} ></input></label>
                                <label style={{ alignItems: 'start' }}>Description<textarea className="textInput locationText" name="description" onChange={handleInputChange} rows="10" cols="30"></textarea></label>

                                <div id="map-placeholder">Images are still being worked on</div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div class="formContainer">
                        <div class="form-section">
                            <h2>Review your information</h2>
                            <div>
                                <p>Title: {formData.title}</p>
                                <p>Description: {formData.description}</p>
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
                            </div>
                            <div className='buttonHolder'>
                                <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                                <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                            </div>
                        </div>
                    </div>
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
