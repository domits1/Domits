import React from 'react';
import Pages from "./Pages.js";
import { useNavigate } from 'react-router-dom';

const HostPropertyCare = () => {
    const navigate = useNavigate();


    const handleContactNavigation = () => {
        navigate('/contact');  // Navigate to the contact page
    };
    return (
        <main className="page-body">
            <section className='host-pc' style={{
                display: "flex",
                width: "100%",
            }}>
                <Pages/>
                <div className="content" style={{display: 'flex', flexDirection: 'column', alignItems:'center'}}>
                    <h1>Property Care</h1>
                    <h3 style={{width:'60%'}}>
                        Are you looking for a cleaner, housekeeper or maintenance handyman? Our partner Mostpros
                        has a network of home service professionals ready to support you.
                        <span
                            onClick={handleContactNavigation}
                            style={{color: 'blue', textDecoration: 'underline', cursor: 'pointer'}}> Send us a message here
                        </span> and we connect you with them.
                    </h3>
                </div>
            </section>
        </main>
    );
}

export default HostPropertyCare;
