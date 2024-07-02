import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./listing.css";
import ImageGallery from './ImageGallery';
import DateFormatterYYYY_MM_DD from "../utils/DateFormatterYYYY_MM_DD";
import DateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
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
import dateFormatterDD_MM_YYYY from "../utils/DateFormatterDD_MM_YYYY";
import Armchair from "../../images/armchair.png";
import BabyMonitor from "../../images/baby-monitor.png";
import Baby from "../../images/baby.png";
import Backyard from "../../images/backyard.png";
import Blender from "../../images/blender.png";
import BoardGame from "../../images/board-game.png";
import Bus from "../../images/bus.png";
import Car from "../../images/car.png";
import ChargingStation from "../../images/charging-station.png";
import CheckIn from "../../images/check-in.png";
import Cleaner from "../../images/cleaner.png";
import Clothes from "../../images/clothes.png";
import CoffeeTable from "../../images/coffee-table.png";
import Crib from "../../images/crib.png";
import Dishwasher from "../../images/dishwasher.png";
import Food from "../../images/food.png";
import Gate from "../../images/gate.png";
import GraphicDesign from "../../images/graphic-design.png";
import Grill from "../../images/grill.png";
import HighChair from "../../images/high-chair.png";
import HotTub from "../../images/hot-tub.png";
import CoffeeMachine from "../../images/coffee-machine.png";
import AlarmClock from "../../images/alarm-clock.png";
import AntiqueBalcony from "../../images/antique-balcony.png";
import deleteIcon from "../../images/icons/cross.png";

