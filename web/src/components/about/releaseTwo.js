import React from 'react';
import './releaseTwo.css';
import note1 from '../../images/house.jpeg';
import note2 from '../../images/phone1.webp';
import search from '../../images/search.webp';

const ReadMore = () => {
  return (
    <div className="read-more">
      <div className="header">
      <h1>New features</h1>
      <p>
        Welcome to a new era of vacation rentals! At Domits, we are dedicated to providing you with the most innovative and comfortable vacation experiences. Our recently redesigned platform offers a range of new features and improvements to make your stay unforgettable.
      </p>
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>Enhanced Search</h2>
          <p>
            Find your perfect vacation spot effortlessly with our enhanced search tools. Filter by location, accommodation type, check-in/check-out dates, and number of guests.
          </p>
        </div>
        <img src={search} alt="Enhanced Search" />
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>Detailed Listings</h2>
          <p>
            Each property listing now includes high-resolution photos and comprehensive descriptions to give you a complete view before you book.
          </p>
        </div>
        <img src={note1} alt="Detailed Listings" />
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>User-Friendly Interface</h2>
          <p>
            Our redesigned user interface ensures a seamless booking experience, whether you’re browsing on your desktop or mobile device.
          </p>
        </div>
        <img src={note2} alt="User-Friendly Interface" />
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>Personalized Recommendations</h2>
          <p>
            Receive tailored suggestions and travel advice from our AI chat assistant, ensuring you always find the best places that match your taste.
          </p>
        </div>
        <img src={note2} alt="Personalized Recommendations" />
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>Improved Customer Support</h2>
          <p>
            Get assistance anytime with our 24/7 customer support chat. Our team is always ready to help you with any inquiries or issues you might have.
          </p>
        </div>
        <img src={note1} alt="Improved Customer Support" />
      </div>
      <div className="feature">
        <div className="feature-text">
          <h2>Secure and Easy Payments</h2>
          <p>
            Experience faster and more secure payment options with our updated payment system.
          </p>
        </div>
        <img src={note1} alt="Secure and Easy Payments" />
      </div>
    </div>
  );
};

export default ReadMore;