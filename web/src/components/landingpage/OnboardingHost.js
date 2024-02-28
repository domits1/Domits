import React from "react";
import Page from "./Calculator";
import FAQ from "./Faq";
import './landing.css';

function OnboardingHost() {


    return (
        <div class="formContainer">
            <div class="form-section">
                <form>
                    <div className="formRow">
                        <div class="room-type">
                            <label><input className="radioInput" type="radio" name="roomType" value="entireHouse"></input> Entire house</label>
                            <label><input className="radioInput" type="radio" name="roomType" value="room"></input> Room</label>
                            <label><input className="radioInput" type="radio" name="roomType" value="sharedRoom"></input> Shared room</label>
                        </div>

                        <div class="quantity">
                            <label>How many guests? <input className="textInput" type="number" name="guests" min={0}></input></label>
                            <label>How many bedrooms? <input className="textInput" type="number" name="bedrooms" min={0}></input></label>
                            <label>How many bathrooms? <input className="textInput" type="number" name="bathrooms" min={0}></input></label>
                            <label>How many fixed beds? <input className="textInput" type="number" name="beds" min={0}></input></label>
                        </div>
                    </div>

                    <div class="locationInput">
                        <h2>Fill in Location</h2>
                        <label>Country<input className="textInput locationText" name="country"></input></label>
                        <label>Postal Code <input className="textInput locationText" name="postalCode"></input></label>
                        <label>Street + house nr.<input className="textInput locationText" name="street"></input></label>
                        <label>Neighbourhood<input className="textInput locationText" name="neighbourhood"></input></label>
                    </div>
                    <div className='buttonHolder'>
                        <button type="button" className='nextButtons'>Go back to change</button>
                        <input type="submit" className='nextButtons' value="Confirm and proceed"></input>
                    </div>
                </form>
            </div>
            <div class="map-section">
                <label>What we show on Domits.com</label>
                <div id="map-placeholder">Map will go here</div>
            </div>
        </div>
    );
}

export default OnboardingHost;
