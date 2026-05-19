import React, {useState, useEffect, useContext} from 'react';
import { HouseOutlined as HouseOutlinedIcon, ForumOutlined as ForumOutlinedIcon, AccountCircleOutlined as AccountCircleOutlinedIcon} from '@mui/icons-material';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import FlowContext from '../../services/FlowContext';
import {useNavigate, useLocation} from 'react-router-dom';
import {Auth} from "aws-amplify";
import { createNavigationHandlers } from './navigationHandlers';

function MenuBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const {setFlowState} = useContext(FlowContext);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState('');
    const [username, setUsername] = useState('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentView, setCurrentView] = useState('guest');

    useEffect(() => {
        checkAuthentication();
    }, []);

    useEffect(() => {
        setDropdownVisible(false);
    }, [location]);

    const checkAuthentication = async () => {
        try {
            await Auth.currentSession();
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
            sessionStorage.removeItem('chatOpened');
            setIsLoggedIn(false);
            globalThis.location.reload();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const {
        toggleDropdown,
        navigateToLogin,
        navigateToRegister,
        navigateToLanding,
        navigateToGuestDashboard,
        navigateToHostDashboard,
        navigateToMessages,
        navigateToPayments,
        navigateToReviews,
        navigateToSettings,
    } = createNavigationHandlers({
        navigate,
        currentView,
        setCurrentView,
        setDropdownVisible,
    });

    const navigateToDashboard = () => {
        if (isLoggedIn) {
            if (currentView === 'host') {
                navigateToGuestDashboard();
            } else {
                navigateToHostDashboard();
            }
        } else {
            setFlowState({isHost: true});
            navigate('/landing');
        }
    };

    const renderDropdownMenu = () => {
        if (currentView === 'host') {
            const switchLabel = currentView === 'guest' ? 'Switch to Host Dashboard' : 'Switch to Guest Dashboard';
            const hostActionButton = isLoggedIn && group === 'Host'
                ? <button className="dropdownLogoutButton headerHostButton" onClick={navigateToDashboard}>{switchLabel}</button>
                : <button className="dropdownLogoutButton headerHostButton" onClick={navigateToLanding}>Become a Host</button>;
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
                    {hostActionButton}
                    {isLoggedIn && group === 'Traveler' && (
                        <button className="dropdownLogoutButton" onClick={navigateToGuestDashboard}>
                            Go to Dashboard
                        </button>
                    )}
                    <button onClick={handleLogout} className="dropdownLogoutButton">Log out<img
                        src={logoutArrow} alt="Logout Arrow"/></button>
                </>
            );
        } else {
            return (
                <>
                    <div className="helloUsername">Hello {username}!</div>
                    <button onClick={navigateToGuestDashboard} className="dropdownLoginButton"> Profile</button>
                    <button onClick={navigateToMessages} className="dropdownLoginButton">Messages</button>
                    <button onClick={navigateToPayments} className="dropdownLoginButton">Payments</button>
                    <button onClick={navigateToReviews} className="dropdownLoginButton">Reviews</button>
                    <button onClick={navigateToSettings} className="dropdownLoginButton">Settings</button>
                    <button onClick={handleLogout} className="dropdownLogoutButton">Log out<img
                        src={logoutArrow} alt="Logout Arrow"/></button>
                </>
            );
        }
    };

    return (
        <div className="bottom-menu-bar">
            <div className="menu">
                <div className='menuButtons'>
                    <button className='headerButtons' onClick={() => navigate('/')}>
                        <HouseOutlinedIcon className='imgMenu'/><p className='textMenu'>Home</p>
                    </button>
                    <button className='headerButtons' onClick={navigateToMessages}>
                        <ForumOutlinedIcon className='imgMenu'/><p className='textMenu'>Messages</p>
                    </button>
                    <button className="headerButtons" onClick={toggleDropdown}>
                        <AccountCircleOutlinedIcon className='imgMenu'/><p className='textMenu'>Profile</p>
                    </button>
                    <div className={"bottomPersonalMenuDropdownContent" + (dropdownVisible ? ' show' : '')}>
                        {isLoggedIn ? renderDropdownMenu() : (
                            <>
                                <button onClick={navigateToLogin} className="dropdownLoginButton">
                                    Login<img src={loginArrow} alt="Login Arrow"/>
                                </button>
                                <button onClick={navigateToRegister} className="dropdownRegisterButton">Register</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MenuBar;
