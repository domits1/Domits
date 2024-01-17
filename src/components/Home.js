import React from "react";
import Header from "./base/Header";
import backgroundImage from '../images/landingpagebg.png';
import {Link} from "react-router-dom"; // Adjust the image path as needed


function Home() {
    const styles = {
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
            <h1>Home </h1>
        </div>
    );
}

export default Home;