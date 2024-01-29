import React, {useState} from 'react';
import './base.css'
import {Link, BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';

function Header({openLoginModal}) {
    return (
        <div className="App">
            <header className="app-header">
                <nav className="header-nav">
                    <div className="logo">
                        <a href="/">
                          <img src={logo} width={50} alt="Logo"/>
                        </a>
                    </div>
                    <div className="search-bar">
                        <input type="text" placeholder="Location"/>
                    </div>
                    <button className="becomeAHost">
                            Become a host
                    </button>
                    <button className="nineDots">
                      <img src={nineDots} alt={nineDots}/>
                    </button>
                    <button className="personalMenu" onClick={openLoginModal}>
                        <img src={profile} alt={profile}/>
                        <img src={arrowDown} alt={arrowDown}/>
                    </button>
                </nav>
            </header>
        </div>
    );
}

export default Header;