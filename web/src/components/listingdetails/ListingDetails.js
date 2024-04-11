import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./listingdetails.css";
import backarrow from "../../images/arrowleft.png";
import pluscircle from "../../images/plus-circle.svg";
import pluscircleblack from "../../images/plus-circle-black.svg";
import arrow from "../../images/arrow.svg";
import bookarrow from "../../images/whitearrow.png";
import star from "../../images/Star.svg";
import smarttv from "../../images/tv.png";
import sauna from "../../images/thermometer.png";
import vault from "../../images/vault.png";
import superfastwifi from "../../images/wifi.png";
import welcomegift from "../../images/gift.png";
import dimmablelight from "../../images/light.png";
import telescope from "../../images/telescope.png";

const ListingDetails = () => {
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const pk = searchParams.get('pk');
    const sk = searchParams.get('sk');

    const [details, setDetails] = useState(null);

    useEffect(() => {
        const apiUrl = 'https://ifas5yup7h23iph6phpczxdqsq0yeaxs.lambda-url.eu-north-1.on.aws/';

        const fetchDetails = async () => {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pk: pk, sk: sk })
                });

                if (!response.ok) {
                    throw new Error('Server responded with status: ' + response.status);
                }

                const data = await response.json();
                setDetails(data);
            } catch (error) {
                console.error('Error:', error);
            }
        };

        fetchDetails();
    }, [pk, sk]);

    if (!details) {
        return <div>Loading...</div>;
    }

    return (
        <div className="listing-details-container">
            <div className="booking-information-section">
                <div className="listing-details-top">
                    <div className="listing-details-back-arrow">
                        <Link to="/">
                            <img src={backarrow} alt="Back Arrow" />
                            Back
                        </Link>
                    </div>
                    <div className="listing-details-title">{details.Title}</div>
                </div>
                <div className="listing-details-image-window">
                    <div className="listing-details-big-img">
                        <img src={`https://accommodationphotos.s3.eu-north-1.amazonaws.com/${details.PhotoUrls}`} alt="Accommodation" />
                    </div>
                </div>
                <div className="price-and-rooms-row">
                    <div className="price-per-night-text">${details.Price} night</div>
                    <div className="guest-and-rooms-text">{details.Persons} guests - {details.Bedrooms} bedrooms - {details.Bathrooms} bathrooms</div>
                </div>
                <div className="accommodation-detais-text">Accommodation details</div>
                <div className="rooms-text">Description</div>
                <p>{details.description}</p>
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
                {/* <div className="listing-details-country-place-text">The Netherlands, Haarlem</div>
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
                </div> */}
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
