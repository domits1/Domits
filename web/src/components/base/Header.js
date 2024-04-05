import React, {useEffect, useState} from 'react';
import './base.css'
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import {Auth} from "aws-amplify";

function Header() {
    const navigate = useNavigate();

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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState(''); // State to store user group
    const [username, setUsername] = useState(''); // State to store username
    const [results, setResults] = useState([]);

    useEffect(() => {
        checkAuthentication();
    }, []);

    useEffect(() => {
        setDropdownVisible(false);
    }, [location]);

    const checkAuthentication = async () => {
        try {
            const session = await Auth.currentSession();
            const user = await Auth.currentAuthenticatedUser();
            setIsLoggedIn(true);
            const userAttributes = user.attributes;
            const userGroup = userAttributes['custom:group'];
            setGroup(userGroup); // Set the group state based on user's custom:group attribute
            const userName = userAttributes['custom:username'];
            setUsername(userName); // Set the username state based on user's custom:username attribute
        } catch (error) {
            setIsLoggedIn(false);
            console.error('Error logging in:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await Auth.signOut();
            setIsLoggedIn(false);
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
                            <img src={logo} width={150} alt="Logo" />
                        </a>
                    </div>
                    <div className='App'>
                        <SearchBar setResults={setResults} />
                    </div>
                    <div className='headerRight'>
                        <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
                            Become a host
                        </button>
                        <button className="headerButtons" onClick={navigateToNinedots}>
                            <img src={nineDots} alt={nineDots} />
                        </button>
                        <div className="personalMenuDropdown">
                            <button className="personalMenu" onClick={toggleDropdown}>
                                <img src={profile} alt={profile}/>
                                <img src={arrowDown} alt={arrowDown}/>
                            </button>
                            <div className={"personalMenuDropdownContent" + (dropdownVisible ? ' show' : '')}>
                                {isLoggedIn ? (
                                    <>
                                        <div className="helloUsername">Hello {username}!</div>
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
