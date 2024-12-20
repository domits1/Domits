import React, { useEffect, useState, useContext, useRef, toggleBar } from 'react';
import { Link,  useNavigate, useLocation } from 'react-router-dom';
import logo from '../../logo.svg';
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import FlowContext from '../../FlowContext';
import { Auth } from 'aws-amplify';
import './components/bases.css';
import { SearchBar } from '../base/SearchBar';

function Header({ setSearchResults, setLoading }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { setFlowState } = useContext(FlowContext);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState('');
    const [username, setUsername] = useState('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentView, setCurrentView] = useState('guest'); 
    const [isBarActive, setIsBarActive] = useState(false);


    const searchBarRef = useRef(null);
    useEffect(() => {
        const SCROLL_TRIGGER = 400;

        const handleScroll = () => {
            if (!searchBarRef.current) return; 

            const scrollPosition = window.scrollY;  

            if (scrollPosition > SCROLL_TRIGGER) {
                searchBarRef.current.classList.add('visible');
            } else {
                searchBarRef.current.classList.remove('visible');
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []); 

    useEffect(() => {
        const script = document.createElement('script');
        script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
        script.async = true;
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    useEffect(() => {
        checkAuthentication();
    }, []);

    
    const toggleBar = (isActive) => {
        setIsBarActive(isActive); 
    };

    useEffect(() => {
        setDropdownVisible(false);
    }, [location]);

    const checkAuthentication = async () => {
        try {
            const session = await Auth.currentSession();
            const user = await Auth.currentAuthenticatedUser();
            setIsLoggedIn(true);
            setGroup(user.attributes['custom:group']);
            setUsername(user.attributes['given_name']);
            setCurrentView(user.attributes['custom:group'] === 'Host' ? 'host' : 'guest');
        } catch (error) {
            setIsLoggedIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            await Auth.signOut();
            setIsLoggedIn(false);
            window.location.reload();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const toggleDropdown = () => setDropdownVisible(!dropdownVisible);

    const renderDropdownMenu = () => {
        return currentView === 'host' ? (
            <>
                <div className="header-hello-username">Hello {username}!</div>
                <button onClick={() => navigate('/hostdashboard')} className="header-dropdown-login-button">Dashboard</button>
                <button onClick={handleLogout} className="header-dropdown-logout-button">
                    Log out<img src={logoutArrow} alt="Logout Arrow" />
                </button>
            </>
        ) : (
            <>
                <div className="header-hello-username">Hello {username}!</div>
                <button onClick={() => navigate('/guestdashboard')} className="header-dropdown-login-button">Profile</button>
                <button onClick={handleLogout} className="header-dropdown-logout-button">
                    Log out<img src={logoutArrow} alt="Logout Arrow" />
                </button>
            </>
        );
    };

    return (
        <header className="header-app-header">
            <nav className={`header-nav ${isBarActive ? "hide-other-content" : ""}`}>
                <div className="header-logo">
                    <a href="/home">
                        <img src={logo} width={150} alt="Logo" />
                    </a>
                </div>
                <div ref={searchBarRef} className="App search-bar-hidden">
                    <SearchBar setSearchResults={setSearchResults} setLoading={setLoading} toggleBar={toggleBar}  />
                </div>             
                <div className="header-right">
                    <button className="header-buttons header-host-button" onClick={() => navigate('/landing')}>
                        Become a Host
                    </button>
                    <button className="header-buttons" onClick={() => navigate('/travelinnovation')}>
                        <img src={nineDots} alt="Nine Dots" />
                    </button> 
                    <div className="header-personal-menu-dropdown">
                        <button className="header-personal-menu" onClick={toggleDropdown}>
                            <img src={profile} alt="Profile Icon" />
                            <img src={arrowDown} alt="Dropdown Arrow" />
                        </button>
                        <div className={`header-personal-menu-dropdown-content ${dropdownVisible ? 'show' : ''}`}>
                            {isLoggedIn ? renderDropdownMenu() : (
                                <>
                                    <button onClick={() => navigate('/login')} className="header-dropdown-login-button">
                                        Login<img src={loginArrow} alt="Login Arrow" />
                                    </button>
                                    <button onClick={() => navigate('/register')} className="header-dropdown-register-button">
                                        Register
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}

export default Header;
