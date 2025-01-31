import React, {useState, useEffect, useContext} from 'react';
import './MenuBar.css';
import { HouseOutlined as HouseOutlinedIcon, ForumOutlined as ForumOutlinedIcon, AccountCircleOutlined as AccountCircleOutlinedIcon} from '@mui/icons-material';
import loginArrow from '../../images/whitearrow.png';
import logoutArrow from '../../images/log-out-04.svg';
import FlowContext from '../../services/FlowContext';
import {useNavigate, useLocation} from 'react-router-dom';
import {Auth} from "aws-amplify";

function MenuBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const {setFlowState} = useContext(FlowContext);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [group, setGroup] = useState('');
    const [username, setUsername] = useState('');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [currentView, setCurrentView] = useState('guest'); // 'guest' or 'host'

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
            sessionStorage.removeItem('chatOpened');

            setIsLoggedIn(false);
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

    const Home = () => {
        navigate('/');
    };

    const navigateToDashboard = () => {
        if (!isLoggedIn) {
            setFlowState({isHost: true});
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


                    {!isLoggedIn ? (
                        <button className="dropdownLogoutButton headerHostButton" onClick={navigateToLanding}>
                            Become a Host
                        </button>
                    ) : group === 'Host' ? (
                        <button className="dropdownLogoutButton headerHostButton" onClick={navigateToDashboard}>
                            {currentView === 'guest' ? 'Switch to Host Dashboard' : 'Switch to Guest Dashboard'}
                        </button>
                    ) : (
                        <button className="dropdownLogoutButton headerHostButton" onClick={navigateToLanding}>
                            Become a Host
                        </button>
                    )}
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
                    <button className='headerButtons' onClick={Home}><HouseOutlinedIcon className='imgMenu'/><p className='textMenu'>Home</p></button>
                    <button className='headerButtons' onClick={navigateToMessages}><ForumOutlinedIcon className='imgMenu'/><p className='textMenu'>Messages</p></button>


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
