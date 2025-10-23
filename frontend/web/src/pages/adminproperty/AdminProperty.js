import React, { useMemo, useState } from "react";
import "./adminproperty.scss";
import AmenitiesStore from "../../store/amenities";

const API_URL = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";

const AMENITIES = {
  Essentials: ["Wi-Fi", "Air conditioning", "Heating", "TV with cable/satellite", "Hot water", "Towels", "Bed linens", "Extra pillows and blankets", "Toilet paper", "Soap", "Shampoo"],
  Kitchen: ["Refrigerator", "Microwave", "Oven", "Stove", "Dishwasher", "Coffee maker", "Toaster", "Pots and pans", "Oil", "Salt", "Pepper", "Dishes and silverware", "Glasses and mugs", "Cutting board", "Knives", "Blender", "Kettle"],
  Bathroom: ["Hair dryer", "Shower gel", "Conditioner", "Body lotion", "First aid kit"],
  Bedroom: ["Hangers", "Iron", "Ironing board", "Closet/Drawers", "Alarm clock"],
  "Living area": ["Sofa/sofa bed", "Armchairs", "Coffee table", "Books and magazines", "Board games"],
  Technology: ["Smart TV", "Streaming services", "Bluetooth speaker", "Universal chargers", "Work desk", "Work chair"],
  Safety: ["Smoke detector", "Carbon monoxide detector", "Fire extinguisher", "Lock on bedroom door"],
  Outdoor: ["Patio or balcony", "Outdoor furniture", "Grill", "Fire pit", "Pool", "Hot tub", "Garden or backyard", "Bicycle"],
  "Family friendly": ["High chair", "Crib", "Children's books and toys", "Baby safety gates", "Baby bath", "Baby monitor"],
  Laundry: ["Washer", "Dryer", "Laundry detergent", "Clothes drying rack"],
  Convenience: ["Keyless entry", "Self-check-in", "Local maps and guides", "Luggage drop-off allowed", "Parking space", "EV charger"],
  Accessibility: ["Step-free access", "Wide doorways", "Accessible-height bed", "Accessible-height toilet", "Shower chair"],
  "Extra services": ["Housekeeping service", "Concierge service", "Grocery delivery", "Airport shuttle", "Private chef", "Personal trainer", "Massage therapist"],
  "Sustainable eco-friendly": ["Energy", "Waste", "Biodiversity & ecosystems", "Destinations & community"]
};

const RULE_ID = {
  NO_SMOKING: "NO_SMOKING",
  NO_PARTIES: "NO_PARTIES",
  PETS_ALLOWED: "PETS_ALLOWED"
};

function getAccessToken() {
  const prefix = "CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.";
  const key = Object.keys(localStorage).find(k => k.startsWith(prefix) && k.endsWith(".accessToken"));
  return key ? localStorage.getItem(key) : "";
}

function findAmenityIdByName(name) {
  try {
    console.log("Looking for amenity:", name);
    console.log("AmenitiesStore:", AmenitiesStore);
    
    if (!AmenitiesStore) {
      console.log("AmenitiesStore is undefined");
      return null;
    }
    
    let hit = null;
    
    if (Array.isArray(AmenitiesStore)) {
      hit = AmenitiesStore.find(a => 
        a.name === name || 
        a.label === name || 
        a.slug === name ||
        a.amenity === name
      );
    } 

    else if (typeof AmenitiesStore === 'object') {
      
      for (const category of Object.values(AmenitiesStore)) {
        if (Array.isArray(category)) {
          hit = category.find(a => 
            (a.name === name || a.label === name || a.slug === name || a.amenity === name)
          );
          if (hit) break;
        }
      }
    }
    
    console.log("Found amenity:", hit);
    return hit ? hit.id : null;
  } catch (error) {
    console.error("Error finding amenity:", error);
    return null;
  }
}

