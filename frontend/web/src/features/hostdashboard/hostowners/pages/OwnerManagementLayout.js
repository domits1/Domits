import React, { useContext } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../styles/OwnerManagementLayout.scss";

const contentByLanguage = { en, nl, de, es };
const DEFAULT_LANGUAGE = "en";

const OwnerManagementLayout = () => {
  const { language } = useContext(LanguageContext);
  const activeLanguage = contentByLanguage[language]?.ownerManagementNavigation ? language : DEFAULT_LANGUAGE;
  const t = contentByLanguage[activeLanguage].ownerManagementNavigation;

  return (
    <div className="owner-management-layout">
      <nav className="owner-management-navigation" aria-label={t.label}>
        <NavLink to="." end className={({ isActive }) => `owner-management-navigation-link${isActive ? " is-active" : ""}`}>
          {t.owners}
        </NavLink>
        <NavLink to="statements" className={({ isActive }) => `owner-management-navigation-link${isActive ? " is-active" : ""}`}>
          {t.statements}
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
};

export default OwnerManagementLayout;
