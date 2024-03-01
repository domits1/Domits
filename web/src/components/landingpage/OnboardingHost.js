import React, { useState } from "react";
import Page from "./Calculator";
import FAQ from "./Faq";
import './landing.css';

function OnboardingHost() {
    const [page, setPage] = useState(1); // Track the current page
    const [formData, setFormData] = useState({
        RoomType: "",
        Guests: 0,
        Bedrooms: 0,
        Bathrooms: 0,
        Beds: 0,
        Country: "",
        PostalCode: "",
        Street: "",
        Neighbourhood: "",
        Features: {

        }
    });

    const pageUpdater = (pageNumber) => {
        setPage(pageNumber);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const renderPageContent = (page) => {
        switch (page) {
            case 1:
                return (
                    <div class="formContainer">
                        <div class="form-section">
                            <div className="formRow">
                                <div class="room-type">
                                    <label><input className="radioInput" type="radio" name="RoomType" onChange={handleInputChange} value="entireHouse"></input> Entire house</label>
                                    <label><input className="radioInput" type="radio" name="RoomType" onChange={handleInputChange} value="room"></input> Room</label>
                                    <label><input className="radioInput" type="radio" name="RoomType" onChange={handleInputChange} value="sharedRoom"></input> Shared room</label>
                                </div>

                                <div class="quantity">
                                    <label>How many guests? <input className="textInput" type="number" name="Guests" onChange={handleInputChange} value={formData.guests} min={0}></input></label>
                                    <label>How many bedrooms? <input className="textInput" type="number" name="Bedrooms" onChange={handleInputChange} value={formData.bedrooms} min={0}></input></label>
                                    <label>How many bathrooms? <input className="textInput" type="number" name="Bathrooms" onChange={handleInputChange} value={formData.bathrooms} min={0}></input></label>
                                    <label>How many fixed beds? <input className="textInput" type="number" name="Beds" onChange={handleInputChange} value={formData.beds} min={0}></input></label>
                                </div>
                            </div>

                            <div class="locationInput">
                                <h2>Fill in Location</h2>
                                <label>Country<input className="textInput locationText" name="Country" onChange={handleInputChange} value={formData.country}></input></label>
                                <label>Postal Code <input className="textInput locationText" name="PostalCode" onChange={handleInputChange} value={formData.postalCode}></input></label>
                                <label>Street + house nr.<input className="textInput locationText" name="Street" onChange={handleInputChange} value={formData.street}></input></label>
                                <label>Neighbourhood<input className="textInput locationText" name="Neighbourhood" onChange={handleInputChange} value={formData.neighbourhood}></input></label>
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
                                    <label><input type="checkbox" className="radioInput" name="Wifi"></input>Wifi</label>
                                    <label><input type="checkbox" className="radioInput" name="Television"></input>Television</label>
                                    <label><input type="checkbox" className="radioInput" name="Kitchen"></input>Kitchen</label>
                                    <label><input type="checkbox" className="radioInput" name="Washing machine"></input>Washing machine</label>
                                </div>
                                <div>
                                    <label><input type="checkbox" className="radioInput" name="Airconditioning"></input>Airconditioning</label>
                                    <label><input type="checkbox" className="radioInput" name="Onsite parking"></input>Onsite parking</label>
                                    <label><input type="checkbox" className="radioInput" name="Home office"></input>Home office</label>
                                </div>
                            </div>
                            <h2>Fill in safety measures</h2>
                            <div class="room-features formRow">
                            <div>
                                    <label><input type="checkbox" className="radioInput" name="Smoke detector"></input>Smoke detector</label>
                                    <label><input type="checkbox" className="radioInput" name="First Aid kit"></input>First Aid kit</label>
                                </div>
                                <div>
                                    <label><input type="checkbox" className="radioInput" name="Fire extinguisher"></input>Fire extinguisher</label>
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
                                <label>Title<input className="textInput locationText" name="title"></input></label>
                                <label style={{ alignItems: 'start' }}>Description<textarea className="textInput locationText" name="description" rows="10" cols="30"></textarea></label>

                                <div id="map-placeholder">Images are still being worked on</div>
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
