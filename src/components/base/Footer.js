import React from 'react';
import logo from "../../logo.svg";
import { Link } from 'react-router-dom';
import './base.css'

// Constants for styles
const MAIN_FOOTER_STYLE = {
    backgroundColor: '#f8f8f8',
    width: '100%',
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100px', // Set your desired max height
    overflowY: 'auto', // Add overflow to handle content overflow
};


const FOOTER_CONTENT_STYLE = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px',
};

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
        <footer style={MAIN_FOOTER_STYLE}>
            <div style={FOOTER_CONTENT_STYLE}>
                <div className="logo">
                    <img src={logo} width={50} alt="Logo" />
                </div>
                {/* Navigation section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Navigation</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/contact" style={FOOTER_LINK_STYLE}>How it works</Link></li>
                       <li><Link to="/contact" style={FOOTER_LINK_STYLE}>Why Domits</Link></li>   {/*needs correct link*/}
                        <li><Link to="/work" style={FOOTER_LINK_STYLE}>Jobs</Link></li>
                        <li><Link to="/about" style={FOOTER_LINK_STYLE}>About</Link></li>
                        <li><Link to="/contact" style={FOOTER_LINK_STYLE}>Contact</Link></li>
                    </ul>
                </div>

                {/* Guests section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Guest</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/profile" style={FOOTER_LINK_STYLE}>Profile</Link></li>
                        <li><Link to="/bookings" style={FOOTER_LINK_STYLE}>Bookings</Link></li>
                        <li><Link to="/settings" style={FOOTER_LINK_STYLE}>Settings</Link></li>
                    </ul>
                </div>

                {/* Hosts section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Hosts</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><Link to="/dashboard" style={FOOTER_LINK_STYLE}>Dashboard</Link></li>
                        <li><Link to="/payments" style={FOOTER_LINK_STYLE}>Payments</Link></li>
                        <li><Link to="/profile" style={FOOTER_LINK_STYLE}>Profile</Link></li>
                        <li><Link to="/calendar" style={FOOTER_LINK_STYLE}>Calendar</Link></li>
                        <li><Link to="/Hsettings" style={FOOTER_LINK_STYLE}>Settings</Link></li>
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

                {/* Socials section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Socials</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li><a href="https://www.linkedin.com/company/domits" target="_blank" rel="noopener noreferrer" style={FOOTER_LINK_STYLE}>Linkedin</a></li>
                        <li><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" style={FOOTER_LINK_STYLE}>Instagram</a></li>
                    </ul>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li style={FOOTER_LINK_STYLE}>Privacy policy</li>
                        <li style={FOOTER_LINK_STYLE}>Terms and Conditions</li>
                        <li style={FOOTER_LINK_STYLE}>Disclaimer</li>
                    </ul>
                </div>


            {/* Languages section */}
            <div className="footer-section">
                <h4 style={SMALL_HEADER_STYLE}>Languages</h4>
                <ul style={FOOTER_LIST_STYLE}>
                    <li style={FOOTER_LINK_STYLE}>Dutch</li>
                    <li style={FOOTER_LINK_STYLE}>English</li>
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
            </div>

            {/* Copyright Block */}
            <div style={COPYRIGHT_STYLE}>
                <p style={COPYRIGHT_TEXT_STYLE}>Rights reserved, Domits.com ©2023</p>
            </div>
        </footer>
    );
};

export default Footer;
