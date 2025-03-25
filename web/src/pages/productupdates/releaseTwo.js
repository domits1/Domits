import React from 'react';
import './styles/releaseTwo.css';
import note1 from '../../images/house.jpeg';
import note2 from '../../images/phone1.webp';
import search from '../../images/search.webp';
import stripe from '../../images/Stripe.webp';
import listings from '../../images/listings.webp';
import UI from '../../images/userInterface.webp';
import recommendations from '../../images/recommandations.webp';
import customerSupport from '../../images/customerSupport.webp';

const ReadMore = () => {
  return (
    <div className="new-features">
    <h1>New features</h1>
    <p>Welcome to a new era of vacation rentals! At Domits, we are dedicated to providing you with the most innovative and comfortable vacation experiences. Our recently redesigned platform offers a range of new features and improvements to make your stay unforgettable.</p>

    <div className="features-grid">
      <div className="feature-item">
        <img src={search} alt="Enhanced Search" />
        <h3>Enhanced Search</h3>
        <p>Find your perfect vacation spot effortlessly with our enhanced search tools. Filter by location, accommodation type, check-in/check-out dates, and number of guests.</p>
      </div>
      <div className="feature-item">
        <img src={listings} alt="Detailed Listings"/>
        <h3>Detailed Listings</h3>
        <p>Each property listing now includes high-resolution photos and comprehensive descriptions to give you a complete view before you book.</p>
      </div>
      <div className="feature-item">
        <img src={UI} alt="User-Friendly Interface" />
        <h3>User-Friendly Interface</h3>
        <p>Our redesigned user interface ensures a seamless booking experience, whether you're browsing on your desktop or mobile device.</p>
      </div>
      <div className="feature-item">
        <img src={recommendations} alt="Personalized Recommendations" />
        <h3>Personalized Recommendations</h3>
        <p>Receive tailored suggestions and travel advice from our AI chat assistant, ensuring you always find the best places that match your taste.</p>
      </div>
      <div className="feature-item">
        <img src={customerSupport} alt="Improved Customer Support" />
        <h3>Improved Customer Support</h3>
        <p>Get assistance anytime with our 24/7 customer support chat. Our team is always ready to help you with any inquiries or issues you might have.</p>
      </div>
      <div className="feature-item">
        <img src={stripe} alt="Secure and Easy Payments" />
        <h3>Secure and Easy Payments</h3>
        <p>Experience faster and more secure payment options with our updated payment system.</p>
      </div>
    </div>
  </div>
    );
};

export default ReadMore;
