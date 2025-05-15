import React from "react";
import logo from "../../images/logo.svg";
import Appstorebadge from "../../images/assets/appstorebadge.svg";
import Playstorebadge from "../../images/assets/playstorebadge.svg";
import Instagram from "../../images/icons/Instagram.jpg";
import linkedinIcon from "../../images/icons/LinkedIn.png";
import instagramIcon from "../../images/icons/Instagram.jpg";
import xIcon from "../../images/icons/x.png";
import { ReactComponent as InstagramIcon } from "../../images/instagram.svg";
import { Link } from "react-router-dom";
import '../../styles/sass/features/base/footer.scss';


const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="footer-content">
        {/* Navigation section */}
        <div className="footer-section">
          <h4 className="footer-headers">Navigation</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/why-domits" className="footer-links">
                Why Domits
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="footer-links">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/release" className="footer-links">
                Product Updates
              </Link>
            </li>
            <li>
              <Link to="/about" className="footer-links">
                About
              </Link>
            </li>
            <li>
              <Link to="/security" className="footer-links">
                Security
              </Link>
            </li>
            <li>
              <Link to="/performance" className="footer-links">
                Performance
              </Link>
            </li>
            <li>
              <Link to="/career" className="footer-links">
                Careers
              </Link>
            </li>
            <li>
              <Link to="/contact" className="footer-links">
                Contact
              </Link>
            </li>
            <br />
          </ul>
        </div>

        {/* Guests section */}
        <div className="footer-section">
          <h4 className="footer-headers">Guests</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/" className="footer-links">
                Search and book
              </Link>
            </li>
            <li>
              <Link to="/helpdesk-guest" className="footer-links">
                Helpdesk for guests
              </Link>
            </li>
            <li>
              <Link to="/sustainability" className="footer-links">
                Sustainability
              </Link>
            </li>
          </ul>
        </div>

        {/* Hosts section */}
        <div className="footer-section">
          <h4 className="footer-headers">Hosts</h4>
          <ul className="footer-lists">
            <li>
              <Link to="/landing" className="footer-links">
                Become a host
              </Link>
            </li>
            <li>
              <Link to="/helpdesk-host" className="footer-links">
                Helpdesk for hosts
              </Link>
            </li>
            <li>
              <Link to="/sustainability" className="footer-links">
                Sustainability
              </Link>
            </li>
          </ul>
        </div>

        {/* Network section */}
        <div className="footer-section borderline">
          <h4 className="footer-headers">Network</h4>
          <ul className="footer-lists">
            <li className="footer-links">Guests</li>
            <li className="footer-links">Hosts</li>
            <li className="footer-links">Developers</li>
            <li className="footer-links">Partners</li>
            <li className="footer-links">Students</li>
            <li className="footer-links">Startups</li>
          </ul>
        </div>

        {/* Socials section */}
        <div className="footer-section-grid">
          <div className="footer-section">
            <h4 className="footer-headers">Socials</h4>
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
            <h4 className="footer-headers">Office</h4>
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
