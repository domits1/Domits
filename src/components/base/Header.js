import React, { useState } from 'react';
import './base.css'
import { Link, BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import logo from "../../logo.svg";
import SearchBar from "../SearchBar"


function Header({ openLoginModal }) {
    return (
        <div className="App">
            <header className="app-header">
                <nav className="header-nav">
                    <div className="logo">
                        <img src={logo} width={50} alt="Logo" />
                    </div>
                    <SearchBar />
                    <div className="login-container">
                        <button onClick={openLoginModal}>Login</button>
                    </div>
                </nav>
            </header>
        </div>
    );
}
export default Header;