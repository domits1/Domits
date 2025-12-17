import React, { useState, useEffect, useContext } from "react";
import loginArrow from "../../images/whitearrow.png";
import logoutArrow from "../../images/log-out-04.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth } from "aws-amplify";
import {
  HouseOutlined as HouseOutlinedIcon,
  ForumOutlined as ForumOutlinedIcon,
  AccountCircleOutlined as AccountCircleOutlinedIcon,
} from "@mui/icons-material";

function MenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setGroup] = useState("");
  const [username, setUsername] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentView, setCurrentView] = useState("guest");

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    setDropdownVisible(false);
  }, [location]);

  const restoreSession = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser({ bypassCache: true });
    const attrs = user.attributes;

    const userGroup = attrs["custom:group"];
    const givenName = attrs["given_name"] || "User";

    setIsLoggedIn(true);
    setGroup(userGroup);
    setUsername(givenName);
    setCurrentView(userGroup === "Host" ? "host" : "guest");

    localStorage.setItem(
      "domitsUser",
      JSON.stringify({
        group: userGroup,
        name: givenName,
      })
    );
  } catch (err) {
    console.warn("No valid Cognito session:", err);

    setIsLoggedIn(false);
    setGroup(null);
    setUsername(null);
    setCurrentView("login");

    localStorage.removeItem("domitsUser");
  }
};


  const handleLogout = async () => {
    try {
      await Auth.signOut();
    } catch (error) {
      console.error("Error logging out:", error);
    }

    localStorage.removeItem("domitsUser");
    sessionStorage.removeItem("chatOpened");

    setIsLoggedIn(false);
    window.location.href = "/";
  };

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  const navigateToLogin = () => navigate("/login");
  const navigateToRegister = () => navigate("/register");
  const navigateToGuestDashboard = () => navigate("/guestdashboard");
  const navigateToHostDashboard = () => navigate("/hostdashboard");
  const navigateToMessages = () =>
    navigate(currentView === "host" ? "/hostdashboard/messages" : "/guestdashboard/messages");

  const navigateToPayments = () => navigate("/guestdashboard/payments");
  const navigateToReviews = () => navigate("/guestdashboard/reviews");
  const navigateToSettings = () => navigate("/guestdashboard/settings");

  const renderDropdownMenu = () => {
    if (!isLoggedIn) {
      return (
        <>
          <button onClick={navigateToLogin} className="dropdownLoginButton">
            Login <img src={loginArrow} alt="Login Arrow" />
          </button>
          <button onClick={navigateToRegister} className="dropdownRegisterButton">
            Register
          </button>
        </>
      );
    }

    return currentView === "host" ? (
      <>
        <div className="helloUsername">Hello {username}!</div>
        <button onClick={navigateToHostDashboard} className="dropdownLoginButton">
          Dashboard
        </button>
        <button onClick={() => navigate("/hostdashboard/calendar")} className="dropdownLoginButton">
          Calendar
        </button>
        <button onClick={() => navigate("/hostdashboard/reservations")} className="dropdownLoginButton">
          Reservations
        </button>

        <button className="dropdownLogoutButton" onClick={handleLogout}>
          Log out <img src={logoutArrow} alt="Logout Arrow" />
        </button>
      </>
    ) : (
      <>
        <div className="helloUsername">Hello {username}!</div>

        <button onClick={navigateToGuestDashboard} className="dropdownLoginButton">
          Profile
        </button>
        <button onClick={navigateToMessages} className="dropdownLoginButton">
          Messages
        </button>
        <button onClick={navigateToPayments} className="dropdownLoginButton">
          Payments
        </button>
        <button onClick={navigateToReviews} className="dropdownLoginButton">
          Reviews
        </button>
        <button onClick={navigateToSettings} className="dropdownLoginButton">
          Settings
        </button>

        <button className="dropdownLogoutButton" onClick={handleLogout}>
          Log out <img src={logoutArrow} alt="Logout Arrow" />
        </button>
      </>
    );
  };

  return (
    <div className="bottom-menu-bar">
      <div className="menu">
        <div className="menuButtons">

          <button className="headerButtons" onClick={() => navigate("/")}>
            <HouseOutlinedIcon className="imgMenu" />
            <p className="textMenu">Home</p>
          </button>

          <button className="headerButtons" onClick={navigateToMessages}>
            <ForumOutlinedIcon className="imgMenu" />
            <p className="textMenu">Messages</p>
          </button>

          <button className="headerButtons" onClick={toggleDropdown}>
            <AccountCircleOutlinedIcon className="imgMenu" />
            <p className="textMenu">Profile</p>
          </button>

          <div className={"bottomPersonalMenuDropdownContent" + (dropdownVisible ? " show" : "")}>
            {renderDropdownMenu()}
          </div>

        </div>
      </div>
    </div>
  );
}

export default MenuBar;
