import "./HostVerification.css";

const HostVerification = () => {
  return (
    <main className="main-container">
        <div className="left-container">
          <h1>What is the next step?</h1>
          <div className="options-container">
            <div className="option-container">
              <p className="option-title">Meet local requirements</p>
              <p className="option-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod.
              </p>
              <p className="option-status">Required</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                d="M9 18l6-6-6-6"
                stroke="#000"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <hr></hr>
          <div className="options-container">
            <div className="option-container">
              <p className="option-title">Verify your identity</p>
              <p className="option-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod.
              </p>
              <p className="option-status">Required</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                d="M9 18l6-6-6-6"
                stroke="#000"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <hr></hr>
          <div className="options-container">
            <div className="option-container">
              <p className="option-title">
                Connect with stripe to receive payments
              </p>
              <p className="option-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod.
              </p>
              <p className="option-status">Required</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                d="M9 18l6-6-6-6"
                stroke="#000"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <hr></hr>
          <div className="options-container">
            <div className="option-container">
              <p className="option-title">Confirm your phone number</p>
              <p className="option-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod.
              </p>
              <p className="option-status">Required</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="22"
              height="22"
            >
              <path
                d="M9 18l6-6-6-6"
                stroke="#000"
                stroke-width="2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
        <div className="right-container">
          {/* <div className="dashboard-cardd">
          <div className="accommodation-text">
            <p className="accommodation-title">Tropical villa with pool</p>
          </div>
          <img
            src="https://images.traum-ferienwohnungen.de/270931/8106625/46/villa-klimno-outdoor-recording-1.jpg"
            alt="Slideshow"
            className="accommodation-imgg"
          />
          <div className="accommodation-details">
            <p className="accommodation-details-title">$1400 night</p>
            <p>4 beds - 1 bathroom - 60m2</p>
            <p></p>
          </div>
        </div> */}
          <div class="accocard" style={{ width: "48%" }}>
            <img
              src="https://accommodation.s3.eu-north-1.amazonaws.com/images/2026b13c-b0ba-49e6-95f8-189725c41942/1c259946-234f-4d94-9b8a-162b4236da42/Image-1.jpg"
              alt="
Experience Paradise:"
            />
            <div class="accocard-content">
              <div class="accocard-title">Tropical villa with pool</div>
              <div class="accocard-price">€1400 per night</div>
              <div class="accocard-detail">
                Escape to the Caribbean gem of Curaçao and immerse yourself in a
                world of sun, sea, and vibrant culture. With its stunning
                beaches, colorful architecture, and diverse attractions, Curaçao
                offers the perfect blend of relaxation and adventure for
                travelers seeking a memorable tropical getaway.
              </div>
              <div class="accocard-specs">
                <div class="accocard-size"></div>
                <div class="accocard-size">1 Bathrooms</div>
                <div class="accocard-size">1 Bedrooms</div>
                <div class="accocard-size">2 Persons</div>
              </div>
            </div>
          </div>
        </div>
      <div className="bottom-container">
      <hr></hr>
        <button className="publish-btn">Publish Listing</button>
      </div>
    </main>
  );
};

export default HostVerification;
