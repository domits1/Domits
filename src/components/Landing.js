import React from "react";
import backgroundImage from '../images/landingpagebg.png';
import {Link} from "react-router-dom"; // Adjust the image path as needed


function Landing() {
    const styles = {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '100vh', // Adjust as needed
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff', // Text color on top of the background
    };

    return (
        <div style={styles}>
            <div>
                <h1>Your perfect accommodation only at Domits </h1>
            </div>
            <div>
                <button to="/login">to home</button>
            </div>
        </div>
    );
}

export default Landing;