import React, { useState, useEffect } from 'react';
import './base.css';
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth } from "aws-amplify";

import { SearchBar } from './SearchBar';
import { SearchResultsList } from './SearchResultsList';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const navigateToLogin = () => {
        navigate('/login');
    };
    const navigateToRegister = () => {
        navigate('/register');
    };
    const navigateToLanding = () => {
        navigate('/landing');
    };
    const navigateToNinedots = () => {
        navigate('/travelinnovation');
    };
    const navigateToProfile = () => {
        navigate('/guestdashboard');
    };
    const navigateToMessages = () => {
        navigate('/guestdashboard/messages');
    };
    const navigateToPayments = () => {
        navigate('/guestdashboard/payments');
    };
    const navigateToReviews = () => {
        navigate('/guestdashboard/reviews');
    };
    const navigateToSettings = () => {
        navigate('/guestdashboard/settings');
    };

    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false); // State to manage authentication status
    const [results, setResults] = useState([]);

    useEffect(() => {
        checkAuthentication(); // Check authentication status on component mount
    }, []);

    useEffect(() => {
        // Close dropdown when location changes
        setDropdownVisible(false);
    }, [location]);

    const checkAuthentication = async () => {
        try {
            await Auth.currentSession();
            setIsLoggedIn(true); // Update isLoggedIn state if user is authenticated
        } catch (error) {
            setIsLoggedIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await Auth.signOut();
            setIsLoggedIn(false); // Update isLoggedIn state after logout
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible);
    };

    return (
        <div className="App">
            <header className="app-header">
                <nav className="header-nav">
                    <div className="logo">
                        <a href="/">
                            <img src={logo} width={50} alt="Logo"/>
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
                            <img src={nineDots} alt={nineDots}/>
                        </button>
                        <div className="personalMenuDropdown">
                            <button className="personalMenu" onClick={toggleDropdown}>
                                <img src={profile} alt={profile}/>
                                <img src={arrowDown} alt={arrowDown}/>
                            </button>
                            <div className={"personalMenuDropdownContent" + (dropdownVisible ? ' show' : '')}>
                                {isLoggedIn ? (
                                     <>
                                         <button onClick={navigateToProfile} className="dropdownLoginButton">Profile</button>
                                         <button onClick={navigateToMessages} className="dropdownLoginButton">Messages</button>
                                         <button onClick={navigateToPayments} className="dropdownLoginButton">Payments</button>
                                         <button onClick={navigateToReviews} className="dropdownLoginButton">Reviews</button>
                                         <button onClick={navigateToSettings} className="dropdownLoginButton">Settings</button>
                                         <button onClick={handleLogout} className="dropdownLogoutButton">Log out<img
                                             src={logoutArrow} alt="Logout Arrow"/></button>
                                     </>
                                ) : (
                                    <>
                                        <button onClick={navigateToLogin} className="dropdownLoginButton">Login<img
                                            src={loginArrow} alt="Login Arrow"/></button>
                                        <button onClick={navigateToRegister}
                                                className="dropdownRegisterButton">Register
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>
            </header>
        </div>
    );
}

export default Header;
