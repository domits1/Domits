import React, { useEffect, useState, useContext } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
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

const contentByLanguage = { en, nl, de, es };

function Header({ setSearchResults, setLoading }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFlowState } = useContext(FlowContext);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [group, setGroup] = useState("");
  const [username, setUsername] = useState("");
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState("guest");
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const [isActiveSearchBar, setActiveSearchBar] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => globalThis.window !== undefined && globalThis.innerWidth <= 768
  );
  const [listingScrollProgress, setListingScrollProgress] = useState(0);

  const { language, setLanguage } = useContext(LanguageContext);
  const components = contentByLanguage[language]?.component;

  const hiddenSearchPaths = ["/"];
  const isListingDetails = location.pathname === "/listingdetails";
  const isMobileListingDetails = isListingDetails && isMobileViewport;

  const languages = [
    { code: "en", label: "English", emoji: "🇬🇧" },
    { code: "nl", label: "Nederlands", emoji: "🇳🇱" },
    { code: "de", label: "Deutsch", emoji: "🇩🇪" },
    { code: "es", label: "Español", emoji: "🇪🇸" },
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(globalThis.innerWidth <= 768);
    };

    handleResize();
    globalThis.addEventListener("resize", handleResize);

    return () => {
      globalThis.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (isListingDetails) {
      const handleScroll = () => {
        if (isMobileViewport) {
          const fadeDistance = 140;
          const nextProgress = Math.min(Math.max(globalThis.scrollY / fadeDistance, 0), 1);
          setListingScrollProgress(nextProgress);
          document.body.classList.remove("header-scrolled");
          return;
        }

        setListingScrollProgress(0);
        document.body.classList.toggle("header-scrolled", globalThis.scrollY > 50);
      };

      globalThis.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      return () => {
        globalThis.removeEventListener("scroll", handleScroll);
        document.body.classList.remove("header-scrolled");
      };
    }

    setListingScrollProgress(0);
    document.body.classList.remove("header-scrolled");
    return undefined;
  }, [isListingDetails, isMobileViewport]);

  useEffect(() => {
    const header = document.querySelector(".app-header");
    if (!header) return undefined;

    const update = () => {
      const headerHeight = header.offsetHeight || 0;
      const visibleHeaderOffset = isMobileListingDetails
        ? Math.max(headerHeight * (1 - listingScrollProgress), 0)
        : headerHeight;

      document.documentElement.style.setProperty("--app-header-h", `${headerHeight}px`);
      document.documentElement.style.setProperty("--listing-header-offset", `${visibleHeaderOffset}px`);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(header);

    globalThis.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      globalThis.removeEventListener("resize", update);
    };
  }, [isMobileListingDetails, listingScrollProgress]);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    setDropdownVisible(false);
    setAppsMenuOpen(false);
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

    globalThis.addEventListener("authChanged", onAuthChanged);

    return () => {
      globalThis.removeEventListener("authChanged", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const dropdown = document.querySelector(".personalMenuDropdown");
      const appsMenu = document.querySelector(".nineDotsMenuWrapper");

      if (dropdown && !dropdown.contains(event.target)) {
        setDropdownVisible(false);
      }

      if (appsMenu && !appsMenu.contains(event.target)) {
        setAppsMenuOpen(false);
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
      globalThis.location.reload();
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
    setAppsMenuOpen((prev) => !prev);
  };

  const navigateFromAppsMenu = (path) => {
    navigate(path);
    setAppsMenuOpen(false);
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
    if (isLoggedIn) {
      setShowSwitchConfirm(true);
    } else {
      setFlowState({ isHost: true });
      navigate("/landing");
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

  const renderLanguageFlags = () => {
    return languages.map((lng) => (
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
    ));
  };

  const renderHostButton = () => {
    if (isLoggedIn && group === "Host") {
      return (
        <button className="headerButtons headerHostButton" onClick={navigateToDashboard}>
          {currentView === "guest" ? components.user.switchToHost : components.user.switchToGuest}
        </button>
      );
    }
    return (
      <button className="headerButtons headerHostButton" onClick={navigateToLanding}>
        {components.user.becomeHost}
      </button>
    );
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
      <header
        className="app-header"
        style={
          isMobileListingDetails
            ? {
                opacity: 1 - listingScrollProgress,
                transform: `translateY(-${20 * listingScrollProgress}px)`,
                visibility: listingScrollProgress >= 0.999 ? "hidden" : "visible",
                pointerEvents: listingScrollProgress >= 0.999 ? "none" : "auto",
              }
            : undefined
        }
      >
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
            {renderLanguageFlags()}
          </div>

          <div className="headerRight">
            <div className="language-flags">
              {renderLanguageFlags()}
            </div>

            {renderHostButton()}

            {isLoggedIn && group === "Traveler" && (
              <button className="headerButtons" onClick={navigateToGuestDashboard}>
                Go to Dashboard
              </button>
            )}

            <div className="nineDotsMenuWrapper">
              <button className="headerButtons nineDotsButton" onClick={navigateToNinedots}>
                <img src={nineDots} alt="Nine Dots" />
              </button>

              {appsMenuOpen && (
                <div className="appsDropdown">
                  <div className="appsGrid">
                    {[
                      { id: "innovation", label: "Innovation lab", path: "/travelinnovation" },
                      { id: "why", label: "Why Domits", path: "/travelinnovation#why" },
                      { id: "features", label: "Features", path: "/travelinnovation#features" },
                      { id: "steps", label: "Steps", path: "/travelinnovation#steps" },
                      { id: "faq", label: "FAQ", path: "/travelinnovation#faq" },
                      { id: "contact", label: "Contact", path: "/travelinnovation#contact" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        className="appItem"
                        type="button"
                        onClick={() => navigateFromAppsMenu(item.path)}
                      >
                        <span className="appLabel">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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

Header.propTypes = {
  setSearchResults: PropTypes.func.isRequired,
  setLoading: PropTypes.func.isRequired,
};

export default Header;
