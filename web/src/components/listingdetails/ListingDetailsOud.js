import React, { useState, useEffect } from "react";
import "./listingdetails.css";
import huubHomer from '../../images/huubHomerSmall.png';
import detailbigimg from '../../images/accobigimg.png';
import detailimg1 from '../../images/accoimg1.png';
// import detailimg2 from '../../images/accoimg2.png';
import accomap from '../../images/accomap.png';
import detailimg3 from '../../images/accoimg3.png';
import detailimg4 from '../../images/accoimg4.png';
import adultroom from '../../images/adultacco.png';
import teenroom from '../../images/teenacco.jpg';
import kidroom from '../../images/kidacco.jpg';
// import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import telescope from "../../images/telescope.png";
import smarttv from "../../images/tv.png";
import sauna from "../../images/thermometer.png";
import vault from "../../images/vault.png";
import superfastwifi from "../../images/wifi.png";
import welcomegift from "../../images/gift.png";
import dimmablelight from "../../images/light.png";
// import goated from "../../images/goated.jpg"
import bookarrow from "../../images/whitearrow.png"
import backarrow from "../../images/arrowleft.png";
import pluscircle from "../../images/plus-circle.svg";
import pluscircleblack from "../../images/plus-circle-black.svg";
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import star from "../../images/Star.svg";
import arrow from "../../images/arrow.svg"

const images = [
    {
        original: detailbigimg,
        thumbnail: detailbigimg,
    },
    {
        original: detailimg1,
        thumbnail: detailimg1,
    },
    {
        original: detailimg3,
        thumbnail: detailimg3,
    },
    {
        original: detailimg4,
        thumbnail: detailimg4,
    },
];


const ListingDetails = ({ searchResults }) => {
    const [accolist, setAccolist] = useState([]);

  const formatData = (items) => {
    return items.map((item) => ({
      image: `https://accommodationphotos.s3.eu-north-1.amazonaws.com/${item.PhotoUrls}`,
      title: item.Title,
      details: item.description, // belangrijk voor om de details te krijgen
      size: `${item.Size}m²`,
      price: `€${item.Price} per night`,
      id: item['#PK'], // belangrijk voor om de details te krijgen
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.Persons} Persons`,
      description: item.description,
      host: item.Host,
      subtitle: item.Subtitle,
    }));
  };

  useEffect(() => {
    // console.log('Nieuwe searchResults ontvangen in Accommodations:', searchResults);

    const fetchData = async () => {
      try {
        const response = await fetch('https://cfeo8gr5y0.execute-api.eu-north-1.amazonaws.com/dev/accommodation');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        setAccolist(formatData(responseData));
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      }
    };

    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

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
                    <h1 className="listing-details-title">
                        {/* Large white villa in Athens */}
                        {accommodation.subtitle}
                    </h1>
                </div>
                <div className="listing-details-image-window">
                <ImageGallery 
                    items={images} 
                    thumbnailPosition="right" 
                    />
                    {/* <div className="listing-details-big-img">
                        <img src={detailbigimg} alt="detailbigimg" />
                    </div>
                    <div className="listing-details-side-img">
                        <img src={detailimg1} alt="detailimg1" />
                        <img src={accomap} alt="detailimg2" id="top-right-img" />
                        <img src={detailimg3} alt="detailimg3" />
                        <img src={detailimg4} alt="detailimg4" id="bottom-right-img" />
                    </div> */}
                </div>
                <div className="price-and-rooms-row">
                    <p className="price-per-night-text">$1400 per night</p>
                    <p className="guest-and-rooms-text">8 guests</p>
                    <p className="guest-and-rooms-text">4 bedrooms</p>
                    <p className="guest-and-rooms-text">4 bathrooms</p>
                    <div className="listing-details-book-button">
                        <Link to={`/bookingoverview`}>
                            <button>Book* <img src={bookarrow} alt="Book Arrow" /></button>
                        </Link>
                    </div>
                </div>

                {/* Ik weet niet of we dit ooit nodig gaan hebben  */}

                {/* <div className="accommodation-detais-text">Accommodation details</div>
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
                </div> */}
                <div className="listing-details-services-container">
                    <div className="listing-details-hostDetails">
                        <img src={huubHomer} alt="Profile picture of host" className="detailsHostImg" />
                        <div className="hostDetailsColumn">
                            <h3 className="hostDetailsHeading">Hosted by Huub</h3>
                            <span>Verified host</span>
                        </div>
                    </div>
                    <div className="listing-description">
                        <p>A sleek, white minimalist home stands under a clear blue sky, accented by a solitary tree.</p>
                    </div>
                    <h3 className="listing-details-services-header">This place offers the following:</h3>
                    <ul className="listing-details-place-offers">
                        <li className="listing-details-offer-item">
                            <img src={smarttv} alt="Smart TV" /> <span>Smart TV</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={sauna} alt="Sauna" /> <span>Sauna</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={vault} alt="Vault" /> <span>Vault</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={welcomegift} alt="Welcome Gift" /> <span>Welcome Gift</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={dimmablelight} alt="Dimmable lights" /> <span>Dimmable lights</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={telescope} alt="Telescope" /> <span>Telescope</span>
                        </li>
                        <li className="listing-details-offer-item">
                            <img src={superfastwifi} alt="Super fast WiFi" /> <span>Super fast WiFi</span>
                        </li>
                    </ul>
                    <div className="show-more-button">
                        <button className="listing-details-show-more black-show-more">
                            <img src={pluscircleblack} alt="Plust circle" />Show more
                        </button>
                    </div>
                </div>

                {/* Het gedeelte reviews heb ik uitgecomment. Dit moet later toegevoegd worden als het werkt */}

                {/* <div className="listing-details-review-card-title">Reviews</div>
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
                </div> */}


                {/* Dit gedeelte is voor things nearby. Misschien is dit nodig in de future voor nu niet */}

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


                {/* De bookingscard heb ik voor nu verwijderd.  */}

            {/* Start of the booking-details-section*/}
            {/* <div className="booking-details-section">
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
                    <div className="listing-details-book-button-star-text">*You wont be charged yet</div> */}
                    {/*  Horizontal line  */}
                    {/* <hr />
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
            </div> */}
        </div>
    );
}

export default ListingDetails;