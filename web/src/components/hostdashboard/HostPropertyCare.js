import React from 'react';
import Pages from "./Pages.js";
import './HostPropertyCare.css';
import { useNavigate } from 'react-router-dom';

const HostPropertyCare = () => {
    const navigate = useNavigate();

    const handleContactNavigation = () => {
        navigate('/contact');
    };
    
    return (
        <main className="page-body">
            <section className='host-pc-property'>
                <Pages/>
                <div className="property-content">
                    <h1>Property Care</h1>
                    <h3 className="property-h3">
                        Are you looking for a cleaner, housekeeper, or maintenance handyman? Our partner Mostpros
                        has a network of home service professionals ready to support you.
                        <span className="property-span"
                            onClick={handleContactNavigation}
                        > Send us a message here
                        </span> and we connect you with them.
                    </h3>
                </div>
            </section>
        </main>
    );
}

export default HostPropertyCare;
