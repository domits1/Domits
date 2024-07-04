import React from "react";
import './howitworksrework.css';
import profile from '../../images/profile-icon.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCalendarAlt, faUser } from '@fortawesome/free-solid-svg-icons';

function Howitworks() {
    return (
        <section className="howitworksmain">
            <article className="howitworkstitlescontainer">
                <h3 className="howitworksTitleDomits">How Domits Works</h3>
                <h5 className="howitworkssmallerTitleDomits">Discover how Domits makes it easy for both guests and hosts.</h5>
            </article>
            <article className="guestSmallTitleContainer">
                <h4 className="infoTitleGuest">Guests</h4>
            </article>
            <article className="guestinfoblockhowitworks">
                <section className="informationContainerHowItWorks borderright">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">Search your destination</h3>
                        <FontAwesomeIcon icon={faSearch} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">Explore countless vacation rentals with Domits’ user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match.</p>
                </section>
                <section className="informationContainerHowItWorks">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">Book your next holiday</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">Secure your dream stay with Domits now! Choose your preferred accommodation and book in just a few clicks.</p>
                </section>
                <section className="informationContainerHowItWorks borderleft">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">Experience Domits</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">Unlimited support, personalized modern dashboard and messaging with your host for further details.</p>
                </section>
            </article>

            <article className="guestSmallTitleContainer">
                <h4 className="infoTitleGuest">Hosts</h4>
            </article>
            <article className="guestinfoblockhowitworks bluebackground">
                <section className="informationContainerHowItWorks borderright">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">List your property for rental</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">List your property in a few simple steps. Add photos, describe your property, set your price and share availability. </p>
                </section>
                <section className="informationContainerHowItWorks">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">Get paid easy, fast and safe</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">Connect your details to our payment system and get paid. Oversee your occupancy, revenue management, reports and average daily rate..</p>
                </section>
                <section className="informationContainerHowItWorks borderleft">
                    <section className="titleIconHowItWorks">
                        <h3 className="titleinformationH3">Welcome your guests</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'}  color="white"/>
                    </section>
                    <p className="informationHowItWorksP">Give your guests a warmhearted welcome. Manage your properties, calendars, reservations, messages and much more...</p>
                </section>
            </article>
        </section>
    );
}

export default Howitworks;
