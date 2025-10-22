import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom';
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import BookingIcon from "@mui/icons-material/LanguageOutlined";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import WishlistIcon from "@mui/icons-material/Favorite";
import Settings from "@mui/icons-material/Settings";
import ReviewsOutlinedIcon from "@mui/icons-material/ReviewsOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const NAV = [
  { key: "Dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { key: "Bookings",  label: "Bookings",  icon: <BookingIcon /> },
  { key: "Messages",  label: "Messages",  icon: <MessageIcon /> },
  { key: "Reviews",   label: "Reviews",   icon: <ReviewsOutlinedIcon /> },
  { key: "Wishlist",  label: "Wishlist",  icon: <WishlistIcon /> },
  { key: "Settings",  label: "Settings",  icon: <Settings /> },
];

const MOBILE_BP = 1024;

function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== "undefined" && typeof window.matchMedia !== "undefined"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    
    if (mql.addEventListener) mql.addEventListener("change", listener);
    else mql.addListener(listener); 
    setMatches(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", listener);
      else mql.removeListener(listener);
    };
  }, [query]);

  return matches;
}

function Pages({ onNavigate }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery(`(min-width:${MOBILE_BP}px)`);

  const sidebarRef = useRef(null);
  const btnRef = useRef(null);
  const firstItemRef = useRef(null);
  const lastItemRef = useRef(null);

  const closeMenu = () => setIsOpen(false);
  const openMenu = () => setIsOpen(true);
  const toggleMenu = () => setIsOpen((s) => !s);

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen, isDesktop]);
  
  useEffect(() => {
    if (isDesktop) setIsOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu();
        btnRef.current?.focus();
      }

      if (!isDesktop && e.key === "Tab") {
        const focusable = sidebarRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, isDesktop]);

  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const onDown = (e) => {
      const insideSidebar = sidebarRef.current?.contains(e.target);
      const onButton = btnRef.current?.contains(e.target);
      if (!insideSidebar && !onButton) closeMenu();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen, isDesktop]);

  useEffect(() => {
    if (isOpen && !isDesktop) {
      const id = requestAnimationFrame(() => {
        firstItemRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, isDesktop]);

  const handleNav = (key) => {
    onNavigate?.(key);
    if (!isDesktop) closeMenu();
  };

  const menuItems = useMemo(() => {
    return NAV.map((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === NAV.length - 1;
      const ref = isFirst ? firstItemRef : isLast ? lastItemRef : undefined;

      return (
        <li key={item.key}>
          <button
            ref={ref}
            type="button"
            className="menu-item"
            onClick={() => handleNav(item.key)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                (e.currentTarget.parentElement?.nextElementSibling?.querySelector("button") ||
                  firstItemRef.current)?.focus();
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                (e.currentTarget.parentElement?.previousElementSibling?.querySelector("button") ||
                  lastItemRef.current)?.focus();
              } else if (e.key === "Home") {
                e.preventDefault();
                firstItemRef.current?.focus();
              } else if (e.key === "End") {
                e.preventDefault();
                lastItemRef.current?.focus();
              }
            }}
          >
            <span className="icon" aria-hidden="true">{item.icon}</span>
            <span className="label">{item.label}</span>
          </button>
        </li>
      );
    });
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="hamburger-btn"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="guest-menu"
        onClick={toggleMenu}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        aria-hidden="true"
        onClick={closeMenu}
      />

    
      <nav
        ref={sidebarRef}
        className={`sidebar ${isOpen ? "open" : ""}`}
        aria-label="Guest navigation"
        id="guest-menu"
      >
        <div className="menu-content">
          <h2 className="sidebar-title">Menu</h2>
          <ul className="menu-list" role="menu">
            {menuItems}
          </ul>
        </div>
      </nav>
    </>
  );
}

export default Pages;
