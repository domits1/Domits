import React from 'react';
import logo from "../logo.svg";

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
                        <li style={FOOTER_LINK_STYLE}>How it works</li>
                        <li style={FOOTER_LINK_STYLE}>Why Domits</li>
                        <li style={FOOTER_LINK_STYLE}>Jobs</li>
                        <li style={FOOTER_LINK_STYLE}>About</li>
                        <li style={FOOTER_LINK_STYLE}>Contact</li>
                    </ul>
                </div>


                {/* Network section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Network</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li style={FOOTER_LINK_STYLE}>Guests</li>
                        <li style={FOOTER_LINK_STYLE}>Hosts</li>
                        <li style={FOOTER_LINK_STYLE}>Developers</li>
                        <li style={FOOTER_LINK_STYLE}>Partners</li>
                        <li style={FOOTER_LINK_STYLE}>Students</li>
                        <li style={FOOTER_LINK_STYLE}>Startups</li>
                    </ul>
                </div>

                {/* Socials section */}
                <div className="footer-section">
                    <h4 style={SMALL_HEADER_STYLE}>Socials</h4>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li style={FOOTER_LINK_STYLE}>Linkedin</li>
                        <li style={FOOTER_LINK_STYLE}>Instagram</li>
                    </ul>
                    <ul style={FOOTER_LIST_STYLE}>
                        <li style={FOOTER_LINK_STYLE}>Privacy policy</li>
                        <li style={FOOTER_LINK_STYLE}>Terms and Conditions</li>
                        <li style={FOOTER_LINK_STYLE}>Disclaimer</li>
                    </ul>
                </div>


            {/* Languages section */}
            <div className="footer-section">
                <h4 style={SMALL_HEADER_STYLE}>Office</h4>
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


{/* Privacy, Terms, Disclaimer */}
// <div className="footer-section">
//     <h4 style={SMALL_HEADER_STYLE}>Legal</h4>
//     <ul style={FOOTER_LIST_STYLE}>
//         <li style={FOOTER_LINK_STYLE}>Privacy policy</li>
//         {/* Add other legal items */}
//     </ul>
// </div>