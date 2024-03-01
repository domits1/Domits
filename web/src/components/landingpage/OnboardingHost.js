import React, { useState } from "react";
import Page from "./Calculator";
import FAQ from "./Faq";
import './landing.css';

function OnboardingHost() {
    const [page, setPage] = useState(1); // Track the current page
    const [formData, setFormData] = useState({
        roomType: "",
        guests: 0,
        bedrooms: 0,
        bathrooms: 0,
        beds: 0,
        country: "",
        postalCode: "",
        street: "",
        neighbourhood: ""
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
                            <form>
                                <div className="formRow">
                                    <div class="room-type">
                                        <label><input className="radioInput" type="radio" name="roomType" onChange={handleInputChange} value="entireHouse"></input> Entire house</label>
                                        <label><input className="radioInput" type="radio" name="roomType" onChange={handleInputChange} value="room"></input> Room</label>
                                        <label><input className="radioInput" type="radio" name="roomType" onChange={handleInputChange} value="sharedRoom"></input> Shared room</label>
                                    </div>

                                    <div class="quantity">
                                        <label>How many guests? <input className="textInput" type="number" name="guests" onChange={handleInputChange} value={formData.guests} min={0}></input></label>
                                        <label>How many bedrooms? <input className="textInput" type="number" name="bedrooms" onChange={handleInputChange} value={formData.bedrooms} min={0}></input></label>
                                        <label>How many bathrooms? <input className="textInput" type="number" name="bathrooms" onChange={handleInputChange} value={formData.bathrooms} min={0}></input></label>
                                        <label>How many fixed beds? <input className="textInput" type="number" name="beds" onChange={handleInputChange} value={formData.beds} min={0}></input></label>
                                    </div>
                                </div>

                                <div class="locationInput">
                                    <h2>Fill in Location</h2>
                                    <label>Country<input className="textInput locationText" name="country" onChange={handleInputChange} value={formData.country}></input></label>
                                    <label>Postal Code <input className="textInput locationText" name="postalCode" onChange={handleInputChange} value={formData.postalCode}></input></label>
                                    <label>Street + house nr.<input className="textInput locationText" name="street" onChange={handleInputChange} value={formData.street}></input></label>
                                    <label>Neighbourhood<input className="textInput locationText" name="neighbourhood" onChange={handleInputChange} value={formData.neighbourhood}></input></label>
                                </div>
                                <div className='buttonHolder'>
                                    <button type="button" className='nextButtons'>Go back to change</button>
                                    <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                                </div>
                            </form>
                        </div>
                        <div class="map-section">
                            <label>What we show on Domits.com</label>
                            <div id="map-placeholder">Map will go here</div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div class="formContainer">
                        <div class="form-section">
                            <form>

                                <div className='buttonHolder'>
                                    <button className='nextButtons' onClick={() => pageUpdater(page - 1)}>Go back to change</button>
                                    <button className='nextButtons' onClick={() => pageUpdater(page + 1)}>Confirm and proceed</button>
                                </div>
                            </form>
                        </div>
                        <div class="front-section">
                            <div className="room-info">
                                <label>Add accomodation information</label>
                                <label>Title<input className="textInput locationText" name="title"></input></label>
                                <label style={{alignItems: 'start'}}>Description<textarea className="textInput locationText" name="description" rows="10" cols="30"></textarea></label>
                                
                                <div id="map-placeholder">Map will go here</div>
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
