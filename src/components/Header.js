import React from "react";
import './Login.js';
import './About.js';
import '../logo.svg';
import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom';


function Header() {
    return (
         <Router>
    <div className="App">
        <header className="app-header">
            <nav>
                <ul>
                    <li>
                        <Link to="/">Home -</Link>
                    </li>
                    <li>
                        <Link to="/book">Do Book -</Link>
                    </li>
                    <li>
                        <Link to="/about">Do Extra's -</Link>
                    </li>
                    <li>
                        <Link to="/work">Do Work -</Link>
                    </li>
                    <li>
                        <Link to="/contact">Do Contact us -</Link>
                    </li>
                    <li>
                        <Link to="/login">Login -</Link>
                    </li>
                </ul>
            </nav>
        </header>
    </div>
</Router>
    );
}

export default Header;