import React from "react";
import './howitworksrework.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCalendarAlt, faUser } from '@fortawesome/free-solid-svg-icons';

function Howitworks() {
    return (
        <section className="howitworks__main">
            <article className="howitworks__titles-container">
                <h3 className="howitworks__title">How Domits Works</h3>
                <h5 className="howitworks__subtitle">Discover how Domits makes it easy for both guests and hosts.</h5>
            </article>
            <article className="howitworks__section-title-container">
                <h3 className="howitworks__section-title">Guests</h3>
            </article>
            <article className="howitworks__info-block howitworks__info-block--guests">
                <section className="howitworks__info-item howitworks__info-item--guests borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Search your destination</h3>
                        <FontAwesomeIcon icon={faSearch} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">Explore countless vacation rentals with Domits’ user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match.</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--guests">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Book your next holiday</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">Secure your dream stay with Domits now! Choose your preferred accommodation and book in just a few clicks.</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--guests borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Experience Domits</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">Unlimited support, personalized modern dashboard and messaging with your host for further details.</p>
                </section>
            </article>

            <article className="howitworks__section-title-container">
                <h3 className="howitworks__section-title">Hosts</h3>
            </article>
            <article className="howitworks__info-block howitworks__info-block--hosts bluebackground">
                <section className="howitworks__info-item howitworks__info-item--hosts borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">List your property for rental</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">List your property in a few simple steps. Add photos, describe your property, set your price and share availability.</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--hosts">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Get paid easy, fast and safe</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">Connect your details to our payment system and get paid. Oversee your occupancy, revenue management, reports and average daily rate.</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--hosts borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Welcome your guests</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">Give your guests a warmhearted welcome. Manage your properties, calendars, reservations, messages and much more.</p>
                </section>
            </article>
        </section>
    );
}

export default Howitworks;
