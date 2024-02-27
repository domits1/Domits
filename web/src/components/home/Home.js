import React from "react";
import backgroundImage from '../../images/landingpagebg.png';
import {Link} from "react-router-dom";


function Home() {
    const styles = {
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
    };

    return (
        <div style={styles}>
            <h1>Home </h1>
        </div>
    );
}

export default Home;