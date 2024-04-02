import React from "react";
import "./listingdetails.css";
import detailbigimg from '../../images/accobigimg.png';
import detailimg1 from '../../images/accoimg1.png';
import detailimg2 from '../../images/accoimg2.png';
import accomap from '../../images/accomap.png';
import detailimg3 from '../../images/accoimg3.png';
import detailimg4 from '../../images/accoimg4.png';
import adultroom from '../../images/adultacco.png';
import teenroom from '../../images/teenacco.jpg';
import kidroom from '../../images/kidacco.jpg';
import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import telescope from "../../images/telescope.png";
import smarttv from "../../images/tv.png";
import sauna from "../../images/thermometer.png";
import vault from "../../images/vault.png";
import superfastwifi from "../../images/wifi.png";
import welcomegift from "../../images/gift.png";
import dimmablelight from "../../images/light.png";
import goated from "../../images/goated.jpg"
import bookarrow from "../../images/whitearrow.png"
import backarrow from "../../images/arrowleft.png";
import pluscircle from "../../images/plus-circle.svg";
import pluscircleblack from "../../images/plus-circle-black.svg";
import star from "../../images/Star.svg";
import arrow from "../../images/arrow.svg"

const ListingDetails = () => {
    return (
        <div className="listing-details-container">
            <div className="booking-information-section">
                <div className="listing-details-top">
                    <div className="listing-details-back-arrow">
                        <a href="/">
                            <img src={backarrow} alt="Back Arrow" />
                            <div className="listing-details-back-arrow">Back</div>
                        </a>
                    </div>
                    <div className="listing-details-title">
                        Minimalistic and cozy place in Haarlem
                    </div>
                </div>
                <div className="listing-details-image-window">
                    <div className="listing-details-big-img">
                        <img src={detailbigimg} alt="detailbigimg" />
                    </div>
                    <div className="listing-details-side-img">
                        <img src={detailimg1} alt="detailimg1" />
                        <img src={accomap} alt="detailimg2" id="top-right-img" />
                        <img src={detailimg3} alt="detailimg3" />
                        <img src={detailimg4} alt="detailimg4" id="bottom-right-img" />
                    </div>
                </div>
                <div className="price-and-rooms-row">
                    <div className="price-per-night-text">$1400 night</div>
                    <div className="guest-and-rooms-text">8 guests - 8 beds - 4 bedrooms - 4 bathrooms</div>
                </div>
                <div className="accommodation-detais-text">Accommodation details</div>
                <div className="rooms-text">Rooms</div>
                <div className="listing-details-rooms-section">
                    <div className="listing-details-room">
                        <div className="listing-details-room-title">2 Persons bedroom</div>
                        <div className="listing-details-room-bed">Double bed</div>
                        <div className="listing-details-room-text">Enjoy the double bed and sleep like a king</div>
                        <div className="listing-detail-room-image first-room-image">
                            <img src={adultroom} alt="Room image" />
                        </div>
                    </div>
                    <div className="listing-details-room">
                        <div className="listing-details-room-title">Teenagers room</div>
                        <div className="listing-details-room-bed">Bunker bed</div>
                        <div className="listing-details-room-text">A room with a bunker bed for your teenagers</div>
                        <div className="listing-detail-room-image">
                            <img src={teenroom} alt="Room image" />
                        </div>
                    </div>
                    <div className="listing-details-room">
                        <div className="listing-details-room-title">Kids themed room</div>
                        <div className="listing-details-room-bed">2 single beds</div>
                        <div className="listing-details-room-text">2 single kids themed beds with a nice vibe</div>
                        <div className="listing-detail-room-image last-room-image">
                            <img src={kidroom} alt="Room image" />
                        </div>
                    </div>
                </div>
                <div className="show-more-button">
                    <button className="listing-details-show-more">
                        <img src={pluscircle} alt="Plust circle" />Show more
                    </button>
                </div>
                <div className="listing-details-place-offers-text">This place offers the following:</div>
                <div className="listing-details-place-offers">
                    <div className="listing-details-offer-item">
                        <img src={smarttv} alt="Smart TV" /> Smart TV
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={sauna} alt="Sauna" /> Sauna
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={vault} alt="Vault" /> Vault
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={welcomegift} alt="Welcome Gift" /> Welcome Gift
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={dimmablelight} alt="Dimmable lights" /> Dimmable lights
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={telescope} alt="Telescope" /> Telescope
                    </div>
                    <div className="listing-details-offer-item">
                        <img src={superfastwifi} alt="Super fast WiFi" /> Super fast WiFi
                    </div>
                </div>
                <div className="show-more-button">
                    <button className="listing-details-show-more black-show-more">
                        <img src={pluscircleblack} alt="Plust circle" />Show more
                    </button>
                </div>
                <div className="listing-details-review-card-title">Reviews</div>
                <div className="listing-details-verified-guests-text">Verified Domits guests have said this:</div>
                <div className="listing-details-review-card">
                    <div className="listing-details-review-title">Clint Eastwood</div>
                    <div className="listing-details-review-rating">
                        <img src={star} alt="Star" /> 5,00
                    </div>
                    <div className="listing-details-review-staying-time">Stayed from: 27/11/’23 - 03/12/’23</div>
                    <div className="listing-details-review-text">
                        Mr. Homer, the host, is a good host. He is kind and
                        also offers free fruit. The mornings in the office are a bit chilly though.
                    </div>
                </div>
                <div className="listing-details-review-card">
                    <div className="listing-details-review-title">East Clintwood</div>
                    <div className="listing-details-review-rating">
                        <img src={star} alt="Star" /> 4,50
                    </div>
                    <div className="listing-details-review-staying-time">Stayed from: 02/12/’23 - 09/12/’23</div>
                    <div className="listing-details-review-text">
                        Such a beautiful location. Much green and a nice park nearby. Good location for conveniences
                        close by.
                    </div>
                </div>
                <div className="listing-details-review-card">
                    <div className="listing-details-review-title">Clint Eastwood</div>
                    <div className="listing-details-review-rating">
                        <img src={star} alt="Star" /> 5,00
                    </div>
                    <div className="listing-details-review-staying-time">Stayed from: 27/11/’23 - 03/12/’23</div>
                    <div className="listing-details-review-text">
                        Mr. Homer, the host, is a good host. He is kind and
                        also offers free fruit. The mornings in the office are a bit chilly though.
                    </div>
                </div>
                <div className="show-more-button">
                    <button className="listing-details-show-more black-show-more listing-details-extra-margin-top">
                        <img src={pluscircleblack} alt="Plust circle" />Show more
                    </button>
                </div>
                <div className="listing-details-country-place-text">The Netherlands, Haarlem</div>
                <div className="listing-details-things-closeby-text">Things to do closeby:</div>
                <div className="listing-details-things-to-do-card">
                    <div className="listing-details-things-to-do-title">Goat milking at Timo’s farm</div>
                    <div className="listing-details-things-to-do-content">
                        <div className="listing-details-things-to-do-information">
                            <div>
                                Always wanted to milk a goat? Drink the freshest milk you ever drank? Timo is welcoming visitors
                                for over 5 years. At his farm you will be given a tour, feed the animals and talk about his
                                goats the entire time!
                            </div>
                            <div className="listing-details-things-to-do-more-info">
                                <a href="">More info</a>
                            </div>
                        </div>
                        <div className="listing-details-things-to-do-image">
                            <img src={goated} alt="Things to do Image" />
                        </div>
                    </div>
                </div>
                <div className="show-more-button">
                    <button className="listing-details-show-more black-show-more listing-details-extra-margin-top">
                        <img src={pluscircleblack} alt="Plust circle" />Show more
                    </button>
                </div>
            </div>
            {/* End of the booking-information-section*/}

            {/* Start of the booking-details-section*/}
            <div className="booking-details-section">
                <div className="booking-details-text">Booking details</div>
                <div className="booking-details-card">
                    <div className="listing-details-check-container">
                        <div className="listing-details-checkin-text">Check in</div>
                        <div className="listing-details-checkout-text">Check out</div>
                    </div>
                    <div className="listing-details-dates-container">
                        <div className="listing-details-checkin-date">15 december 2023</div>
                        <div className="listing-details-amount-of-nights-text">
                            7<br />
                            <img src={arrow} alt="Arrow" />
                            Nights
                        </div>
                        <div className="listing-details-checkout-date">23 december 2023</div>
                    </div>
                    <div className="listing-details-guests-pets-container">
                        <div className="listing-details-guests-text">Guests</div>
                        <div className="listing-details-pets-text">Pets</div>
                    </div>
                    <div className="listing-details-guests-pets-content">
                        <div className="listing-details-amount-of-adults">2 adults</div>
                        <div className="listing-details-amount-of-kids">2 kids</div>
                        <div className="listing-details-select">Select...</div>
                    </div>
                    <div className="listing-details-book-button">
                        <Link to={`/bookingoverview`}>
                            <button>Book* <img src={bookarrow} alt="Book Arrow" /></button>
                        </Link>
                    </div>
                    <div className="listing-details-book-button-star-text">*You wont be charged yet</div>
                    {/*  Horizontal line  */}
                    <hr />
                    <div className="listing-details-booking-information-section">
                        <div className="listing-details-booking-information-row">
                            <div className="listing-details-booking-information-text">7 nights x $1400 a night</div>
                            <div className="listing-details-booking-information-text">$9800</div>
                        </div>
                        <div className="listing-details-booking-information-row">
                            <div className="listing-details-booking-information-text">Season booking discount</div>
                            <div className="listing-details-booking-information-text">-$75</div>
                        </div>
                        <div className="listing-details-booking-information-row">
                            <div className="listing-details-booking-information-text">Cleaning fee</div>
                            <div className="listing-details-booking-information-text">$100</div>
                        </div>
                        <div className="listing-details-booking-information-row">
                            <div className="listing-details-booking-information-text">Domits service fee</div>
                            <div className="listing-details-booking-information-text">$98</div>
                        </div>
                        <div className="listing-details-booking-information-row">
                            <div className="listing-details-booking-total-text">Total</div>
                            <div className="listing-details-booking-total-price">$9923</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListingDetails;