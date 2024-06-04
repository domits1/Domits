import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./listing.css";
import ImageGallery from './ImageGallery';
import DateFormatterYYYY_MM_DD from "../utils/DateFormatterYYYY_MM_DD";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";

import Washingmashine from "../../images/icons/Washingmachine.png";
import Television from "../../images/icons/Television.png";
import Smokedetector from "../../images/icons/Smokedetector.png";
import Wifi from "../../images/icons/Wifi.png";
import Homeoffice from "../../images/icons/Homeoffice.png";
import Fireextinguisher from "../../images/icons/Fireextinguisher.png";
import Airconditioning from "../../images/icons/Airconditioning.png";
import FirstAidKit from "../../images/icons/FirstAidKit.png";
import Kitchen from "../../images/icons/Kitchen.png";
import Onsiteparking from "../../images/icons/Onsiteparking.png";

const ListingDetails = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const id = searchParams.get('ID');
    const [accommodation, setAccommodation] = useState(null);
    const [checkIn, setCheckIn] = useState(null);
    const [checkOut, setCheckOut] = useState(null);
    const [minStart, setMinStart] = useState(null);
    const [maxStart, setMaxStart] = useState(null);
    const [minEnd, setMinEnd] = useState(null);
    const [maxEnd, setMaxEnd] = useState(null);
    const [inputError, setInputError] = useState(false);
    const [adults, setAdults] = useState(0);
    const [kids, setKids] = useState(0);
    const [pets, setPets] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ID: id })
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const responseData = await response.json();
                const data = JSON.parse(responseData.body);
                setAccommodation(data);
                setDates(data.StartDate, data.EndDate);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };
        fetchAccommodation();
    }, [id]);

    useEffect(() => {
        checkFormValidity();
    }, [checkIn, checkOut, adults, kids]);

    useEffect(() => {
        const restrictDates = () => {
            if (checkIn && !checkOut) {
                const minEnd = new Date(checkIn);
                minEnd.setUTCDate(minEnd.getUTCDate() + 1);
                setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
            } else if (!checkIn && checkOut) {
                const maxStart = new Date(checkOut);
                maxStart.setUTCDate(maxStart.getUTCDate() - 1);
                setMaxStart(DateFormatterYYYY_MM_DD(maxStart));
            }
        }
        restrictDates();
    }, [checkIn, checkOut]);
    
    const handleChange = (value, setType) => {
        const newValue = parseInt(value, 10) || 0;
        setType(newValue);

        const total = (setType === setAdults ? newValue + kids : adults + newValue);

        if (total > accommodation.GuestAmount) {
            setInputError(true);
        } else {
            setInputError(false);
        }
        checkFormValidity();
    };

    const setDates = (StartDate, EndDate) => {
        const today = new Date();
        const parsedStartDate = today > new Date(StartDate) ? today : StartDate
        const parsedEndDate = new Date(EndDate);

        const maxStart = new Date();
        maxStart.setDate(parsedEndDate.getDate() - 1);

        const minEnd = new Date();
        minEnd.setDate(parsedStartDate.getDate() + 1);
        setMinStart(DateFormatterYYYY_MM_DD(parsedStartDate));
        setMaxStart(DateFormatterYYYY_MM_DD(maxStart));
        setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
        setMaxEnd(DateFormatterYYYY_MM_DD(parsedEndDate));
    };

    const checkFormValidity = () => {
        if (checkIn && checkOut && adults > 0 && !inputError) {
            setIsFormValid(true);
        } else {
            setIsFormValid(false);
        }
    };

    const calculateTotal = () => {
        if (!accommodation) return 0;
        const nights = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
        const basePrice = nights * accommodation.Rent;
        const discount = 75; // example value
        const cleaningFee = 100;
        const serviceFee = 98;
        return basePrice - discount + cleaningFee + serviceFee;
    };

    const handleStartChat = () => {
        const userEmail = "nabilsalimi0229@gmail.com";
        const recipientEmail = "jejego4569@javnoi.com";
        const channelUUID = generateUUID();
        localStorage.setItem(channelUUID, recipientEmail);
        navigate(`/chat?channelID=${channelUUID}`);
    };

    const handleBooking = () => {
        const details = {
            id,
            checkIn,
            checkOut,
            adults,
            kids,
            pets
        };
        const queryString = new URLSearchParams(details).toString();
        navigate(`/bookingoverview?${queryString}`);
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    return (
        <main className="container">
            <section className="detailContainer">
                <section className='detailInfo'>
                    {accommodation && (
                        <div>
                            <div>
                                <Link to="/">
                                    <button className="button">Go Back</button>
                                </Link>
                                <h1>{accommodation.Title}</h1>
                            </div>
                            <div>
                                <ImageGallery images={Object.values(accommodation.Images)} />
                            </div>
                            <div>
                                <div class='extraDetails'>
                                    <p class='details'>{`€ ${accommodation.Rent} per night`}</p>
                                    <p class='details'>{`${accommodation.GuestAmount} guests`}</p>
                                    <p class='details'>{`${accommodation.Beds} beds`}</p>
                                    <p class='details'>{`${accommodation.Bedrooms} bedrooms`}</p>
                                    <p class='details'>{`${accommodation.Bathrooms} bathrooms`}</p>
                                </div>
                            </div>
                            <div>
                                <p class='description'>{accommodation.Description}</p>
                                <h3>This place offers the following:</h3>
                                <ul class='features'>
                                    {Object.entries(accommodation.Features).map(([feature, value]) => (
                                        <li key={feature} className={value ? 'feature-item' : 'feature-item feature-absent'}>
                                            <img src={
                                                feature === 'WashingMachine' ? Washingmashine :
                                                    feature === 'Television' ? Television :
                                                        feature === 'Smokedetector' ? Smokedetector :
                                                            feature === 'Wifi' ? Wifi :
                                                            feature === 'Onsiteparking' ? Onsiteparking :
                                                                feature === 'Homeoffice' ? Homeoffice :
                                                                    feature === 'Fireextinguisher' ? Fireextinguisher :
                                                                        feature === 'Airconditioning' ? Airconditioning :
                                                                            feature === 'FirstAidkit' ? FirstAidKit :
                                                                                feature === 'Kitchen' ? Kitchen : ''
                                            } alt={feature} className='feature-icon' />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div>
                                    <button class='button'>Show more</button>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
                {accommodation && (
                    <aside className='detailSummary'>
                        <div className="summary-section">
                            <h2>Booking details</h2>
                            <p>Available from {DateFormatterDD_MM_YYYY(accommodation.StartDate)} to {DateFormatterDD_MM_YYYY(accommodation.EndDate)}</p>
                            <div className="dates">
                                <div className="check-in-out">
                                    <label>Check in</label>
                                    <input type="date" min={minStart}
                                        max={maxStart}
                                        placeholder="Select your check-in"
                                        onChange={(e) => setCheckIn(e.target.value)} />
                                </div>
                                {(checkIn && checkOut) ? (
                                    <div className="nights">
                                        <p>{(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)} nights</p>
                                    </div>
                                ) : (
                                    <div className="nights">
                                        <p>0 nights</p>
                                    </div>
                                )}
                                <div className="check-in-out">
                                    <label>Check out</label>
                                    <input type="date" min={minEnd}
                                        max={maxEnd}
                                        onChange={(e) => setCheckOut(e.target.value)} />
                                </div>
                            </div>
                            <div className="travelers">
                                <label>Travelers</label>
                                <p>Maximum amount of travelers: {accommodation.GuestAmount}</p>
                                <br />
                                <div className="traveller-inputs">
                                    <label>Adults</label>
                                    <input type="number" min="1" placeholder={"Enter the amount of adults"}
                                        className={inputError ? 'error' : ''}
                                        onChange={(e) => handleChange(e.target.value, setAdults)} />
                                    <label>Kids</label>
                                    <input type="number" min="0" placeholder={"Enter the amount of kids"}
                                        className={inputError ? 'error' : ''}
                                        onChange={(e) => handleChange(e.target.value, setKids)} />
                                </div>
                                {inputError ? <p className="error-text">Maximum allowed travelers exceeded!</p> : ''}
                            </div>
                            <div className="pets">
                                <label>Pets</label>
                                <select value={pets} onChange={(e) => setPets(e.target.value)}>
                                    <option value="">Select...</option>
                                    <option value="none">None</option>
                                    <option value="cat">Cat</option>
                                    <option value="dog">Dog</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <button className="reserve-button" onClick={handleBooking} 
                                disabled={!isFormValid}
                                style={{
                                    backgroundColor: isFormValid ? 'green' : 'gray',
                                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                                    opacity: isFormValid ? 1 : 0.5
                                }}>
                                Reserve
                            </button>
                            <p className="disclaimer">*You won't be charged yet</p>
                            {(checkIn && checkOut) ? (
                                <div className="price-details">
                                    <div className="price-item">
                                        <p>{(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)} nights
                                            x
                                            € {accommodation.Rent} a night</p>
                                        <p>€ {(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24) * accommodation.Rent}</p>
                                    </div>
                                    <div className="price-item">
                                        <p>Cleaning fee</p>
                                        <p>€ 100</p>
                                    </div>
                                    <div className="price-item">
                                        <p>Domits service fee</p>
                                        <p>€ 98</p>
                                    </div>
                                    <div className="total">
                                        <p>Total</p>
                                        <p>€ {calculateTotal()}</p>
                                    </div>
                                </div>
                            ) : (
                                <div>Please choose your Check-in date and Check-out date</div>
                            )}

                        </div>
                    </aside>
                )}
            </section>
        </main>
    );
}

export default ListingDetails;
