import React from 'react';
import logo from "../../logo.svg";
import { Link } from 'react-router-dom';
import './base.css'

// Constants for styles



const SMALL_HEADER_STYLE = {
    color: '#0D9813',
    fontFamily: 'Kanit, sans-serif',
    fontSize: '24px',
    fontStyle: 'normal',
    fontWeight: 400,
    lineHeight: '150%',
};

const FOOTER_LIST_STYLE = {
    listStyle: 'none',
    padding: 0,
};

const FOOTER_LINK_STYLE = {
    color: '#000',
    fontFamily: 'Kanit, sans-serif',
    fontSize: '20px',
    fontStyle: 'normal',
    fontWeight: 300,
    lineHeight: '150%',
    textDecorationLine: 'underline',
};

const COPYRIGHT_STYLE = {
    backgroundColor: '#0D9813',
    flexShrink: 0,
    marginTop: 'auto',
    display: 'flex', // Center the content horizontally
    alignItems: 'center', // Center the content vertically
    justifyContent: 'center', // Center the content both horizontally and vertically
};


const COPYRIGHT_TEXT_STYLE = {
    color: '#fff',
    fontFamily: 'Kanit, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: 300,
    lineHeight: '150%',
};

const Footer = () => {
    return (
        <footer className='main-footer'>
            <div className='footer-content'>
                <div className="logo">
                    <img src={logo} width={50} alt="Logo" />
                </div>
                {/* Navigation section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Navigation</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>How it works</Link></li>
                       <li><Link to="/" style={FOOTER_LINK_STYLE}>Why Domits</Link></li>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Jobs</Link></li>
                        <li><Link to="/about" style={FOOTER_LINK_STYLE}>About</Link></li>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Release</Link></li>
                        <li><Link to="/contact" style={FOOTER_LINK_STYLE}>Contact</Link></li>
                    </ul>
                </div>

                {/* Guests section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Guest</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Discover and book</Link></li>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Helpdesk for guests</Link></li>
                    </ul>
                </div>

                {/* Hosts section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Hosts</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Become a host</Link></li>
                        <li><Link to="/" style={FOOTER_LINK_STYLE}>Helpdesk for hosts</Link></li>
                    </ul>
                </div>



                {/* Network section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Network</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/guests" style={FOOTER_LINK_STYLE}>Guests</Link></li>
                        <li><Link to="/hosts" style={FOOTER_LINK_STYLE}>Hosts</Link></li>
                        <li><Link to="/developers" style={FOOTER_LINK_STYLE}>Developers</Link></li>
                        <li><Link to="/partners" style={FOOTER_LINK_STYLE}>Partners</Link></li>
                        <li><Link to="/students" style={FOOTER_LINK_STYLE}>Students</Link></li>
                        <li><Link to="/startups" style={FOOTER_LINK_STYLE}>Startups</Link></li>
                    </ul>
                </div>

                <svg id="footer-line" xmlns="http://www.w3.org/2000/svg" width="1" height="315" viewBox="0 0 1 315" fill="none">
                    <path d="M0.25 1L0.250014 314" stroke="#0D9813" stroke-width="0.5" stroke-linecap="round"/>
                </svg>

                {/* Socials section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Socials</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><a href="https://www.linkedin.com/company/domits" target="_blank" rel="noopener noreferrer" style={FOOTER_LINK_STYLE}>Linkedin</a></li>
                        <li><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" style={FOOTER_LINK_STYLE}>Instagram</a></li>
                    </ul>
                </div>


                {/* Office section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Office</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li style={FOOTER_LINK_STYLE}>2013 AS, Haarlem</li>
                        <li style={FOOTER_LINK_STYLE}>Kinderhuissingel 6-K</li>
                    </ul>
                </div>

                {/* Languages section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Languages</h4>
                    <select id='language-dropdown' style={FOOTER_LIST_STYLE}>
                        <option value="english">English</option>
                        <option value="dutch">Dutch</option>
                    </select>
                </div>

                {/* Currency section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Currencies</h4>
                    <select id='currency-dropdown' style={FOOTER_LIST_STYLE}>
                        <option value="euro">Euro</option>
                        <option value="dollar">Dollar</option>
                    </select>
                </div>
            </div>

            {/* conditions section */}
            {/*<div>*/}
            {/*    <h4><a href="#privacy-policy">Privacy policy</a></h4>*/}
            {/*    <h4><a href="#terms-and-conditions">Terms and conditions</a></h4>*/}
            {/*    <h4><a href="#disclaimers">Disclaimers</a></h4>*/}
            {/*    <h4><a href="#sitemap">Sitemap</a></h4>*/}
            {/*</div>*/}


            {/* Copyright Block */}
            <div style={COPYRIGHT_STYLE}>
                <p style={COPYRIGHT_TEXT_STYLE}>Rights reserved, Domits.com ©2023</p>
            </div>
        </footer>
    );
};

export default Footer;
