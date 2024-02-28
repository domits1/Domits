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
                        <br />
                    </ul>

                </div>

                {/* Guests section */}
                <div className="footer-section">
                    <h4 className='footer-headers'>Guest</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/" className='footer-links'>Search and book</Link></li>
                        <li><Link to="/" className='footer-links'>Helpdesk</Link></li>
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
                <div className="footer-section borderline">
                    <h4 className='footer-headers '>Network</h4>
                    <ul className='footer-lists'>
                        <li><Link to="/" className='footer-links'>Guests</Link></li>
                        <li><Link to="/landing" className='footer-links'>Hosts</Link></li>
                        <li><Link to="/developers" className='footer-links'>Developers</Link></li>
                        <li><Link to="/partners" className='footer-links'>Partners</Link></li>
                        <li><Link to="/students" className='footer-links'>Students</Link></li>
                        <li><Link to="/startups" className='footer-links'>Startups</Link></li>
                    </ul>
                </div>



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
                    <div className="footer-endsection">
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
                    <div className="footer-endsection">
                        <h4 className='footer-headers'>Languages</h4>
                        <select id='language-dropdown' className='footer-lists footer-select'>
                            <option value="english">English</option>
                            <option value="dutch">Dutch</option>
                        </select>
                    </div>
                    <img id='playstorebadge' src={Playstorebadge} alt="Play Store Badge" className="play-store-badge" />
                </div>
            </div>

            <div className='footer-terms'>
                <div className="logo">
                    <img src={logo} width={25} alt="Logo" />
                </div>
                <a><Link to="/policy" className='footer-links'>Privacy policy</Link></a>
                <a><Link to="/terms" className='footer-links'>Terms and Conditions</Link></a>
                <a><Link to="/disclaimers" className='footer-links'>Disclaimer</Link></a>
                <a href="" target="_blank" rel="noopener noreferrer" className='footer-links'>Sitemap</a>
            </div>

            {/* Copyright Block */}
            <div className='footer-copyright'>
                <p className='footer-copyright-text'>Rights reserved, Domits.com ©{currentYear}</p>
            </div>
        </footer>
    );
};

export default Footer;
