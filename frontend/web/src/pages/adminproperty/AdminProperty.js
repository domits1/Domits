import React, { useState } from "react";
import "./adminproperty.scss";

export default function AdminProperty() {
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    console.log("Form submitted:", data);
  };

  return (
    <form className="adminproperty-form" onSubmit={handleSubmit}>
      <h2 className="adminproperty-title">Create a property</h2>

      <div className="adminproperty-group">
        <label>Email address</label>
        <input type="email" name="email" placeholder="name@example.com" required />
      </div>

      <div className="adminproperty-group">
        <label>Name</label>
        <input type="text" name="name" placeholder="Your name" required />
      </div>

      <div className="adminproperty-group">
        <label>Phone number</label>
        <input type="tel" name="phone" placeholder="+31 6 12 34 56 78" required />
      </div>

      <div className="adminproperty-group">
        <label>List your property or join the hospitality ecosystem</label>
        <label className="adminproperty-radio">
          <input
            type="radio"
            name="segment"
            value="Holiday Homes, Boats & Campers"
            onChange={() => setShowDetails(true)}
            required
          />
          Holiday Homes, Boats & Campers
        </label>
      </div>

      {showDetails && (
        <>
          <div className="adminproperty-group">
            <label>What kind of space do your guests have access to?</label>
            <div className="adminproperty-options">
              <label><input type="radio" name="spaceType" value="Entire Space" required /> Entire Space</label>
              <label><input type="radio" name="spaceType" value="Room" /> Room</label>
              <label><input type="radio" name="spaceType" value="Shared Room" /> Shared Room</label>
            </div>
          </div>

          <div className="adminproperty-group">
            <label>Name your home</label>
            <input type="text" name="homeName" required />
          </div>

          <div className="adminproperty-group">
            <label>Where can we find your accommodation? (Address)</label>
            <input type="text" name="address" required />
          </div>

          <div className="adminproperty-group">
            <label>Provide a description</label>
            <textarea name="description" rows="4" required />
          </div>

          <div className="adminproperty-group">
            <label>How many people can stay here? (Guests, bedrooms, beds, bathrooms)</label>
            <input type="text" name="capacity" required />
          </div>

          <div className="adminproperty-group">
            <label>Let guests know what your space has to offer</label>
            <div className="adminproperty-options">
              {[
                "Essentials",
                "Kitchen",
                "Bathroom",
                "Bedroom",
                "Living area",
                "Technology",
                "Safety",
                "Outdoor",
                "Family friendly",
                "Laundry",
                "Convenience",
                "Accessibility",
                "Extra services",
                "Sustainable eco-friendly"
              ].map((item, idx) => (
                <label key={idx}>
                  <input type="checkbox" name="amenities" value={item} /> {item}
                </label>
              ))}
            </div>
          </div>

          <div className="adminproperty-group">
            <label>House rules</label>
            <label><input type="checkbox" name="rules" value="Smoking" /> Smoking</label>
            <label><input type="checkbox" name="rules" value="Pets" /> Pets</label>
            <label><input type="checkbox" name="rules" value="Parties/Events" /> Parties/Events</label>
          </div>

          <div className="adminproperty-group">
            <label>Do you want to use a channel manager?</label>
            <label><input type="radio" name="channelManager" value="No, thanks" required /> No, thanks</label>
            <label><input type="radio" name="channelManager" value="Yes, list on platforms" /> Yes, list on Booking, Airbnb, Expedia, etc.</label>
          </div>

          <div className="adminproperty-group">
            <label>How many photos do you have?</label>
            <input type="number" name="photoCount" min="0" required />
          </div>

          <div className="adminproperty-group">
            <label>Set your rate</label>
            <input type="text" name="rate" required />
          </div>

          <div className="adminproperty-group">
            <label>Share your first availability</label>
            <label><input type="radio" name="availability" value="As soon as possible" required /> As soon as possible</label>
            <label><input type="radio" name="availability" value="Starting later" /> Starting at a specific date which I share later</label>
          </div>

          <div className="adminproperty-group">
            <label>Add your registration number (optional)</label>
            <input type="text" name="registrationNumber" />
          </div>
        </>
      )}

      <button type="submit" className="adminproperty-submit">
        Submit
      </button>
    </form>
  );
}