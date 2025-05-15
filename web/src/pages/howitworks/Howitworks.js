import React from "react";
import './howitworks.scss';
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
                <section className="howitworks__info-item borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Search your destination</h3>
                        <FontAwesomeIcon icon={faSearch} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">Explore countless vacation rentals with Domits’ user-friendly search filters. Customize your search by location, date, and amenities to find your perfect match.</p>
                </section>

                <section className="howitworks__info-item">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Book your next holiday</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">Secure your dream stay with Domits now! Choose your preferred accommodation and book in just a few clicks.</p>
                </section>

                <section className="howitworks__info-item borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Experience Domits</h3>
                        <FontAwesomeIcon icon={faUser} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">Unlimited support, personalized modern dashboard and messaging with your host for further details.</p>
                </section>
            </article>

            <article className="howitworks__section-title-container">
                <h3 className="howitworks__section-title">Hosts</h3>
            </article>

            <article className="howitworks__info-block howitworks__info-block--hosts">
                <section className="howitworks__info-item borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">List your property for rental</h3>
                        <FontAwesomeIcon icon={faUser} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">List your property in a few simple steps. Add photos, describe your property, set your price and share availability.</p>
                </section>

                <section className="howitworks__info-item">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Get paid easy, fast and safe</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">Connect your details to our payment system and get paid. Oversee your occupancy, revenue management, reports and average daily rate.</p>
                </section>

                <section className="howitworks__info-item borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">Welcome your guests</h3>
                        <FontAwesomeIcon icon={faUser} fontSize="1.7rem" color="white" />
                    </div>
                    <p className="howitworks__info-text">Give your guests a warmhearted welcome. Manage your properties, calendars, reservations, messages and much more.</p>
                </section>
            </article>

            <article className="howitworks__titles-container">
                <h3 className="howitworks__title">Feature overview for hosts</h3>
                <h4>Increase revenue, reduce workload, deliver beautiful experiences</h4>

                <div className="HostFeatureBlocks">
                    <div className="HostFeatureBlock">
                        <h5>#1: Core Feature</h5>
                    </div>
                    <div className="HostFeatureBlock">
                        <h5>#2: Performance Bundles</h5>
                        <p>Digital Growth, Revenue, Operations, Guest Experience.</p>
                    </div>
                    <div className="HostFeatureBlock">
                        <h5>#3: Education & Support</h5>
                        <p>9-5 mo-fr support, onboarding solutions, account team, Community.</p>
                    </div>
                </div>

                <div className="HostFeatureCategories">
                    <div className="Category">
                        <h5>Property Management System (PMS)</h5>
                        <p>Listings</p>
                        <p>Calendar</p>
                        <p>Reservations</p>
                        <p>Messages</p>
                        <p>Revenues</p>
                        <p>Reviews</p>
                        <p>Finance</p>
                    </div>

                    <div className="Category">
                        <h5>Communication</h5>
                        <p>Unified Inbox</p>
                        <p>Host Dashboard</p>
                        <p>Guest Dashboard</p>
                    </div>

                    <div className="Category">
                        <h5>Revenue Management</h5>
                        <p>Revenue overview</p>
                        <p>Occupancy rates</p>
                        <p>ADR (Average Daily Rate)</p>
                        <p>RevPAR (Revenue per Available Room)</p>
                    </div>

                    <div className="Category">
                        <h5>Operations</h5>
                        <p>Reservation management</p>
                        <p>Pricing management</p>
                        <p>Housekeeping</p>
                        <p>Maintenance management</p>
                    </div>

                    <div className="Category">
                        <h5>Client support</h5>
                        <p>FAQ</p>
                        <p>E-mail</p>
                        <p>Phone Support</p>
                    </div>
                </div>
            </article>
        </section>
    );
}

export default Howitworks;