const HARDCODED_AMENITY_IDS = {
  "Wi-Fi": "1",
  "Air conditioning": "2", 
  "Heating": "3",
  "TV with cable/satellite": "4",
  "Hot water": "5",
  "Towels": "6",
  "Bed linens": "7",
  "Extra pillows and blankets": "8",
  "Toilet paper": "9",
  "Soap": "10",
  "Shampoo": "11",
  "Refrigerator": "12",
  "Microwave": "13",
  "Oven": "14",
  "Stove": "15",
  "Dishwasher": "16",
  "Coffee maker": "17",
  "Toaster": "18",
  "Pots and pans": "19",
  "Oil": "20",
  "Salt": "21", 
  "Pepper": "22",
  "Dishes and silverware": "23",
  "Glasses and mugs": "24",
  "Cutting board": "25",
  "Knives": "26",
  "Blender": "27",
  "Kettle": "28",
  "Hair dryer": "29",
  "Shower gel": "30",
  "Conditioner": "31",
  "Body lotion": "32",
  "First aid kit": "33",
  "Hangers": "34",
  "Iron": "35",
  "Ironing board": "36",
  "Closet/Drawers": "37",
  "Alarm clock": "38",
  "Sofa/sofa bed": "39",
  "Armchairs": "40",
  "Coffee table": "41",
  "Books and magazines": "42",
  "Board games": "43",
  "Smart TV": "44",
  "Streaming services": "45",
  "Bluetooth speaker": "46",
  "Universal chargers": "47",
  "Work desk": "48",
  "Work chair": "49",
  "Smoke detector": "50",
  "Carbon monoxide detector": "51",
  "Fire extinguisher": "52",
  "Lock on bedroom door": "53",
  "Patio or balcony": "54",
  "Outdoor furniture": "55",
  "Grill": "56",
  "Fire pit": "57",
  "Pool": "58",
  "Hot tub": "59",
  "Garden or backyard": "60",
  "Bicycle": "61",
  "High chair": "62",
  "Crib": "63",
  "Children's books and toys": "64",
  "Baby safety gates": "65",
  "Baby bath": "66",
  "Baby monitor": "67",
  "Washer": "68",
  "Dryer": "69",
  "Laundry detergent": "70",
  "Clothes drying rack": "71",
  "Keyless entry": "72",
  "Self-check-in": "73",
  "Local maps and guides": "74",
  "Luggage drop-off allowed": "75",
  "Parking space": "76",
  "EV charger": "77",
  "Step-free access": "78",
  "Wide doorways": "79",
  "Accessible-height bed": "80",
  "Accessible-height toilet": "81",
  "Shower chair": "82",
  "Housekeeping service": "83",
  "Concierge service": "84",
  "Grocery delivery": "85",
  "Airport shuttle": "86",
  "Private chef": "87",
  "Personal trainer": "88",
  "Massage therapist": "89",
  "Energy": "90",
  "Waste": "91",
  "Biodiversity & ecosystems": "92",
  "Destinations & community": "93"
};

function mapSpaceTypeLabel(v) {
  if (v === "Entire Space") return "Full house";
  if (v === "Room") return "Private room";
  if (v === "Shared Room") return "Shared room";
  return "Full house";
}

async function filesToImagePayload(files) {
  const arr = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    arr.push({ key: `images/${i + 1}`, image: b64 });
  }
  return arr;
}

