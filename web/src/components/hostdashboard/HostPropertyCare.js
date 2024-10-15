import React from 'react';
import Pages from "./Pages.js";
import { useNavigate } from 'react-router-dom';

const HostPropertyCare = () => {
    const navigate = useNavigate();


    const handleContactNavigation = () => {
        navigate('/contact');
    };
    return (
        <main className="page-body">
            <section className='host-pc' style={{
                display: "flex",
                width: "100%",
            }}>
                <Pages/>
                <div className="property-content">
                    <h1>Property Care</h1>
                    <h3 style={{width:'60%'}}>
                        Are you looking for a cleaner, housekeeper or maintenance handyman? Our partner Mostpros
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
