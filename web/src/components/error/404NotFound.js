import React from 'react';
import sadface from '../../images/icons/sad.png';
import './error.css';
import {useNavigate} from "react-router-dom";
const PageNotFound = () => {
    const navigate = useNavigate();

    return (
        <main className="container">
            <h1>Something went wrong...</h1>
            <img src={sadface} alt="sad" className="sad-face"/>
            <h3>The page you were looking for does not exist or has been removed</h3>
            <button className="button" onClick={() => navigate('/')}>Go back to home</button>
        </main>
    );
}

export default PageNotFound;
