import React, { useState } from "react";
import nineDots from "../../images/dots-grid.svg";
import profile from "../../images/profile-icon.svg";
import arrowDown from "../../images/arrow-down-icon.svg";
import loginArrow from "../../images/whitearrow.png";
import logoutArrow from "../../images/log-out-04.svg";
import { useNavigate } from "react-router-dom";

const HamburgerMenu = ({ isLoggedIn, group, currentView, username, toggleDropdown, dropdownVisible, renderDropdownMenu, navigateToLanding, navigateToDashboard, navigateToGuestDashboard, navigateToNinedots, navigateToLogin, navigateToRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="hamburger-menu">
      <button className="hamburger-icon" onClick={toggleMenu}>
        ☰
      </button>
      {menuOpen && (
        <div className="hamburger-menu-content">
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
      )}
    </div>
  );
};

export default HamburgerMenu;