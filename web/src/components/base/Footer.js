import React, { useContext } from "react";
import logo from "../../images/logo.svg";
import Appstorebadge from "../../images/assets/appstorebadge.svg";
import Playstorebadge from "../../images/assets/playstorebadge.svg";
import Instagram from "../../images/icons/Instagram.jpg";
import linkedinIcon from "../../images/icons/LinkedIn.png";
import instagramIcon from "../../images/icons/Instagram.jpg";
import xIcon from "../../images/icons/x.png";
import { ReactComponent as InstagramIcon } from "../../images/instagram.svg";
import { Link } from "react-router-dom";
import {LanguageContext} from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";

const contentByLanguage = {
  en,
  nl,
  de,
};

const Footer = () => {  
  const currentYear = new Date().getFullYear();
  const {language} = useContext(LanguageContext);
  const footerContent = contentByLanguage[language]?.component.footer;

  return (
    <footer className="main-footer">
      <div className="footer-content">
        {/* Navigation section */}
        <div className="footer-section">
          <h4 className="footer-headers">{footerContent.navigation.title}</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/why-domits" className="footer-links">
                {footerContent.navigation.whyDomits}
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="footer-links">
                {footerContent.navigation.howItWorks}
              </Link>
            </li>
            <li>
              <Link to="/release" className="footer-links">
                {footerContent.navigation.productUpdates}
              </Link>
            </li>
            <li>
              <Link to="/about" className="footer-links">
                {footerContent.navigation.about}
              </Link>
            </li>
            <li>
              <Link to="/security" className="footer-links">
                {footerContent.navigation.security}
              </Link>
            </li>
            <li>
              <Link to="/performance" className="footer-links">
                {footerContent.navigation.performance}
              </Link>
            </li>
            <li>
              <Link to="/career" className="footer-links">
                {footerContent.navigation.careers}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="footer-links">
                {footerContent.navigation.contact}
              </Link>
            </li>
            <br />
          </ul>
        </div>

        {/* Guests section */}
        <div className="footer-section">
          <h4 className="footer-headers">{footerContent.guest.title}</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/" className="footer-links">
                {footerContent.guest.searchAndBook}
              </Link>
            </li>
            <li>
              <Link to="/helpdesk-guest" className="footer-links">
                {footerContent.guest.helpDeskForGuests}
              </Link>
            </li>
            <li>
              <Link to="/sustainability" className="footer-links">
                {footerContent.guest.sustainability}
              </Link>
            </li>
          </ul>
        </div>

        {/* Hosts section */}
        <div className="footer-section">
          <h4 className="footer-headers">{footerContent.host.title}</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/landing" className="footer-links">
                {footerContent.host.becomeHost}
              </Link>
            </li>
            <li>
              <Link to="/helpdesk-host" className="footer-links">
                {footerContent.host.helpDeskForHosts}
              </Link>
            </li>
            <li>
              <Link to="/sustainability" className="footer-links">
                {footerContent.host.sustainability}
              </Link>
            </li>
          </ul>
        </div>

        {/* Network section */}
        <div className="footer-section borderline">
          <h4 className="footer-headers">{footerContent.network.title}</h4>
          <ul className="footer-lists">
            <li className="footer-links">{footerContent.network.guests}</li>
            <li className="footer-links">{footerContent.network.hosts}</li>
            <li className="footer-links">{footerContent.network.developers}</li>
            <li className="footer-links">{footerContent.network.partners}</li>
            <li className="footer-links">{footerContent.network.students}</li>
            <li className="footer-links">{footerContent.network.startups}</li>
          </ul>
        </div>

        {/* Socials section */}
        <div className="footer-section-grid">
          <div className="footer-section">
            <h4 className="footer-headers">{footerContent.socials.title}</h4>
            <ul className="footer-lists">
              <li>
                <a
                  href="https://www.linkedin.com/company/domits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-icons"
                >
                  <img src={linkedinIcon} alt="LinkedIn" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/domits_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-icons"
                >
                  <img src={instagramIcon} alt="Instagram" />
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/Domits_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-icons"
                >
                  <img src={xIcon} alt="X" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Office section */}
        <div className="footer-section-grid">
          <div className="footer-section">
            <h4 className="footer-headers">{footerContent.office.title}</h4>
            <ul className="footer-lists">
              <li className="footer-links">
                <a
                  href="https://maps.google.com/?q=2013+AS+Haarlem+Kinderhuissingel+6-K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-links"
                >
                  2013 AS, Haarlem
                </a>
              </li>
              <li className="footer-links">
                <a
                  href="https://maps.google.com/?q=2013+AS+Haarlem+Kinderhuissingel+6-K"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-links"
                >
                  Kinderhuissingel 6-K
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-terms">
        <div className="logo">
          <img src={logo} width={100} alt="Logo" />
        </div>
          <Link to="/policy" className="footer-links">
            Privacy policy
          </Link>
          <Link to="/terms" className="footer-links">
            Terms and Conditions
          </Link>
          <Link to="/disclaimers" className="footer-links">
            Disclaimer
          </Link>
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          className="footer-links"
        >
          Sitemap
        </a>
      </div>

      {/* Copyright Block */}
      <div className="footer-copyright">
        <p className="footer-copyright-text">
          Rights reserved, Domits.com © {currentYear}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
