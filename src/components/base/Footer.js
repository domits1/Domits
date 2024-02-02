import React from 'react';
import logo from "../../logo.svg";
import Appstorebadge from '../../images/assets/appstorebadge.svg';
import Playstorebadge from '../../images/assets/playstorebadge.svg';
import { Link } from 'react-router-dom';
import './base.css'

var currentYear = new Date().getFullYear();


const Footer = () => {
    return (
        <footer className='main-footer'>
            <div className='footer-content'>
                <div className="logo">
                    <img src={logo} width={50} alt="Logo" />
                </div>
                {/* Navigation section */}
                <div className="footer-section">
                    <h4 className='footer-headers'>Navigation</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/" className='footer-links'>How it works</Link></li>
                       <li><Link to="/" className='footer-links'>Why Domits</Link></li>
                        <li><Link to="/" className='footer-links'>Jobs</Link></li>
                        <li><Link to="/about" className='footer-links'>About</Link></li>
                        <li><Link to="/" className='footer-links'>Release</Link></li>
                        <li><Link to="/contact" className='footer-links'>Contact</Link></li>
                        <br/>
                    </ul>
                    <div className='footer-terms'>
                        <a><Link to="/policy" className='footer-links'>Privacy policy</Link></a>
                        <a><Link to="/terms" className='footer-links'>Terms and Conditions</Link></a>
                        <a><Link to="/disclaimers" className='footer-links'>Disclaimer</Link></a>
                        <a href="" target="_blank" rel="noopener noreferrer" className='footer-links'>Sitemap</a>
                    </div>
                </div>

                {/* Guests section */}
                <div className="footer-section">
                    <h4 className='footer-headers'>Guest</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/" className='footer-links'>Discover and book</Link></li>
                        <li><Link to="/" className='footer-links'>Helpdesk for guests</Link></li>
                    </ul>
                </div>

                {/* Hosts section */}
                <div className="footer-section">
                    <h4 className='footer-headers'>Hosts</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/" className='footer-links'>Become a host</Link></li>
                        <li><Link to="/" className='footer-links'>Helpdesk for hosts</Link></li>
                    </ul>
                </div>



                {/* Network section */}
                <div className="footer-section">
                    <h4 className='footer-headers'>Network</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/guests" className='footer-links'>Guests</Link></li>
                        <li><Link to="/hosts" className='footer-links'>Hosts</Link></li>
                        <li><Link to="/developers" className='footer-links'>Developers</Link></li>
                        <li><Link to="/partners" className='footer-links'>Partners</Link></li>
                        <li><Link to="/students" className='footer-links'>Students</Link></li>
                        <li><Link to="/startups" className='footer-links'>Startups</Link></li>
                    </ul>
                </div>

                <svg id="footer-line" xmlns="http://www.w3.org/2000/svg" width="1" height="315" viewBox="0 0 1 315" fill="none">
                    <path d="M0.25 1L0.250014 314" stroke="#0D9813" stroke-width="0.5" stroke-linecap="round"/>
                </svg>

                {/* Socials section */}
                <div className="footer-section-grid">
                <div className="footer-section">
                    <h4 className='footer-headers'>Socials</h4>
                    <ul className='footer-lists'>
                        <li><a href="https://www.linkedin.com/company/domits" target="_blank" rel="noopener noreferrer" className='footer-links'>Linkedin</a></li>
                        <li><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className='footer-links'>Instagram</a></li>
                    </ul>
                </div>

                    {/* Currency section */}
                    <div className="footer-section">
                        <h4 className='footer-headers'>Currencies</h4>
                        <select id='currency-dropdown' className='footer-lists footer-select'>
                            <option value="euro">EUR</option>
                            <option value="dollar">US</option>
                        </select>
                    </div>

                    <img id='appstorebadge' src={Appstorebadge} alt="App Store Badge" className="app-store-badge" />
                </div>

                {/* Office section */}
                <div className="footer-section-grid">
                    <div className="footer-section">
                        <h4 className='footer-headers'>Office</h4>
                        <ul className='footer-lists'>
                            <li className='footer-links'>2013 AS, Haarlem</li>
                            <li className='footer-links'>Kinderhuissingel 6-K</li>
                        </ul>
                    </div>

                    {/* Languages section */}
                    <div className="footer-section">
                        <h4 className='footer-headers'>Languages</h4>
                        <select id='language-dropdown' className='footer-lists footer-select'>
                            <option value="english">English</option>
                            <option value="dutch">Dutch</option>
                        </select>
                    </div>
                    <img id='playstorebadge' src={Playstorebadge} alt="Play Store Badge" className="play-store-badge" />
                </div>
            </div>










            {/* Copyright Block */}
            <div className='footer-copyright'>
                <p className='footer-copyright-text'>Rights reserved, Domits.com ©{currentYear}</p>
            </div>
        </footer>
    );
};

export default Footer;
