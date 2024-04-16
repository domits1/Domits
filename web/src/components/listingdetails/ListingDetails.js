import React, {useState, useEffect} from 'react';
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
import { Link, useLocation } from "react-router-dom";
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


const ListingDetails = () => {
   

    return (
        <div className="listing-details-container">
            <div className="booking-information-section">
                <div className="listing-details-top">
                    <div className="listing-details-back-arrow">
                        <Link to="/">
                            <img src={backarrow} alt="Back Arrow" />
                            <div className="listing-details-back-arrow">Back</div>
                        </Link>
                    </div>
                    <h1 className="listing-details-title">
                        Large white villa in Athens
                    </h1>
                </div>
                <div className="listing-details-image-window">
                <ImageGallery 
                    items={images} 
                    thumbnailPosition="right" 
                    />
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
            </div> 
        </div>
    );
}

export default ListingDetails;
