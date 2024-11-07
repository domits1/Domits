import React, {useEffect, useState, useContext} from 'react';
import {Link} from 'react-router-dom';
import './base.css';
import logo from "../../logo.svg";
import nineDots from '../../images/dots-grid.svg';
import profile from '../../images/profile-icon.svg';
import arrowDown from '../../images/arrow-down-icon.svg';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import FlowContext from '../../FlowContext';
import {useNavigate, useLocation} from 'react-router-dom';
import {SearchBar} from './SearchBar';
import {Auth} from "aws-amplify";
import {fetchTranslation} from '../utils/translate';

function Header({setSearchResults, setLoading}) {
    const navigate = useNavigate();
    const location = useLocation();
    const {setFlowState} = useContext(FlowContext);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState('');
    const [username, setUsername] = useState('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentView, setCurrentView] = useState('guest'); // 'guest' or 'host'
    const [isActiveSearchBar, setActiveSearchBar] = useState(false);
    const [language, setLanguage] = useState("en"); // State for selected language
    const [targetLanguage, setTargetLanguage] = useState("en"); // State for selected target language
    const [translatedTexts, setTranslatedTexts] = useState({
        headerTitle: "Welcome to Domits",
        description: "Your all-in-one travel solution.",
        becomeHost: "Become a Host",
        switchToHost: "Switch to Host",
        switchToGuest: "Switch to Guest",
        goToDashboard: "Go to Dashboard",
        login: "Login",
        register: "Register",
        hello: "Hello",
        dashboard: "Dashboard",
        calendar: "Calendar",
        reservations: "Reservations",
        messages: "Messages",
        logOut: "Log out",
        profile: "Profile",
        payments: "Payments",
        reviews: "Reviews",
        settings: "Settings",
        translateLabel: "Translate"
    });

    const languages = [
        {code: "en", label: "English"},
        {code: "es", label: "Spanish"},
        {code: "fr", label: "French"},
        {code: "de", label: "German"},
        {code: "nl", label: "Dutch"},
    ];

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

    const handleLanguageChange = async (event) => {
        const targetLang = event.target.value;
        setTargetLanguage(targetLang); // Update the target language for SearchBar
        const translationKeys = Object.keys(translatedTexts);

        const translations = {};
        for (const key of translationKeys) {
            translations[key] = await fetchTranslation(translatedTexts[key], language, targetLang);
        }

        setTranslatedTexts(translations);
        setLanguage(targetLang); // Update current language in Header
    };

    const renderDropdownMenu = () => {
        if (currentView === 'host') {
            return (
                <>
                    <div className="helloUsername">{translatedTexts.hello} {username}!</div>
                    <button onClick={() => navigate('/hostdashboard')}
                            className="dropdownLoginButton">{translatedTexts.dashboard}</button>
                    <button onClick={() => navigate('/hostdashboard/calendar')}
                            className="dropdownLoginButton">{translatedTexts.calendar}</button>
                    <button onClick={() => navigate('/hostdashboard/reservations')}
                            className="dropdownLoginButton">{translatedTexts.reservations}</button>
                    <button onClick={() => navigate('/hostdashboard/chat')}
                            className="dropdownLoginButton">{translatedTexts.messages}</button>
                    <button onClick={handleLogout} className="dropdownLogoutButton">{translatedTexts.logOut}<img
                        src={logoutArrow} alt="Logout Arrow"/></button>
                </>
            );
        } else {
            return (
                <>
                    <div className="helloUsername">{translatedTexts.hello} {username}!</div>
                    <button onClick={() => navigate('/guestdashboard')}
                            className="dropdownLoginButton">{translatedTexts.profile}</button>
                    <button onClick={() => navigate('/guestdashboard/chat')}
                            className="dropdownLoginButton">{translatedTexts.messages}</button>
                    <button onClick={() => navigate('/guestdashboard/payments')}
                            className="dropdownLoginButton">{translatedTexts.payments}</button>
                    <button onClick={() => navigate('/guestdashboard/reviews')}
                            className="dropdownLoginButton">{translatedTexts.reviews}</button>
                    <button onClick={() => navigate('/guestdashboard/settings')}
                            className="dropdownLoginButton">{translatedTexts.settings}</button>
                    <button onClick={handleLogout} className="dropdownLogoutButton">{translatedTexts.logOut}<img
                        src={logoutArrow} alt="Logout Arrow"/></button>
                </>
            );
        }
    };

    return (
        <div className="App">
            <header className="app-header">
                <nav
                    className={`header-nav ${isActiveSearchBar ? 'active' : 'inactive'} ${isActiveSearchBar ? 'no-scroll' : ''}`}>
                    <div className="logo">
                        <a href="/">
                            <img src={logo} width={150} alt="Logo"/>
                        </a>
                    </div>
                    <div className='App'>
                        <SearchBar
                            setSearchResults={setSearchResults}
                            setLoading={setLoading}
                            toggleBar={setActiveSearchBar}
                            sourceLanguage={language}
                            targetLanguage={targetLanguage}
                        />
                    </div>
                    <div className='headerRight'>
                        <ul className='header-links'>
                            {!isLoggedIn ? (
                                <button className="headerButtons headerHostButton" onClick={() => navigate('/landing')}>
                                    {translatedTexts.becomeHost}
                                </button>
                            ) : group === 'Host' ? (
                                <button className="headerButtons headerHostButton"
                                        onClick={() => navigate(currentView === 'guest' ? '/hostdashboard' : '/guestdashboard')}>
                                    {currentView === 'guest' ? translatedTexts.switchToHost : translatedTexts.switchToGuest}
                                </button>
                            ) : (
                                <button className="headerButtons headerHostButton" onClick={() => navigate('/landing')}>
                                    {translatedTexts.becomeHost}
                                </button>
                            )}
                            {isLoggedIn && group === 'Traveler' && (
                                <button className="headerButtons" onClick={() => navigate('/guestdashboard')}>
                                    {translatedTexts.goToDashboard}
                                </button>
                            )}
                            <button className="headerButtons nineDotsButton"
                                    onClick={() => navigate('/travelinnovation')}>
                                <img src={nineDots} alt="Nine Dots"/>
                            </button>
                        </ul>
                        <div className="personalMenuDropdown">
                            <button className="personalMenu" onClick={toggleDropdown}>
                                <img src={profile} alt="Profile Icon"/>
                                <img src={arrowDown} alt="Dropdown Arrow"/>
                            </button>
                            <div className={"personalMenuDropdownContent" + (dropdownVisible ? ' show' : '')}>
                                {isLoggedIn ? renderDropdownMenu() : (
                                    <>
                                        <button onClick={() => navigate('/login')}
                                                className="dropdownLoginButton">{translatedTexts.login}<img
                                            src={loginArrow} alt="Login Arrow"/></button>
                                        <button onClick={() => navigate('/register')}
                                                className="dropdownRegisterButton">{translatedTexts.register}</button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="translateDropdown">
                            <label htmlFor="language-select">{translatedTexts.translateLabel}:</label>
                            <select
                                id="language-select"
                                value={language}
                                onChange={handleLanguageChange}
                                style={{padding: "0.5rem", cursor: "pointer"}}
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </nav>
            </header>
        </div>
    );
}

export default Header;
