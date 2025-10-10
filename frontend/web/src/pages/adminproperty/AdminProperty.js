import React, { useState } from "react";
import "./adminproperty.scss";

export default function AdminProperty() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const data = {
      email: e.target.email.value,
      name: e.target.name.value,
      phone: e.target.phone.value,
      segment: e.target.segment.value,
      restaurantOrCasino: e.target.restaurantOrCasino?.value || "",
    };

    try {
      const res = await fetch(
        "https://jkjpre7t86.execute-api.eu-north-1.amazonaws.com/default/adminCreateProperty",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: localStorage.getItem("idToken") || "",
          },
          body: JSON.stringify(data),
        }
      );

      const text = await res.text();
      console.log("API status:", res.status, "body:", text);

      setMessage(`✅ Created property ID: ${text}`);
    } catch (err) {
      console.error("Request error:", err);
      setMessage("❌ Failed to create property");
    } finally {
      setLoading(false);
    }
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
        <div className="adminproperty-options">
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Holiday Homes, Boats & Campers" required />
            Holiday Homes, Boats & Campers
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Resorts & Hotels" required />
            Resorts & Hotels
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Restaurants & Casinos" required />
            Restaurants & Casinos
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Hospitality Startups & Companies" required />
            Hospitality Startups & Companies
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Hospitality Student & Professionals" required />
            Hospitality Student & Professionals
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="segment" value="Hospitality Mentors & Investors" required />
            Hospitality Mentors & Investors
          </label>
        </div>
      </div>

      <div className="adminproperty-group">
        <label>Are you a restaurant or a casino?</label>
        <div className="adminproperty-options">
          <label className="adminproperty-radio">
            <input type="radio" name="restaurantOrCasino" value="Restaurant" />
            Restaurant
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="restaurantOrCasino" value="Casino" />
            Casino
          </label>
        </div>
      </div>

      <button type="submit" className="adminproperty-submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>

      {message && <p className="adminproperty-message">{message}</p>}
    </form>
  );
}