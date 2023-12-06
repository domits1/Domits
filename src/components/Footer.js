import React, { useState } from 'react';

function Footer() {

    return (
        <div className="App">
            <footer className="footer">
                <div className="newsletter-section">
                    <p>Sign up for the newsletter</p>
                    <div className="newsletter-subsection">
                        <p>No spam, we promise</p>
                    </div>
                    <div className="newsletter-form">
                        <input type="email" placeholder="Your email" />
                        <button>Subscribe</button>
                    </div>
                </div>

                <div className="footer-links-section">
                    <div className="footer-column" id="domits-column">
                        <h3>Domits</h3>
                        <ul>
                            <li>Who is Domits</li>
                            <li>About Us</li>
                            <li>Career</li>
                            <li>Contact</li>
                        </ul>
                    </div>

                    <div className="footer-column" id="resources-column">
                        <h3>Resources</h3>
                        <ul>
                            <li>Privacy Policy</li>
                            <li>General Agreement</li>
                            <li>Expectation Policy</li>
                        </ul>
                    </div>

                    <div className="footer-column" id="my-domits-column">
                        <h3>My Domits</h3>
                        <ul>
                            <li>Bookings</li>
                            <li>My Contact Centre</li>
                            <li>My Account Settings</li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Footer;