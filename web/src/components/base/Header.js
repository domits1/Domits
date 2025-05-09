import React, { useEffect, useState, useContext } from "react";
import logo from "../../images/logo.svg";
import nineDots from "../../images/dots-grid.svg";
import profile from "../../images/profile-icon.svg";
import arrowDown from "../../images/arrow-down-icon.svg";
import loginArrow from "../../images/whitearrow.png";
import logoutArrow from "../../images/log-out-04.svg";
import FlowContext from "../../services/FlowContext";
import { useNavigate, useLocation } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import { Auth } from "aws-amplify";


function Header({ setSearchResults, setLoading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFlowState } = useContext(FlowContext);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [group, setGroup] = useState("");
  const [username, setUsername] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentView, setCurrentView] = useState("guest");
  const [isActiveSearchBar, setActiveSearchBar] = useState(false);
  const hiddenSearchPaths = [
    "/"
    // Add more paths here as needed
  ];


  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    setDropdownVisible(false);
  }, [location]);

  // useEffect(() => {
  //     // Voeg het Trustpilot-script toe
  //     const script = document.createElement('script');
  //     script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
  //     script.async = true;
  //     document.head.appendChild(script);

  //     // Verwijder het script bij demontage van de component
  //     return () => {
  //         document.head.removeChild(script);
  //     };
  // }, []);


  const checkAuthentication = async () => {
    try {
      const session = await Auth.currentSession();
      const user = await Auth.currentAuthenticatedUser();
      setIsLoggedIn(true);
      const userAttributes = user.attributes;
      setGroup(userAttributes["custom:group"]);
      setUsername(userAttributes["given_name"]);
      setCurrentView(
        userAttributes["custom:group"] === "Host" ? "host" : "guest"
      );
    } catch (error) {
      setIsLoggedIn(false);
      console.error("Error logging in:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await Auth.signOut();
      setIsLoggedIn(false);
      sessionStorage.removeItem("chatOpened");
      window.location.reload();
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getDropdownElement = () =>
    document.querySelector(".header-personal-menu-dropdown");
  const getDropdownContentElement = () =>
    document.querySelector(".header-personal-menu-dropdown-content");

  document.addEventListener("click", function (event) {
    const dropdown = getDropdownElement();
    const dropdownContent = getDropdownContentElement();

    if (dropdown && dropdownContent) {
      const isClickInside = dropdown.contains(event.target);

      if (!isClickInside) {
        dropdownContent.classList.remove("show");
      }
    }
  });

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const navigateToLogin = () => {
    navigate("/login");
  };
  const navigateToRegister = () => {
    navigate("/register");
  };
  const navigateToLanding = () => {
    navigate("/landing");
  };
  const navigateToWhyDomits = () => {
    navigate("/why-domits");
  };
  const navigateToNinedots = () => {
    navigate("/travelinnovation");
  };
  const navigateToGuestDashboard = () => {
    setCurrentView("guest");
    navigate("/guestdashboard");
  };
  const navigateToHostDashboard = () => {
    setCurrentView("host");
    navigate("/hostdashboard");
  };
  const navigateToMessages = () => {
    if (currentView === "host") {
      navigate("/hostdashboard/chat");
    } else {
      navigate("/guestdashboard/chat");
    }
  };
  const navigateToPayments = () => {
    navigate("/guestdashboard/payments");
  };
  const navigateToReviews = () => {
    navigate("/guestdashboard/reviews");
  };
  const navigateToSettings = () => {
    navigate("/guestdashboard/settings");
  };

  const navigateToDashboard = () => {
    if (!isLoggedIn) {
      setFlowState({ isHost: true });
      navigate("/landing");
    } else {
      if (currentView === "host") {
        navigateToGuestDashboard();
      } else {
        navigateToHostDashboard();
      }
    }
  };

  const renderDropdownMenu = () => {
    if (currentView === "host") {
      return (
        <>
          <div className="helloUsername">Hello {username}!</div>
          <button
            onClick={navigateToHostDashboard}
            className="dropdownLoginButton"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/hostdashboard/calendar")}
            className="dropdownLoginButton"
          >
            Calendar
          </button>
          <button
            onClick={() => navigate("/hostdashboard/reservations")}
            className="dropdownLoginButton"
          >
            Reservations
          </button>
          <button
            onClick={() => navigate("/hostdashboard/chat")}
            className="dropdownLoginButton"
          >
            Messages
          </button>
          <button onClick={handleLogout} className="dropdownLogoutButton">
            Log out
            <img src={logoutArrow} alt="Logout Arrow" />
          </button>
        </>
      );
    } else {
      return (
        <>
          <div className="helloUsername">Hello {username}!</div>
          <button
            onClick={navigateToGuestDashboard}
            className="dropdownLoginButton"
          >
            Profile
          </button>
          <button onClick={navigateToMessages} className="dropdownLoginButton">
            Messages
          </button>
          <button onClick={navigateToPayments} className="dropdownLoginButton">
            Payments
          </button>
          {/* <button onClick={navigateToReviews} className="dropdownLoginButton">
            Reviews
          </button> */}
          <button onClick={navigateToSettings} className="dropdownLoginButton">
            Settings
          </button>
          <button onClick={handleLogout} className="dropdownLogoutButton">
            Log out
            <img src={logoutArrow} alt="Logout Arrow" />
          </button>
        </>
      );
    }
  };

  const toggleSearchBar = (status) => {
    setActiveSearchBar(status);
    if (status) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <nav
          className={`header-nav ${isActiveSearchBar ? "active" : "inactive"} ${isActiveSearchBar ? "no-scroll" : ""
            }`}
        >
          <div className="logo">
            <a href="/">
              <img src={logo} width={150} alt="Logo" />
            </a>
          </div>
          {!hiddenSearchPaths.includes(location.pathname) && (
            <div className="App">
              <SearchBar
                setSearchResults={setSearchResults}
                setLoading={setLoading}
                toggleBar={toggleSearchBar}
              />
            </div>
          )}

          <div className="headerRight">
            {!isLoggedIn ? (
              <button
                className="headerButtons headerHostButton"
                onClick={navigateToLanding}
              >
                Become a Host
              </button>
            ) : group === "Host" ? (
              <button
                className="headerButtons headerHostButton"
                onClick={navigateToDashboard}
              >
                {currentView === "guest"
                  ? "Switch to Host"
                  : "Switch to Guest"}
              </button>
            ) : (
              <button
                className="headerButtons headerHostButton"
                onClick={navigateToLanding}
              >
                Become a Host
              </button>
            )}
            {isLoggedIn && group === "Traveler" && (
              <button
                className="headerButtons"
                onClick={navigateToGuestDashboard}
              >
                Go to Dashboard
              </button>
            )}
            <button
              className="headerButtons nineDotsButton"
              onClick={navigateToNinedots}
            >
              <img src={nineDots} alt="Nine Dots" />
            </button>
            <div className="personalMenuDropdown">
              <button className="personalMenu" onClick={toggleDropdown}>
                <img src={profile} alt="Profile Icon" />
                <img src={arrowDown} alt="Dropdown Arrow" />
              </button>
              <div
                className={
                  "personalMenuDropdownContent" +
                  (dropdownVisible ? " show" : "")
                }
              >
                {isLoggedIn ? (
                  renderDropdownMenu()
                ) : (
                  <>
                    <button
                      onClick={navigateToLogin}
                      className="dropdownLoginButton"
                    >
                      Login
                      <img src={loginArrow} alt="Login Arrow" />
                    </button>
                    <button
                      onClick={navigateToRegister}
                      className="dropdownRegisterButton"
                    >
                      Register
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
