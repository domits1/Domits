import React from "react";
import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import bookarrow from "../../images/whitearrow.png"
import arrow from "../../images/arrow.svg"
import "./listingdetails.css";

const FixedCard = () => {
    return (
        <div className="fixed-card">
            <div className="listing-details-book-button">
                <Link to={`/bookingoverview`}>
                    <button>Book* <img src={bookarrow} alt="Book Arrow" /></button>
                </Link>
            </div>
            <div className="listing-details-booking-information-row">
                <div className="listing-details-booking-total-text">Total</div>
                <div className="listing-details-booking-total-price">$9923</div>
            </div>
        </div>
    );

}

export default FixedCard;