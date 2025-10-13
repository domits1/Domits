import React, { useState } from "react";
import "./adminproperty.scss";

const API_URL = "https://jkjpre7t86.execute-api.eu-north-1.amazonaws.com/default";

const AMENITIES = {
  Essentials: ["Wi-Fi", "Air conditioning", "Heating", "TV with cable/satellite", "Hot water", "Towels", "Bed linens", "Extra pillows and blankets", "Toilet paper", "Soap", "Shampoo"],
  Kitchen: ["Refrigerator", "Microwave", "Oven", "Stove", "Dishwasher", "Coffee maker", "Toaster", "Pots and pans", "Oil", "Salt", "Pepper", "Dishes and silverware", "Glasses and mugs", "Cutting board", "Knives", "Blender", "Kettle"],
  Bathroom: ["Hair dryer", "Shower gel", "Conditioner", "Body lotion", "First aid kit"],
  Bedroom: ["Hangers", "Iron", "Ironing board", "Closet/Drawers", "Alarm clock"],
  "Living area": ["Sofa/sofa bed", "Armchairs", "Coffee table", "Books and magazines", "Board games"],
  Technology: ["Smart TV", "Streaming services", "Bluetooth speaker", "Universal chargers", "Work desk", "Work chair"],
  Safety: ["Smoke detector", "Carbon monoxide detector", "Fire extinguisher", "Lock on bedroom door"],
  Outdoor: ["Patio or balcony", "Outdoor furniture", "Grill", "Fire pit", "Pool", "Hot tub", "Garden or backyard", "Bicycle"],
  "Family friendly": ["High chair", "Crib", "Children’s books and toys", "Baby safety gates", "Baby bath", "Baby monitor"],
  Laundry: ["Washer", "Dryer", "Laundry detergent", "Clothes drying rack"],
  Convenience: ["Keyless entry", "Self-check-in", "Local maps and guides", "Luggage drop-off allowed", "Parking space", "EV charger"],
  Accessibility: ["Step-free access", "Wide doorways", "Accessible-height bed", "Accessible-height toilet", "Shower chair"],
  "Extra services": ["Housekeeping service", "Concierge service", "Grocery delivery", "Airport shuttle", "Private chef", "Personal trainer", "Massage therapist"],
  "Sustainable eco-friendly": ["Energy", "Waste", "Biodiversity & ecosystems", "Destinations & community"]
};

export default function AdminProperty() {
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const MIN_IMAGES = 5;
  const MAX_IMAGES = 10;

  const onPickFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    const merged = [...files, ...selected].slice(0, MAX_IMAGES);
    setFiles(merged);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const fd = new FormData(e.target);

    const guests = Number(fd.get("guests") || 0);
    const bedrooms = Number(fd.get("bedrooms") || 0);
    const beds = Number(fd.get("beds") || 0);
    const bathrooms = Number(fd.get("bathrooms") || 0);
    const capacityString = `${guests} guests, ${bedrooms} bedrooms, ${beds} beds, ${bathrooms} bathrooms`;

    const rawAmenityValues = fd.getAll("amenityItem");
    const amenities = rawAmenityValues.map(v => {
      try {
        const obj = JSON.parse(v);
        return { amenity: String(obj.amenity || "").trim(), category: obj.category != null ? String(obj.category).trim() : null };
      } catch {
        return { amenity: String(v), category: null };
      }
    }).filter(x => x.amenity);

    const rules = [];
    if (fd.get("ruleSmoking")) rules.push("No smoking");
    if (fd.get("ruleParties")) rules.push("No parties/events");
    if (fd.get("rulePets")) rules.push("Pets allowed");

    const body = {
      email: fd.get("email") || "",
      name: fd.get("name") || "",
      phone: fd.get("phone") || "",
      segment: "Holiday Homes, Boats & Campers",
      spaceType: fd.get("spaceType") || "",
      homeName: fd.get("homeName") || "",
      address: `${fd.get("street") || ""} ${fd.get("houseNumber") || ""}, ${fd.get("postalCode") || ""} ${fd.get("city") || ""}, ${fd.get("country") || ""}`,
      description: fd.get("description") || "",
      capacity: capacityString,
      amenities,
      rules,
      checkIn: fd.get("checkIn") || "",
      checkOut: fd.get("checkOut") || "",
      channelManager: "No, thanks",
      photoCount: 0,
      images: [],
      rate: fd.get("rate") || "",
      availability: "As soon as possible",
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
            <textarea name="description" rows={4} required />
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
            <div className="amenities-grid">
              {Object.entries(AMENITIES).map(([cat, items]) => (
                <div key={cat} className="amenity-block">
                  <div className="amenity-title">{cat}</div>
                  <div className="amenity-items">
                    {items.map((it) => (
                      <label key={it} className="amenity-check">
                        <input
                          type="checkbox"
                          name="amenityItem"
                          value={JSON.stringify({ amenity: it, category: cat })}
                        /> {it}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="adminproperty-group">
            <label>House rules</label>
            <div className="grid-2">
              <label>Check-in time<input type="time" name="checkIn" /></label>
              <label>Check-out time<input type="time" name="checkOut" /></label>
            </div>
            <div className="adminproperty-options">
              <label><input type="checkbox" name="ruleSmoking" /> No smoking</label>
              <label><input type="checkbox" name="ruleParties" /> No parties/events</label>
              <label><input type="checkbox" name="rulePets" /> Pets allowed</label>
            </div>
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

      <button type="submit" className="adminproperty-submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}