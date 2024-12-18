import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import './base.css';
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import FlowContext from '../../FlowContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { Auth } from "aws-amplify";

function Header({ setSearchResults, setLoading }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { setFlowState } = useContext(FlowContext);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState('');
    const [username, setUsername] = useState('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentView, setCurrentView] = useState('guest'); // 'guest' or 'host'
    const [isActiveSearchBar, setActiveSearchBar] = useState(false);

    useEffect(() => {
        // Voeg het Trustpilot-script toe
        const script = document.createElement('script');
        script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
        script.async = true;
        document.head.appendChild(script);

        // Verwijder het script bij demontage van de component
        return () => {
            document.head.removeChild(script);
        };
    }, []);

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
            setGroup(userAttributes['custom:group']);
            setUsername(userAttributes['given_name']);
            setCurrentView(userAttributes['custom:group'] === 'Host' ? 'host' : 'guest');
        } catch (error) {
            setIsLoggedIn(false);
            console.error('Error logging in:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await Auth.signOut();
            setIsLoggedIn(false);
            sessionStorage.removeItem('chatOpened');
            window.location.reload();
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const toggleDropdown = () => {
        setDropdownVisible(!dropdownVisible);
    };

    const navigateToLogin = () => {
        navigate('/login');
    };
    const navigateToRegister = () => {
        navigate('/register');
    };
    const navigateToLanding = () => {
        navigate('/landing');
    };
    const navigateToWhyDomits = () => {
        navigate('/why-domits');
    };
    const navigateToNinedots = () => {
        navigate('/travelinnovation');
    };
    const navigateToGuestDashboard = () => {
        setCurrentView('guest');
        navigate('/guestdashboard');
    };
    const navigateToHostDashboard = () => {
        setCurrentView('host');
        navigate('/hostdashboard');
    };
    const navigateToMessages = () => {
        if (currentView === 'host') {
            navigate('/hostdashboard/chat');
        } else {
            navigate('/guestdashboard/chat');
        }
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

    const navigateToDashboard = () => {
        if (!isLoggedIn) {
            setFlowState({ isHost: true });
            navigate('/landing');
        } else {
            if (currentView === 'host') {
                navigateToGuestDashboard();
            } else {
                navigateToHostDashboard();
            }
        }
    };

    const renderDropdownMenu = () => {
        if (currentView === 'host') {
            return (
                <>
                    <div className="helloUsername">Hello {username}!</div>
                    <button onClick={navigateToHostDashboard} className="dropdownLoginButton">Dashboard</button>
                    <button onClick={() => navigate('/hostdashboard/calendar')}
                        className="dropdownLoginButton">Calendar
                    </button>
                    <button onClick={() => navigate('/hostdashboard/reservations')}
                        className="dropdownLoginButton">Reservations
                    </button>
                    <button onClick={() => navigate('/hostdashboard/chat')} className="dropdownLoginButton">Messages
                    </button>
                    <button onClick={handleLogout} className="dropdownLogoutButton">Log out<img
                        src={logoutArrow} alt="Logout Arrow" /></button>
                </>
            );
        } else {
            return (
                <>
                    <div className="helloUsername">Hello {username}!</div>
                    <button onClick={navigateToGuestDashboard} className="dropdownLoginButton">Profile</button>
                    <button onClick={navigateToMessages} className="dropdownLoginButton">Messages</button>
                    <button onClick={navigateToPayments} className="dropdownLoginButton">Payments</button>
                    <button onClick={navigateToReviews} className="dropdownLoginButton">Reviews</button>
                    <button onClick={navigateToSettings} className="dropdownLoginButton">Settings</button>
                    <button onClick={handleLogout} className="dropdownLogoutButton">Log out<img
                        src={logoutArrow} alt="Logout Arrow" /></button>
                </>
            );
        }
    };

    const toggleSearchBar = (status) => {
        setActiveSearchBar(status);
        if (status) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }

    return (
        <div className="App">
            <header className="app-header">
                <nav
                    className={`header-nav ${isActiveSearchBar ? 'active' : 'inactive'} ${isActiveSearchBar ? 'no-scroll' : ''}`}>
                    <div className="logo">
                        <a href="/home">
                            <img src={logo} width={150} alt="Logo" />
                        </a>
                    </div>
                    <div className='App'>
                        <SearchBar setSearchResults={setSearchResults} setLoading={setLoading}
                            toggleBar={toggleSearchBar} />
                    </div>
                    <div className='headerRight'>
                        <ul className='header-links'>
                            {!isLoggedIn ? (
                                <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
                                    Become a Host
                                </button>
                            ) : group === 'Host' ? (
                                <button className="headerButtons headerHostButton" onClick={navigateToDashboard}>
                                    {currentView === 'guest' ? 'Switch to Host' : 'Switch to Guest'}
                                </button>
                            ) : (
                                <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
                                    Become a Host
                                </button>
                            )}
                            {isLoggedIn && group === 'Traveler' && (
                                <button className="headerButtons" onClick={navigateToGuestDashboard}>
                                    Go to Dashboard
                                </button>
                            )}
                            <button className="headerButtons nineDotsButton" onClick={navigateToNinedots}>
                                <img src={nineDots} alt="Nine Dots" />
                            </button>
                        </ul>
                        <div className="personalMenuDropdown">
                            <button className="personalMenu" onClick={toggleDropdown}>
                                <img src={profile} alt="Profile Icon" />
                                <img src={arrowDown} alt="Dropdown Arrow" />
                            </button>
                            <div className={"personalMenuDropdownContent" + (dropdownVisible ? ' show' : '')}>
                                {isLoggedIn ? renderDropdownMenu() : (
                                    <>
                                        <button onClick={navigateToLogin} className="dropdownLoginButton">Login<img
                                            src={loginArrow} alt="Login Arrow" /></button>
                                        <button onClick={navigateToRegister} className="dropdownRegisterButton">Register</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </nav>
                 {/* Extra balk voor de Trustpilot-widget */}
                 <div className="trustpilot-bar">
                    <div className="trustpilot-widget" data-locale="en-GB" data-template-id="56278e9abfbbba0bdcd568bc"
                        data-businessunit-id="6731d0f09ecd53e30da42a87" data-style-height="40px" data-style-width="80%">
                        <a href="https://uk.trustpilot.com/review/domits.com" target="_blank" rel="noopener noreferrer">
                            Trustpilot
                        </a>
                    </div>
                </div>
                {/* Einde van de extra balk */}
            </header>
        </div>
    );    
}

export default Header;