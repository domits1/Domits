import React, { useEffect, useState, useContext } from 'react';
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
            setUsername(userAttributes['custom:username']);
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
    const navigateToDashboard = () => {
        if (!isLoggedIn) {
            setFlowState({ isHost: true });
            navigate('/landing');
        } else {
            const onAnyDashboard = location.pathname.includes('dashboard');
            if (!onAnyDashboard && group === 'Host') {
                navigate('/hostdashboard');
            } else if (location.pathname.includes('hostdashboard')) {
                navigate('/guestdashboard');
            } else {
                navigate('/hostdashboard');
            }
        }
    };

    const becomeHost = () => {
        setFlowState({ isHost: true });
        navigateToLanding();
    };

    const navigateToGuestDashboard = () => {
        navigate('/guestdashboard');
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
                        <SearchBar setSearchResults={setSearchResults} setLoading={setLoading} />
                    </div>
                    <div className='headerRight'>
                        <button className="headerButtons headerHostButton" onClick={navigateToDashboard}>
                            {!isLoggedIn ? 'Become a Host' :
                                (!location.pathname.includes('dashboard') && group === 'Host') ? 'Go to Dashboard' :
                                    (group === 'Host' ? 'Switch Dashboard' : 'Become a Host')}
                        </button>
                        {isLoggedIn && group === 'Traveler' && (
                            <button className="headerButtons" onClick={navigateToGuestDashboard}>
                                Go to Dashboard
                            </button>
                        )}
                        <button className="headerButtons" onClick={navigateToNinedots}>
                            <img src={nineDots} alt="Nine Dots" />
                        </button>
                        <div className="personalMenuDropdown">
                            <button className="personalMenu" onClick={toggleDropdown}>
                                <img src={profile} alt="Profile Icon" />
                                <img src={arrowDown} alt="Dropdown Arrow" />
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
                                            src={logoutArrow} alt="Logout Arrow" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={navigateToLogin} className="dropdownLoginButton">Login<img
                                            src={loginArrow} alt="Login Arrow" /></button>
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
