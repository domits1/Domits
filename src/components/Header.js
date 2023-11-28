import React from "react";
import Logo from '../logo.svg';
import Login from "./Login.js";
import About from "./About.js";
import Home from "./Home.js";
import Booking from "./Booking";
import {BrowserRouter as Router, Route, Link, Routes} from 'react-router-dom';
import Work from "./Work";
import Contact from "./Contact";


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
                        <Link to="/booking">Do Book -</Link>
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

             <Routes>
                 <Route path="/" element={<Home />} />
                 <Route path="/booking" element={<Booking />} />
                 <Route path="/about" element={<About />} />
                 <Route path="/work" element={<Work />} />
                 <Route path="/contact" element={<Contact />} />
                 <Route path="/login" element={<Login />} />
             </Routes>
</Router>
    );
}

export default Header;