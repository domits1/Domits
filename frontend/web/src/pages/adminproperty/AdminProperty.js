import React, { useState } from "react";
import "./adminproperty.scss";

const API_URL = "https://jkjpre7t86.execute-api.eu-north-1.amazonaws.com/default";

export default function AdminProperty() {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const amenitiesCatalog = [
    { category: "Essentials", details: "Wi-Fi, air conditioning, heating, TV with cable/satellite, hot water, towels, bed linens, extra pillows and blankets, toilet paper, soap and shampoo." },
    { category: "Kitchen", details: "Refrigerator, microwave, oven, stove, dishwasher, coffee maker, toaster, basic cooking essentials (pots, pans, oil, salt, pepper), dishes and silverware, glasses and mugs, cutting board and knives, blender and kettle." },
    { category: "Bathroom", details: "Hair dryer, shower gel, conditioner, body lotion and first aid kit" },
    { category: "Bedroom", details: "Hangers, iron and ironing board, closet/drawers and alarm clock" },
    { category: "Living area", details: "Sofa/sofa bed, armchairs, coffee table, books and magazines and board games" },
    { category: "Technology", details: "Smart TV, streaming services (Netflix, Amazon Prime), bluetooth speaker, universal chargers, work desk and chair" },
    { category: "Safety", details: "Smoke detector, carbon monoxide detector, fire extinguisher and lock on bedroom door" },
    { category: "Outdoor", details: "Patio or balcony, outdoor furniture, grill, fire pit, pool, hot tub, garden or backyard and bicycle" },
    { category: "Family friendly", details: "High chair, crib, children’s books and toys, baby safety gates, baby bath and baby monitor" },
    { category: "Laundry", details: "Washer and dryer, laundry detergent and clothes drying rack" },
    { category: "Convenience", details: "Keyless entry, self-check-in, local maps and guides, luggage drop-off allowed, parking space and EV charger." },
    { category: "Accessibility", details: "Step-free access, wide doorways, accessible-height bed, accessible-height toilet and shower chair" },
    { category: "Extra services", details: "Housekeeping service [add service fee], concierge service, grocery delivery, airport shuttle, private chef, personal trainer or massage therapist" },
    { category: "Sustainable eco-friendly", details: "Energy, waste, biodiversity & ecosystems, destinations & community" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const fd = new FormData(e.target);
    const body = {
      email: fd.get("email") || "",
      name: fd.get("name") || "",
      phone: fd.get("phone") || "",
      segment: fd.get("segment") || "",
      spaceType: fd.get("spaceType") || "",
      homeName: fd.get("homeName") || "",
      address: fd.get("address") || "",
      description: fd.get("description") || "",
      capacity: fd.get("capacity") || "",
      amenities: fd.getAll("amenities"),
      rules: fd.getAll("rules"),
      channelManager: fd.get("channelManager") || "",
      photoCount: fd.get("photoCount") ? Number(fd.get("photoCount")) : 0,
      rate: fd.get("rate") || "",
      availability: fd.get("availability") || "",
      registrationNumber: fd.get("registrationNumber") || ""
    };

    const token = localStorage.getItem("idToken") || localStorage.getItem("authToken") || "test-token-123";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      if (res.ok) {
        alert("Property created successfully.");
        window.location.reload();
      } else {
        console.log("POST failed", res.status, text);
        alert("Failed to create property. Check console/network.");
        setSubmitting(false);
      }
    } catch (err) {
      console.log("Network/CORS error", err);
      alert("Failed to create property. Network or CORS error.");
      setSubmitting(false);
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
            <label>Address</label>
            <div className="grid-2">
              <input type="text" name="street" placeholder="Street" required />
              <input type="text" name="houseNumber" placeholder="No." required />
            </div>
            <div className="grid-3">
              <input type="text" name="postalCode" placeholder="Postal code" required />
              <input type="text" name="city" placeholder="City" required />
              <input type="text" name="country" placeholder="Country" required />
            </div>
          </div>

          <div className="adminproperty-group">
            <label>Provide a description</label>
            <textarea name="description" rows="4" required />
          </div>

          <div className="adminproperty-group">
            <label>How many people can stay here?</label>
            <div className="grid-4">
              <input type="number" name="guests" placeholder="Guests" min="0" required />
              <input type="number" name="bedrooms" placeholder="Bedrooms" min="0" required />
              <input type="number" name="beds" placeholder="Beds" min="0" required />
              <input type="number" name="bathrooms" placeholder="Bathrooms" min="0" required />
            </div>
          </div>

          <div className="adminproperty-group">
            <label>Let guests know what your space has to offer</label>
            <div className="adminproperty-options">
              {amenitiesCatalog.map((item, idx) => (
                <div key={idx} className="amenity-item">
                  <label>
                    <input type="checkbox" name="amenities" value={item.category} /> {item.category}
                  </label>
                  <p className="amenity-description">{item.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="adminproperty-group">
            <label>House rules</label>
            <label><input type="checkbox" name="rules" value="No smoking" /> No smoking</label>
            <label><input type="checkbox" name="rules" value="No parties/events" /> No parties/events</label>
            <label><input type="checkbox" name="rules" value="Pets allowed" /> Pets allowed</label>
          </div>

          <input type="hidden" name="availability" value="As soon as possible" />

          <div className="adminproperty-group">
            <label>Add photos (min 5, max 10)</label>
            <input type="file" accept="image/*" multiple onChange={onPickFiles} />
            {files.length > 0 && (
              <div className="thumbs">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="thumb">
                    <img src={URL.createObjectURL(f)} alt={`img-${i}`} />
                    <button type="button" onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="adminproperty-group">
            <label>Set your rate</label>
            <input type="number" name="rate" min="0" step="1" required />
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