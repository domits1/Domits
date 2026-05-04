import React, { useEffect, useState, useContext } from "react";
import ReactDOM from "react-dom";
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
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import Hostchat from "../../features/hostdashboard/Hostchat.js";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

function Header({ setSearchResults, setLoading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFlowState } = useContext(FlowContext);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [group, setGroup] = useState("");
  const [username, setUsername] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [currentView, setCurrentView] = useState("guest");
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [isActiveSearchBar, setActiveSearchBar] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { language, setLanguage } = useContext(LanguageContext);
  const components = contentByLanguage[language]?.component;

  const hiddenSearchPaths = ["/"];
  const isListingDetails = location.pathname === "/listingdetails";

  const languages = [
    { code: "en", label: "English", emoji: "\uD83C\uDDEC\uD83C\uDDE7" },
    { code: "nl", label: "Nederlands", emoji: "\uD83C\uDDF3\uD83C\uDDF1" },
    { code: "de", label: "Deutsch", emoji: "\uD83C\uDDE9\uD83C\uDDEA" },
    { code: "es", label: "Español", emoji: "\uD83C\uDDEA\uD83C\uDDF8" },
  ];

  useEffect(() => {
    if (!isListingDetails) {
      setIsScrolled(false);
      return undefined;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isListingDetails]);

  useEffect(() => {
    if (isScrolled) {
      document.body.classList.add("header-scrolled");
    } else {
      document.body.classList.remove("header-scrolled");
    }

    return () => {
      document.body.classList.remove("header-scrolled");
    };
  }, [isScrolled]);

  useEffect(() => {
    const header = document.querySelector(".app-header");
    if (!header) return undefined;

    const update = () => {
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${header.getBoundingClientRect().height}px`
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(header);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    setDropdownVisible(false);
  }, [location]);

  useEffect(() => {
    if (!showSwitchConfirm) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowSwitchConfirm(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showSwitchConfirm]);

  useEffect(() => {
    const onAuthChanged = () => {
      checkAuthentication();
    };

    window.addEventListener("authChanged", onAuthChanged);

    return () => {
      window.removeEventListener("authChanged", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const dropdown = document.querySelector(".personalMenuDropdown");

      if (dropdown && !dropdown.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);

    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  const checkAuthentication = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();

      setIsLoggedIn(true);

      const userAttributes = user.attributes;
      const userGroup = userAttributes["custom:group"];

      setGroup(userGroup);
      setUsername(userAttributes["given_name"]);
      setCurrentView(userGroup === "Host" ? "host" : "guest");
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

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev);
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
      navigate("/hostdashboard/messages");
    } else {
      navigate("/guestdashboard/messages");
    }
  };

  const navigateToSettings = () => {
    navigate("/guestdashboard/settings");
  };

  const navigateToDashboard = () => {
    if (!isLoggedIn) {
      setFlowState({ isHost: true });
      navigate("/landing");
    } else {
      setShowSwitchConfirm(true);
    }
  };

  const confirmSwitch = () => {
    setShowSwitchConfirm(false);

    if (currentView === "host") {
      navigateToGuestDashboard();
    } else {
      navigateToHostDashboard();
    }
  };

  const toggleSearchBar = (status) => {
    setActiveSearchBar(status);
    document.body.style.overflow = status ? "hidden" : "auto";
  };

  const renderDropdownMenu = () => {
    if (currentView === "host") {
      return (
        <>
          <div className="helloUsername">
            {components.user.hello} {username}!
          </div>

          <button onClick={navigateToHostDashboard} className="dropdownLoginButton">
            {components.user.dashboard}
          </button>

          <button onClick={() => navigate("/hostdashboard/calendar")} className="dropdownLoginButton">
            {components.user.calendar}
          </button>

          <button onClick={() => navigate("/hostdashboard/reservations")} className="dropdownLoginButton">
            {components.user.reservations}
          </button>

          <button onClick={navigateToMessages} className="dropdownLoginButton">
            {components.user.messages}
          </button>

          <button onClick={navigateToDashboard} className="dropdownLogoutButton dropdown-switch-btn">
            {components.user.switchToGuest}
          </button>

          <button onClick={handleLogout} className="dropdownLogoutButton">
            {components.user.logout}
            <img src={logoutArrow} alt="Logout Arrow" />
          </button>
        </>
      );
    }

    return (
      <>
        <div className="helloUsername">
          {components.user.hello} {username}!
        </div>

        <button onClick={navigateToGuestDashboard} className="dropdownLoginButton">
          {components.user.profile}
        </button>

        <button onClick={navigateToMessages} className="dropdownLoginButton">
          {components.user.messages}
        </button>

        <button onClick={navigateToSettings} className="dropdownLoginButton">
          {components.user.settings}
        </button>

        {group === "Host" && (
          <button onClick={navigateToDashboard} className="dropdownLogoutButton dropdown-switch-btn">
            {components.user.switchToHost}
          </button>
        )}

        <button onClick={handleLogout} className="dropdownLogoutButton">
          {components.user.logout}
          <img src={logoutArrow} alt="Logout Arrow" />
        </button>
      </>
    );
  };

  return (
    <>
      <header className={`app-header ${isScrolled ? "is-faded" : ""}`}>
        <nav
          className={`header-nav ${isActiveSearchBar ? "active" : "inactive"} ${
            isActiveSearchBar ? "no-scroll" : ""
          }`}
        >
          <div className="logo">
            <a href="/">
              <img src={logo} width={150} alt="Logo" />
            </a>
          </div>

          {!hiddenSearchPaths.includes(location.pathname) && (
            <SearchBar
              setSearchResults={setSearchResults}
              setLoading={setLoading}
              toggleBar={toggleSearchBar}
            />
          )}

          <div className="language-flags-mobile">
            {languages.map((lng) => (
              <button
                key={lng.code}
                type="button"
                aria-label={lng.label}
                title={lng.label}
                className={`lang-flag ${language === lng.code ? "active" : ""}`}
                onClick={() => setLanguage(lng.code)}
              >
                {lng.emoji}
              </button>
            ))}
          </div>

          <div className="headerRight">
            <div className="language-flags">
              {languages.map((lng) => (
                <button
                  key={lng.code}
                  type="button"
                  aria-label={lng.label}
                  title={lng.label}
                  className={`lang-flag ${language === lng.code ? "active" : ""}`}
                  onClick={() => setLanguage(lng.code)}
                >
                  {lng.emoji}
                </button>
              ))}
            </div>

            {!isLoggedIn ? (
              <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
                {components.user.becomeHost}
              </button>
            ) : group === "Host" ? (
              <button className="headerButtons headerHostButton" onClick={navigateToDashboard}>
                {currentView === "guest" ? components.user.switchToHost : components.user.switchToGuest}
              </button>
            ) : (
              <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
                {components.user.becomeHost}
              </button>
            )}

            {isLoggedIn && group === "Traveler" && (
              <button className="headerButtons" onClick={navigateToGuestDashboard}>
                Go to Dashboard
              </button>
            )}

            <button className="headerButtons nineDotsButton" onClick={navigateToNinedots}>
              <img src={nineDots} alt="Nine Dots" />
            </button>

            <div className="personalMenuDropdown">
              <button className="personalMenu" onClick={toggleDropdown}>
                <img src={profile} alt="Profile Icon" />
                <img src={arrowDown} alt="Dropdown Arrow" />
              </button>

              <div className={"personalMenuDropdownContent" + (dropdownVisible ? " show" : "")}>
                {isLoggedIn ? (
                  renderDropdownMenu()
                ) : (
                  <>
                    <button onClick={navigateToLogin} className="dropdownLoginButton">
                      {components.user.login}
                      <img src={loginArrow} alt="Login Arrow" />
                    </button>

                    <button onClick={navigateToRegister} className="dropdownRegisterButton">
                      {components.user.register}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {isActiveSearchBar && <div className="search-overlay-background" />}
      </header>

      {showSwitchConfirm &&
        ReactDOM.createPortal(
          <div className="switch-confirm-overlay">
            <dialog className="switch-confirm-modal" open>
              <p>
                {currentView === "host"
                  ? components.user.switchConfirmToGuest
                  : components.user.switchConfirmToHost}
              </p>

              <div className="switch-confirm-buttons">
                <button className="switch-confirm-yes" onClick={confirmSwitch}>
                  {components.user.switchConfirmYes}
                </button>

                <button className="switch-confirm-no" onClick={() => setShowSwitchConfirm(false)}>
                  {components.user.switchConfirmNo}
                </button>
              </div>
            </dialog>
          </div>,
          document.body
        )}
    </>
  );
}

export default Header;
