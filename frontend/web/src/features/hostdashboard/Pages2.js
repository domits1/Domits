import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Auth } from "aws-amplify";
import DashboardIcon from "@mui/icons-material/DashboardCustomizeRounded";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import MessageIcon from "@mui/icons-material/QuestionAnswerOutlined";
import ShowChartIcon from "@mui/icons-material/BarChart";
import StarBorderIcon from "@mui/icons-material/StarBorderOutlined";
import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import CreditCardIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import HomeIcon from "@mui/icons-material/Home";
import LanguageIcon from "@mui/icons-material/Language";
import SettingsIcon from "@mui/icons-material/Settings";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import HubIcon from "@mui/icons-material/Hub";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import useEffectiveHostId from "../../hooks/useEffectiveHostId";
import {
  CHANNEX_CERTIFICATION_ADMIN_ROUTE,
  checkChannexCertificationAccess,
} from "./channexadmin/channexCertificationAccess";
import {
  PROPERTY_REVIEW_ACCESS,
  PROPERTY_REVIEW_ADMIN_ROUTE,
  checkPropertyReviewAccess,
} from "./propertyreview/propertyReviewAccess";

const NO_ADMIN_ACCESS = { channex: false, propertyReview: false };

const loadChannexAccess = async () => {
  const user = await Auth.currentAuthenticatedUser();
  return checkChannexCertificationAccess(user?.attributes?.sub);
};

const NAV = [
  { key: "ListProperty", label: "List your property", icon: <AddIcon />, to: "/hostonboarding" },
  { key: "Dashboard", label: "Dashboard", icon: <DashboardIcon />, to: "." },
  { key: "CalendarPricing", label: "Calendar & Pricing", icon: <CalendarIcon />, to: "calendar-pricing" },
  { key: "Reservations", label: "Reservations", icon: <EventIcon />, to: "reservations" },
  { key: "Messages", label: "Messages", icon: <MessageIcon />, to: "messages" },
  {
    key: "Integrations",
    label: "Marketplace",
    icon: <IntegrationInstructionsIcon />,
    to: "integrations-marketplace",
  },
  { key: "Revenues", label: "Revenues", icon: <ShowChartIcon />, to: "revenues" },
  { key: "Reviews", label: "Reviews", icon: <StarBorderIcon />, to: "reviews" },
  // { key: "MissedRevenue", label: "Missed revenue", icon: <TrendingDownIcon />, to: "hostinsights/missed-revenue" },
  { key: "Distribution", label: "Distribution", icon: <HubIcon />, to: "distribution", internalOnly: "channex" },
  { key: "Tasks", label: "Tasks", icon: <CleaningServicesIcon />, to: "tasks" },
  { key: "Finance", label: "Finance", icon: <CreditCardIcon />, to: "finance" },
  { key: "Listings", label: "Listings", icon: <HomeIcon />, to: "listings" },
  { key: "Owners", label: "Owners", icon: <SupervisorAccountIcon />, to: "owners", hiddenForPurelyPOM: true },
  { key: "Website", label: "Website", icon: <LanguageIcon />, to: "website" },
  // { key: "WebsiteKpis", label: "Website KPIs", icon: <InsightsOutlinedIcon />, to: "website-kpis" },
  {
    key: "ChannexCertification",
    label: "Channex diagnostics",
    icon: <AdminPanelSettingsIcon />,
    to: CHANNEX_CERTIFICATION_ADMIN_ROUTE,
    internalOnly: "channex",
  },
  {
    key: "PropertyReview",
    label: "Property review",
    icon: <FactCheckOutlinedIcon />,
    to: PROPERTY_REVIEW_ADMIN_ROUTE,
    internalOnly: "propertyReview",
  },
  { key: "Settings", label: "Settings", icon: <SettingsIcon />, to: "settings" },
];

function Pages({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState(NO_ADMIN_ACCESS);
  const location = useLocation();
  const btnRef = useRef(null);
  const { isPurelyPOM } = useEffectiveHostId();
  const visibleNav = useMemo(
    () =>
      NAV.filter(
        (item) => (!item.internalOnly || access[item.internalOnly]) && !(item.hiddenForPurelyPOM && isPurelyPOM)
      ),
    [access, isPurelyPOM]
  );

  useEffect(() => {
    let mounted = true;

    function grantWhenAllowed(key, check, isAllowed) {
      void check
        .then(isAllowed, () => false)
        .then((granted) => {
          if (mounted && granted) setAccess((current) => ({ ...current, [key]: true }));
        });
    }

    grantWhenAllowed("channex", loadChannexAccess(), (allowed) => allowed === true);
    grantWhenAllowed(
      "propertyReview",
      checkPropertyReviewAccess(),
      (state) => state === PROPERTY_REVIEW_ACCESS.ALLOWED
    );
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="hamburger-btn"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-controls="host-menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>

      <button
        type="button"
        className={`sidebar-overlay ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
        tabIndex={open ? 0 : -1}
        aria-label="Close menu overlay"
        aria-hidden={!open}
      />

      <nav className={`sidebar ${open ? "open" : ""}`} aria-label="Host navigation" id="host-menu">
        <div className="menu-content">
          <h2 className="sidebar-title">Menu</h2>
          <ul className="menu-list">
            {visibleNav.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.to === "."}
                  onClick={() => onNavigate?.(item.key)}
                  className={({ isActive }) => `menu-item ${isActive ? "active" : ""}`}>
                  <span className="icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}

export default Pages;
