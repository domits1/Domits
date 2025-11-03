import React, { useMemo, useState } from "react";
import "./adminproperty.scss";
import amenitiesList from "../../store/amenities";
import { PropertyBuilder } from "../../features/hostonboarding/stores/propertyBuilder";
import { submitAccommodation } from "../../features/hostonboarding/services/SubmitAccommodation";
import { useNavigate } from "react-router-dom";

export default function AdminProperty() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [imageData, setImageData] = useState([]);
  const [amenityChecks, setAmenityChecks] = useState({});

  const AMENITIES = useMemo(
    () =>
      amenitiesList.reduce((acc, a) => {
        if (!acc[a.category]) acc[a.category] = [];
        acc[a.category].push({ id: a.id, label: a.amenity });
        return acc;
      }, {}),
    []
  );

  const SPACE_TYPE_MAP = {
    "Entire Space": "Full house",
    Room: "Room",
    "Shared Room": "Shared room",
  };

  const onAmenityToggle = (id, checked) => {
    setAmenityChecks((prev) => ({ ...prev, [id]: checked }));
  };

  const readAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const onPickFiles = async (ev) => {
    const picked = Array.from(ev.target.files || []);
    if (!picked.length) return;

    const newFiles = [...files, ...picked].slice(0, 10);
    const addedFiles = newFiles.slice(files.length);
    setFiles(newFiles);

    const enc = await Promise.all(addedFiles.map(readAsDataUrl));
    const stamped = enc.map((dataUrl, i) => {
      const f = addedFiles[i];
      const safeName = (f?.name || `img-${Date.now()}-${i}`).replace(/\s+/g, "_");
      return { key: safeName, image: dataUrl };
    });

    setImageData((prev) => [...prev, ...stamped]);
  };

  const removeFile = (i) => {
    const nf = files.slice();
    nf.splice(i, 1);
    setFiles(nf);
    const nd = imageData.slice();
    nd.splice(i, 1);
    setImageData(nd);
  };

  const toMinutes = (t) => {
    if (!t) return 0;
    const [hh, mm] = t.split(":").map((n) => Number(n) || 0);
    return hh * 60 + mm;
  };

  const minutesToHHMM = (m) => {
    const n = Number(m) || 0;
    const hh = Math.floor(n / 60);
    const mm = n % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (imageData.length < 5) {
      alert("Add at least 5 photos.");
      return;
    }

    const fd = new FormData(e.currentTarget);

    const spaceTypeRaw = fd.get("spaceType")?.toString() || "Entire Space";
    const spaceType = SPACE_TYPE_MAP[spaceTypeRaw] || "Full house";

    const homeName = fd.get("homeName")?.toString()?.trim() || "";
    const street = fd.get("street")?.toString()?.trim() || "";
    const houseNumber = Number(fd.get("houseNumber") ?? 0);
    const postalCode = fd.get("postalCode")?.toString()?.trim() || "";
    const city = fd.get("city")?.toString()?.trim() || "";
    const country = fd.get("country")?.toString()?.trim() || "";
    const description = fd.get("description")?.toString()?.trim() || "";

    const guests = Number(fd.get("guests") || 0);
    const bedrooms = Number(fd.get("bedrooms") || 0);
    const beds = Number(fd.get("beds") || 0);
    const bathrooms = Number(fd.get("bathrooms") || 0);

    const checkInRaw = fd.get("checkIn")?.toString() || "15:00";
    const checkOutRaw = fd.get("checkOut")?.toString() || "11:00";
    const checkInMin = toMinutes(checkInRaw);
    const checkOutMin = toMinutes(checkOutRaw);

    const ruleSmoking = !!fd.get("ruleSmoking");
    const ruleParties = !!fd.get("ruleParties");
    const rulePets = !!fd.get("rulePets");

    const rate = Number(fd.get("rate") || 0);
    const registrationNumber = fd.get("registrationNumber")?.toString()?.trim() || "";

    const subtitleFromLocation = [city, country].filter(Boolean).join(", ");
    const subtitle = subtitleFromLocation || homeName;

    const now = Date.now();
    const start = now + 24 * 60 * 60 * 1000;
    const end = now + 30 * 24 * 60 * 60 * 1000;

    const selectedAmenityIds = Object.entries(amenityChecks)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const builder = new PropertyBuilder()
      .addProperty({
        title: String(homeName ?? "").trim(),
        subtitle: String(subtitle ?? "").trim(),
        description: String(description ?? "").trim(),
        guestCapacity: Number.isFinite(guests) ? guests : 0,
        registrationNumber: String(registrationNumber ?? "").trim(),
        status: "ACTIVE",
        propertyType: "House",
        createdAt: now,
        updatedAt: now,
      })
      .addLocation({
        country,
        city,
        street,
        houseNumber,
        houseNumberExtension: "",
        postalCode,
      })
      .addPropertyType({
        type: "House",
        spaceType,
      })
      .addGeneralDetails([
        { detail: "Guests", value: Number(guests) },
        { detail: "Bedrooms", value: Number(bedrooms) },
        { detail: "Beds", value: Number(beds) },
        { detail: "Bathrooms", value: Number(bathrooms) },
      ])
      .addCheckIn({
        checkIn: { from: checkInMin, till: checkInMin },
        checkOut: { from: checkOutMin, till: checkOutMin },
      })
      .addPricing({ roomRate: rate, cleaning: 0, service: 0 })
      .addAmenities(selectedAmenityIds.map((id) => ({ id })))
      .addAvailability([{ availableStartDate: start, availableEndDate: end }])
      .addAvailabilityRestrictions([]);

    const rules = [];
    if (ruleSmoking) rules.push({ rule: "SmokingAllowed", value: false });
    if (ruleParties) rules.push({ rule: "Parties/EventsAllowed", value: false });
    if (rulePets) rules.push({ rule: "PetsAllowed", value: true });
    if (rules.length > 0) builder.addRules(rules);

    builder.propertyImages = imageData.map((img) => ({
      property_id: "",
      key: img.key,
      image: img.image,
    }));

    builder.propertyCheckIn = {
      property_id: "",
      checkIn: {
        from: minutesToHHMM(checkInMin),
        till: minutesToHHMM(checkInMin),
      },
      checkOut: {
        from: minutesToHHMM(checkOutMin),
        till: minutesToHHMM(checkOutMin),
      },
    };

    setSubmitting(true);
    try {
      await submitAccommodation(navigate, builder);
    } finally {
      setSubmitting(false);
    }
  };

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
          <input type="number" name="houseNumber" placeholder="No." min="0" required />
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
                  <label key={it.id} className="amenity-check">
                    <input
                      type="checkbox"
                      name="amenityItem"
                      value={it.id}
                      checked={!!amenityChecks[it.id]}
                      onChange={(ev) => onAmenityToggle(it.id, ev.target.checked)}
                    /> {it.label}
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
