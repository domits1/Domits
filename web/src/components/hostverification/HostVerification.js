import "./HostVerification.css";

const HostVerification = () => {
  return (
    <main className="main-container">
      <div className="left-container">
        <h1>What is the next step?</h1>
        <div className="options-container">
          <p>Meet local requirements</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod.
          </p>
          <p>Required</p>
        </div>
        <hr></hr>
        <div className="options-container">
          <p>Verify your identity</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod.
          </p>
          <p>Required</p>
        </div>
        <hr></hr>
        <div className="options-container">
          <p>Connect with stripe to receive payments</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod.
          </p>
          <p>Required</p>
        </div>
        <hr></hr>
        <div className="options-container">
          <p>Confirm your phone number</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod.
          </p>
          <p>Required</p>
        </div>
      </div>
      <div className="right-container">
        <div className="dashboard-cardd">
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
        </div>
      </div>
    </main>
  );
};

export default HostVerification;