const ListingDetails = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const id = searchParams.get('ID');
    const [accommodation, setAccommodation] = useState(null);
    const [host, setHost] = useState(null);
    const [reviews, setReviews] = useState([]);
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
    const [bookedDates, setBookedDates] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [serviceFee, setServiceFee] = useState(0);
    const [cleaningFee, setCleaningFee] = useState(0);
    const [hostID, setHostID] = useState();

    const featureIcons = {
        WashingMachine: Washingmashine,
        Television: Television,
        Smokedetector: Smokedetector,
        Wifi: Wifi,
        Onsiteparking: Onsiteparking,
        Homeoffice: Homeoffice,
        Fireextinguisher: Fireextinguisher,
        Airconditioning: Airconditioning,
        FirstAidKit: FirstAidKit,
        Kitchen: Kitchen,
        Armchair: Armchair,
        BabyMonitor: BabyMonitor,
        Baby: Baby,
        Backyard: Backyard,
        Blender: Blender,
        BoardGame: BoardGame,
        Bus: Bus,
        Car: Car,
        ChargingStation: ChargingStation,
        CheckIn: CheckIn,
        Cleaner: Cleaner,
        Clothes: Clothes,
        CoffeeTable: CoffeeTable,
        Crib: Crib,
        Dishwasher: Dishwasher,
        Food: Food,
        Gate: Gate,
        GraphicDesign: GraphicDesign,
        Grill: Grill,
        HighChair: HighChair,
        HotTub: HotTub,
        CoffeeMachine: CoffeeMachine,
        AlarmClock: AlarmClock,
        AntiqueBalcony: AntiqueBalcony,
    };

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ID: id }),
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const responseData = await response.json();
                const data = JSON.parse(responseData.body);
                setAccommodation(data);
                setDates(data.StartDate, data.EndDate, data.BookedDates || []); // Pass the booked dates
                fetchHostInfo(data.OwnerId);
                setHostID(data.OwnerId)
                fetchReviewsByAccommodation(data.ID);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };

        fetchAccommodation();
    }, [id]);

    const fetchReviewsByAccommodation = async (accoId) => {
        try {
            const requestData = {
                accoId: accoId
            };
            const response = await fetch(`https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviewByAccoId`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch host information');
            }
            const responseData = await response.json();
            setReviews(responseData);
        } catch (error) {
            console.error('Error fetching host info:', error);
        }
    }

    const fetchHostInfo = async (ownerId) => {
        try {
            const requestData = {
                OwnerId: ownerId
            };
            const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            if (!response.ok) {
                throw new Error('Failed to fetch host information');
            }
            const responseData = await response.json();
            const hostData = JSON.parse(responseData.body)[0];
            setHost(hostData);
        } catch (error) {
            console.error('Error fetching host info:', error);
        }
    };

    useEffect(() => {
        checkFormValidity();
    }, [checkIn, checkOut, adults, kids]);

    useEffect(() => {
        const restrictDates = () => {
            if (checkIn) {
                const minEnd = new Date(checkIn);
                minEnd.setUTCDate(minEnd.getUTCDate() + 1);
                setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
                if (checkOut && new Date(checkOut) <= new Date(checkIn)) {
                    setCheckOut('');
                }
            }
        };
        restrictDates();
    }, [checkIn]);

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

    const setDates = (StartDate, EndDate, bookedDates) => {
        const today = new Date();
        const parsedStartDate = today > new Date(StartDate) ? today : new Date(StartDate);
        const parsedEndDate = new Date(EndDate);
        const maxStart = new Date(parsedEndDate);
        maxStart.setUTCDate(maxStart.getUTCDate() - 1);

        const minEnd = new Date(parsedStartDate);
        minEnd.setUTCDate(minEnd.getUTCDate() + 1);

        setMinStart(DateFormatterYYYY_MM_DD(parsedStartDate));
        setMaxStart(DateFormatterYYYY_MM_DD(maxStart));
        setMinEnd(DateFormatterYYYY_MM_DD(minEnd));
        setMaxEnd(DateFormatterYYYY_MM_DD(parsedEndDate));
        setBookedDates(bookedDates); // Save booked dates in state
    };

    const checkFormValidity = () => {
        if (checkIn && checkOut && adults > 0 && !inputError) {
            if (new Date(checkOut) > new Date(checkIn)) {
                setIsFormValid(true);
            } else {
                setIsFormValid(false);
            }
        } else {
            setIsFormValid(false);
        }
    };

    useEffect(() => {
        const calculateTotal = () => {
            if (!accommodation || !checkIn || !checkOut) return;
    
            const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
            const basePrice = nights * accommodation.Rent * 100;
            const cleaningFee = accommodation.CleaningFee ? parseFloat(accommodation.CleaningFee * 100) : 0;
            const calculatedServiceFee = basePrice * 0.15;
            const calculatedTotalPrice = basePrice + calculatedServiceFee + cleaningFee;
    
            setServiceFee(calculatedServiceFee / 100);
            setTotalPrice(calculatedTotalPrice / 100);
            setCleaningFee(cleaningFee / 100);
        };
    
        calculateTotal();
    }, [accommodation, checkIn, checkOut]);
    

    const handleStartChat = () => {
        const recipientId = hostID;
        const channelUUID = generateUUID();
        localStorage.setItem(channelUUID, recipientId);
        navigate(`/chat?channelID=${channelUUID}`);
    };

    const handleBooking = () => {
        const details = {
            id,
            checkIn,
            checkOut,
            adults,
            kids,
            pets,
            cleaningFee
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

    // Check if a date is within any booked range
    const isDateBooked = (date) => {
        return bookedDates.some(bookedRange => {
            const start = new Date(bookedRange[0]);
            const end = new Date(bookedRange[1]);
            return date >= start && date <= end;
        });
    };

    const isDateAfterBookedNight = (date) => {
        if (!checkIn) return false;

        for (let bookedRange of bookedDates) {
            const start = new Date(bookedRange[0]);
            if (checkIn <= start && date >= start) {
                return true;
            }
        }
        return false;
    };

    const filterBookedDates = (date) => {
        return !isDateBooked(date) && !isDateAfterBookedNight(date);
    };

    console.log(hostID)


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
                                <div className='extraDetails'>
                                    <p className='details'>{`€ ${accommodation.Rent} per night`}</p>
                                    <p className='details'>{`${accommodation.GuestAmount} guests`}</p>
                                    <p className='details'>{`${accommodation.Beds} beds`}</p>
                                    <p className='details'>{`${accommodation.Bedrooms} bedrooms`}</p>
                                    <p className='details'>{`${accommodation.Bathrooms} bathrooms`}</p>
                                </div>
                            </div>
                            <div>
                                <p className='description'>{accommodation.Description}</p>
                                <h3>This place offers the following:</h3>
                                <ul className='features'>
                                    {Object.entries(accommodation.Features).map(([feature, value]) => (
                                        value && (
                                            <li key={feature} className='acco-feature-item'>
                                                <img
                                                    src={featureIcons[feature]}
                                                    alt={feature}
                                                    className='feature-icon'
                                                />
                                                <span>{feature}</span>
                                            </li>
                                        )
                                    ))}
                                </ul>
                                <div>
                                    <button className='button'>Show more</button>
                                </div>
                                <br />
                                <section className="listing-reviews">
                                    <h2>Reviews</h2>
                                    {reviews.length > 0 ? (
                                        reviews.map((review, index) => (
                                            <div key={index} className="review-card">
                                                <h2 className="review-header">{review.title}</h2>
                                                <p className="review-content">{review.content}</p>
                                                <p className="review-date">Written on: {dateFormatterDD_MM_YYYY(review.date)} by {review.usernameFrom}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="review-alert">This accommodation does not have any reviews yet...</p>
                                    )}
                                    <div>
                                        <button className='button'>Show more</button>
                                        <button className='button' onClick={handleStartChat} >Chat</button>
                                    </div>
                                </section>
                                <br />
                                <section className="listing-host-info">
                                    <h2>Host profile</h2>
                                    {host && (
                                        <div className="host-card">
                                            <section className="card-top">
                                                <h3>{host.Attributes[2].Value}</h3>
                                                <p>Joined on: {dateFormatterDD_MM_YYYY(host.UserCreateDate)}</p>
                                            </section>
                                            <section className="card-bottom">
                                                <p>E-Mail: {host.Attributes[4].Value}</p>
                                                <div>
                                                    <button className='button'>Contact host</button>
                                                </div>
                                            </section>
                                        </div>
                                    )}
                                </section>
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
                                <div className="summaryBlock">
                                    <label htmlFor="checkIn">Check In</label>
                                    <DatePicker
                                        id="checkIn"
                                        selected={checkIn}
                                        className='datePickerLD'
                                        onChange={(date) => setCheckIn(date)}
                                        minDate={minStart && new Date(minStart)}
                                        maxDate={maxStart && new Date(maxStart)}
                                        filterDate={filterBookedDates}
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                                {(checkIn && checkOut) ? (
                                    <div className="nights">
                                        <p>{Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24))} night(s)</p>
                                    </div>
                                ) : (
                                    <div className="nights">
                                        <p>0 nights</p>
                                    </div>
                                )}

                                <div className="summaryBlock">
                                    <label htmlFor="checkOut">Check Out</label>
                                    <DatePicker
                                        id="checkOut"
                                        selected={checkOut}
                                        className='datePickerLD'
                                        onChange={(date) => setCheckOut(date)}
                                        minDate={minEnd && new Date(minEnd)}
                                        maxDate={maxEnd && new Date(maxEnd)}
                                        filterDate={filterBookedDates}
                                        dateFormat="yyyy-MM-dd"
                                    />
                                </div>
                            </div>
                            <div className="travelers">
                                <label>Travelers</label>
                                <p>Maximum amount of travelers: {accommodation.GuestAmount}</p>
                                <br />
                                <div className="summaryBlock">
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
                            <div className="summaryBlock">
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
                                            €{accommodation.Rent} a night</p>
                                        <p>€{(new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24) * accommodation.Rent}</p>
                                    </div>
                                    <div className="price-item">
                                        <p>Cleaning fee</p>
                                        <p>&euro;{cleaningFee}</p>
                                    </div>
                                    <div className="price-item">
                                        <p>Domits service fee</p>
                                        <p>€{serviceFee.toFixed(2)}</p>
                                    </div>
                                    <div className="total">
                                        <p>Total</p>
                                        <p>€{totalPrice.toFixed(2)}</p>
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
