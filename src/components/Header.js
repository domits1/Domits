import React, { useState } from 'react';
import { Link, BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function Header({ isLoginModalOpen, openLoginModal, closeLoginModal }) {
//
    return (
        <div className="App">
            <header className="app-header">
                <nav>
                    <ul>
                        <li>
                            <div className="logo">
                                <img src={process.env.PUBLIC_URL + '/logo.svg'} alt="Logo" />

                            </div>
                        </li>
                        <li>
                            <Link to="/">Landing</Link>
                        </li>
                        <li>
                            <Link to="/home">Home</Link>
                        </li>
                        <li>
                            <Link to="/booking">Do Book</Link>
                        </li>
                        <li>
                            <Link to="/about">Do Extra's</Link>
                        </li>
                        <li>
                            <Link to="/work">Do Work</Link>
                        </li>
                        <li>
                            <Link to="/contact">Do Contact us</Link>
                        </li>
                        <li>
                            <button onClick={openLoginModal}>Login</button>
                        </li>
                    </ul>
                </nav>
            </header>
        </div>
    );
}

export default Header;