export default function AdminProperty() {
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [amenityChecks, setAmenityChecks] = useState({});
  const allAmenityNames = useMemo(() => Object.values(AMENITIES).flat(), []);

  function onPickFiles(e) {
    const picked = Array.from(e.target.files || []);
    const combined = [...files, ...picked].slice(0, 10);
    setFiles(combined);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function onAmenityToggle(name, checked) {
    setAmenityChecks(prev => ({ ...prev, [name]: checked }));
  }

  async function postPayload(payload, token) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    try { return JSON.parse(text); } catch { return {}; }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (files.length < 5) {
      alert("Add at least 5 photos (max 10).");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);

    const spaceType = mapSpaceTypeLabel(fd.get("spaceType"));
    const homeName = fd.get("homeName")?.toString().trim() || "";
    const street = fd.get("street")?.toString().trim() || "";
    const houseNumberRaw = fd.get("houseNumber")?.toString().trim() || "";
    const postalCode = fd.get("postalCode")?.toString().trim() || "";
    const city = fd.get("city")?.toString().trim() || "";
    const country = fd.get("country")?.toString().trim() || "";
    const description = fd.get("description")?.toString().trim() || "";
    const guests = Number(fd.get("guests") || 0);
    const bedrooms = Number(fd.get("bedrooms") || 0);
    const beds = Number(fd.get("beds") || 0);
    const bathrooms = Number(fd.get("bathrooms") || 0);
    const checkIn = fd.get("checkIn")?.toString() || "";
    const checkOut = fd.get("checkOut")?.toString() || "";
    const rate = Number(fd.get("rate") || 0);
    const registrationNumber = fd.get("registrationNumber")?.toString().trim() || "";
    const ruleSmoking = !!fd.get("ruleSmoking");
    const ruleParties = !!fd.get("ruleParties");
    const rulePets = !!fd.get("rulePets");

    const pickedAmenityNames = allAmenityNames.filter(n => amenityChecks[n]);
    
    // Debug: log geselecteerde amenities
    console.log("Selected amenity names:", pickedAmenityNames);
    
    // Probeer eerst via AmenitiesStore, anders gebruik hardcoded mapping
    let amenities = [];
    
    for (const amenityName of pickedAmenityNames) {
      let amenityId = findAmenityIdByName(amenityName);
      
      // Als niet gevonden via AmenitiesStore, probeer hardcoded mapping
      if (!amenityId && HARDCODED_AMENITY_IDS[amenityName]) {
        amenityId = HARDCODED_AMENITY_IDS[amenityName];
        console.log(`Found ${amenityName} via hardcoded mapping: ${amenityId}`);
      }
      
      if (amenityId) {
        amenities.push({ amenityId: amenityId });
      } else {
        console.warn(`Could not find ID for amenity: ${amenityName}`);
      }
    }
    
    console.log("Final amenities to send:", amenities);

    const propertyImages = await filesToImagePayload(files);

    const property = {
      title: homeName,
      subtitle: city,
      description,
      guestCapacity: guests,
      registrationNumber,
      status: "ACTIVE",
      createdAt: Date.now(),
      updatedAt: 0
    };

    const houseNumber = houseNumberRaw ? (Number.isNaN(Number(houseNumberRaw)) ? houseNumberRaw : Number(houseNumberRaw)) : "";

    const propertyLocation = {
      country,
      city,
      street,
      houseNumber,
      houseNumberExtension: "",
      postalCode
    };

    const propertyPricing = { roomRate: rate, cleaning: 0 };

    const propertyCheckIn = {
      checkIn: { from: checkIn || "00:00", till: checkIn || "23:59" },
      checkOut: { from: checkOut || "00:00", till: checkOut || "23:59" }
    };

    const propertyRules = [
      { rule: RULE_ID.NO_SMOKING, value: ruleSmoking },
      { rule: RULE_ID.NO_PARTIES, value: ruleParties },
      { rule: RULE_ID.PETS_ALLOWED, value: rulePets }
    ].filter(r => r.value === true || r.rule === RULE_ID.PETS_ALLOWED);

    const propertyGeneralDetails = [
      { detail: "Guests", value: guests },
      { detail: "Bedrooms", value: bedrooms },
      { detail: "Beds", value: beds },
      { detail: "Bathrooms", value: bathrooms }
    ];

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const propertyAvailability = [
      { availableStartDate: now + oneDay, availableEndDate: now + 180 * oneDay }
    ];

    const propertyType = { property_type: "House", spaceType };

    const payload = {
      property,
      propertyAmenities: amenities,
      propertyImages,
      propertyLocation,
      propertyPricing,
      propertyCheckIn,
      propertyRules,
      propertyGeneralDetails,
      propertyAvailability,
      propertyType
    };

    console.log("Full payload being sent:", JSON.stringify(payload, null, 2));

    const token = getAccessToken();
    if (!token) {
      alert("No authorization token found.");
      return;
    }

    setSubmitting(true);
    try {
      await postPayload(payload, token);
      alert("Property created successfully.");
      form.reset();
      setFiles([]);
      setAmenityChecks({});
    } catch (err) {
      const msg = String(err.message || err);
      console.error("Error details:", msg);
      
      if (msg.includes("Rule not found")) {
        try {
          const retry = { ...payload, propertyRules: [] };
          await postPayload(retry, token);
          alert("Property created successfully (rules skipped).");
          form.reset();
          setFiles([]);
          setAmenityChecks({});
        } catch (err2) {
          alert(`Failed to create property: ${String(err2.message || err2)}`);
        }
      } else {
        alert(`Failed to create property: ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="adminproperty-form" onSubmit={onSubmit}>
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
                      value={it}
                      checked={!!amenityChecks[it]}
                      onChange={(ev) => onAmenityToggle(it, ev.target.checked)}
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

      <button type="submit" className="adminproperty-submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}