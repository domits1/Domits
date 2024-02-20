import React, { useState } from 'react';
import './base.css'
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import { useNavigate } from 'react-router-dom';

//search balk files
import { SearchBar } from './SearchBar';
import { SearchResultsList } from './SearchResultsList';

function Header() {
    const navigate = useNavigate();

    const navigateToLogin = () => {
        navigate('/login');
    };
    const navigateToLanding = () => {
        navigate('/landing');
    };
    const navigateToNinedots = () => {
        navigate('/travelinnovation');
    };
    const [results, setResults] = useState([]);
    return (
        <div className="App">
            <header className="app-header">
                <nav className="header-nav">
                    <div className="logo">
                        <a href="/">
                            <img src={logo} width={50} alt="Logo" />
                        </a>
                    </div>
                    <div className='App'>
                        <div className='search-bar-container'>
                            {/* Zoekbalk en zoekresultaten  */}
                            {/* Disclaimer dit stuk hoort bij drie andere files die beginnen met Search :)  */}
                            <SearchBar setResults={setResults} />
                            <SearchResultsList results={results} />
                        </div>
                    </div>
                    <div className='headerRight'>
                        <button className="headerButtons" onClick={navigateToLanding}>
                            Become a host
                        </button>
                        <button className="headerButtons" onClick={navigateToNinedots}>
                            <img src={nineDots} alt={nineDots} />
                        </button>
                        <button className="personalMenu" onClick={navigateToLogin}>
                            <img src={profile} alt={profile} />
                            <img src={arrowDown} alt={arrowDown} />
                        </button>
                    </div>
                </nav>
            </header>
        </div>
    );
}

export default Header;
