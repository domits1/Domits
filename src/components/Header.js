import React from "react";
// import {useState} from "react";
import Login from './Login.js';
import logo from  '../logo.svg';

import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom';


function Home() {
    return (
        <div>
            <h2>Home Page</h2>
            <p>Welcome to the home page!</p>
        </div>
    );
}

function About() {
    return (
        <div>
            <h2>About Page</h2>
            <p>Learn more about our platform here.</p>
        </div>
    );
}


function Header() {
    return (
         <Router>
    <div className="App">
        <header className="app-header">
            <nav>
                <ul>
                    <li>
                        <Link to="/">Do Book</Link>
                    </li>
                    <li>
                        <Link to="/about">Do Extra's</Link>
                    </li>
                    <li>
                        <Link to="/login">Do Work</Link>
                    </li>
                    <li>
                        <Link to="/login">Do Contact us</Link>
                    </li>
                </ul>
            </nav>
        </header>

        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
        </Routes>
    </div>
</Router>
    );
}

export default Header;