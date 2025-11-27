import React, { useMemo, useState, useEffect } from "react";
import "./adminproperty.scss";
import amenitiesList from "../../store/amenities";
import { PropertyBuilder } from "../../features/hostonboarding/stores/propertyBuilder";
import { submitAccommodation } from "../../features/hostonboarding/services/SubmitAccommodation";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import allFields from "./store/AllAdminPropertyFields";

export default function AdminProperty() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [imageData, setImageData] = useState([]);
  const [amenityChecks, setAmenityChecks] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSpecialUser, setIsSpecialUser] = useState(false);
  const [testProperty, setTestProperty] = useState(null);
  useEffect(() => {
    async function checkRole() {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const role = user?.attributes?.["custom:group"];

        if (role !== "Host") {
          navigate("/");
        }
      } catch (err) {
        navigate("/");
      }
    }

    checkRole();
  }, [navigate]);

  useEffect(() => {
    try {
      const SPECIAL_ID = process.env.REACT_APP_DEMO_TESTER_ID;
      const cognitoKey = "CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.LastAuthUser";
      const val = localStorage.getItem(cognitoKey);
      if (val && String(val).includes(SPECIAL_ID)) {
        setIsSpecialUser(true);
      } else {
        setIsSpecialUser(false);
      }
    } catch (e) {
      setIsSpecialUser(false);
    }
  }, []);

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

  const requiredFields = allFields;

  const validateField = (name, value) => {
    switch (name) {
      case "homeName":
        return value.trim().length >= 2 ? "" : "Home name must be at least 2 characters";
      case "street":
        return value.trim().length >= 2 ? "" : "Street is required";
      case "houseNumber": {
        const num = Number(value);
        return !isNaN(num) && num > 0 ? "" : "Valid house number is required";
      }
      case "postalCode":
        return value.trim().length >= 2 ? "" : "Postal code is required";
      case "city":
        return value.trim().length >= 2 ? "" : "City is required";
      case "country":
        return value.trim().length >= 2 ? "" : "Country is required";
      case "description":
        return value.trim().length >= 10 ? "" : "Description must be at least 10 characters";
      case "guests":
      case "bedrooms":
      case "beds":
      case "bathrooms": {
        const val = Number(value);
        return !isNaN(val) && val >= 0 ? "" : "Must be a valid number";
      }
      case "rate": {
        const rate = Number(value);
        return !isNaN(rate) && rate > 0 ? "" : "Rate must be greater than 0";
      }
      default:
        return "";
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
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

  const generateRegistrationNumber = () => {
    const ts = Date.now().toString();
    const rand = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, "0");
    return ts + rand;
  };

  const validateForm = (formData) => {
    const newErrors = {};

    requiredFields.forEach((field) => {
      const value = formData.get(field)?.toString()?.trim();
      if (!value) {
        newErrors[field] = "This field is required";
      }
    });

    const numericFields = ["guests", "bedrooms", "beds", "bathrooms", "houseNumber"];
    numericFields.forEach((field) => {
      const value = formData.get(field);
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        newErrors[field] = "Must be a valid number";
      }
    });

    const rate = Number(formData.get("rate") || 0);
    if (rate <= 0) {
      newErrors.rate = "Rate must be greater than 0";
    }

    if (imageData.length < 5) {
      newErrors.images = "Add at least 5 photos";
    }

    return newErrors;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const allFields = [
      "spaceType",
      "homeName",
      "street",
      "houseNumber",
      "postalCode",
      "city",
      "country",
      "description",
      "guests",
      "bedrooms",
      "beds",
      "bathrooms",
      "rate",
    ];
    const allTouched = allFields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    const fd = new FormData(e.currentTarget);
    const formErrors = validateForm(fd);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      alert("Please fix the errors before submitting.");
      return;
    }

    if (imageData.length < 5) {
      alert("Add at least 5 photos.");
      return;
    }

    const spaceTypeRaw = fd.get("spaceType")?.toString() || "Entire Space";
    const spaceType = SPACE_TYPE_MAP[spaceTypeRaw] || "Full house";

    const homeName = fd.get("homeName")?.toString()?.trim() || "";
    const street = fd.get("street")?.toString()?.trim() || "";
    const houseNumber = Number(fd.get("houseNumber") ?? 0);
    const postalCode = fd.get("postalCode")?.toString()?.trim() || "";
    const city = fd.get("city")?.toString()?.trim() || "";
    const country = fd.get("country")?.toString()?.trim() || "";
    const description = fd.get("description")?.toString()?.trim() || "";

    const isTestPropertyRaw = fd.get("testProperty");
    const isTest = isTestPropertyRaw === "true";

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
    const registrationNumber = generateRegistrationNumber();

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
        registrationNumber,
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
      .addAvailabilityRestrictions([])
      .addPropertyTestStatus({ isTest });

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
      try {
        const payload = builder.build ? builder.build() : builder;
        const sizeBytes = new Blob([JSON.stringify(payload)]).size;
      } catch {}

      await submitAccommodation(navigate, builder);
    } finally {
      setSubmitting(false);
    }
  };

  const hasError = (fieldName) => touched[fieldName] && errors[fieldName];

  return (
    <form className="adminproperty-form" onSubmit={onSubmit}>
      <div className="adminproperty-group">
        <label>What kind of space do your guests have access to</label>
        <div className="adminproperty-options">
          <label className="adminproperty-radio">
            <input type="radio" name="spaceType" value="Entire Space" required /> Entire Space
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="spaceType" value="Room" /> Room
          </label>
          <label className="adminproperty-radio">
            <input type="radio" name="spaceType" value="Shared Room" /> Shared Room
          </label>
        </div>
        {hasError("spaceType") && <span className="error-text">{errors.spaceType}</span>}
      </div>
      {isSpecialUser && (
        <div className="adminproperty-group">
          <label>Test property</label>
          <div className="field-wrapper">
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setTestProperty(true)}
                className={testProperty === true ? "test-yes active" : "test-yes"}>
                Ja
              </button>
              <button
                type="button"
                onClick={() => setTestProperty(false)}
                className={testProperty === false ? "test-no active" : "test-no"}>
                Nee
              </button>
            </div>
            <input
              type="hidden"
              name="testProperty"
              value={testProperty === true ? "true" : testProperty === false ? "false" : ""}
            />
          </div>
        </div>
      )}

      {!isSpecialUser && <input type="hidden" name="testProperty" value="false" />}

      <div className="adminproperty-group">
        <label>Name your home</label>
        <div className="field-wrapper">
          <input
            type="text"
            name="homeName"
            required
            onBlur={handleBlur}
            className={hasError("homeName") ? "error" : ""}
          />
          {hasError("homeName") && <span className="error-text">{errors.homeName}</span>}
        </div>
      </div>

      <div className="adminproperty-group">
        <label>Address</label>

        <div className="grid-2">
          <div className="field-wrapper">
            <input
              type="text"
              name="street"
              placeholder="Street"
              required
              onBlur={handleBlur}
              className={hasError("street") ? "error" : ""}
            />
            {hasError("street") && <span className="error-text">{errors.street}</span>}
          </div>

          <div className="field-wrapper">
            <input
              type="number"
              name="houseNumber"
              placeholder="No."
              min="0"
              required
              onBlur={handleBlur}
              className={hasError("houseNumber") ? "error" : ""}
            />
            {hasError("houseNumber") && <span className="error-text">{errors.houseNumber}</span>}
          </div>
        </div>

        <div className="grid-3">
          <div className="field-wrapper">
            <input
              type="text"
              name="postalCode"
              placeholder="Postal code"
              required
              onBlur={handleBlur}
              className={hasError("postalCode") ? "error" : ""}
            />
            {hasError("postalCode") && <span className="error-text">{errors.postalCode}</span>}
          </div>

          <div className="field-wrapper">
            <input
              type="text"
              name="city"
              placeholder="City"
              required
              onBlur={handleBlur}
              className={hasError("city") ? "error" : ""}
            />
            {hasError("city") && <span className="error-text">{errors.city}</span>}
          </div>

          <div className="field-wrapper">
            <input
              type="text"
              name="country"
              placeholder="Country"
              required
              onBlur={handleBlur}
              className={hasError("country") ? "error" : ""}
            />
            {hasError("country") && <span className="error-text">{errors.country}</span>}
          </div>
        </div>
      </div>

      <div className="adminproperty-group">
        <label>Provide a description</label>
        <div className="field-wrapper">
          <textarea
            name="description"
            rows={4}
            required
            onBlur={handleBlur}
            className={hasError("description") ? "error" : ""}
          />
          {hasError("description") && <span className="error-text">{errors.description}</span>}
        </div>
      </div>

      <div className="adminproperty-group">
        <label>How many people can stay here</label>
        <div className="grid-4">
          <div className="field-wrapper">
            <input
              type="number"
              name="guests"
              placeholder="Guests"
              min="0"
              required
              onBlur={handleBlur}
              className={hasError("guests") ? "error" : ""}
            />
            {hasError("guests") && <span className="error-text">{errors.guests}</span>}
          </div>

          <div className="field-wrapper">
            <input
              type="number"
              name="bedrooms"
              placeholder="Bedrooms"
              min="0"
              required
              onBlur={handleBlur}
              className={hasError("bedrooms") ? "error" : ""}
            />
            {hasError("bedrooms") && (
              <span className="error-text">{errors.bedrooms}</span>
            )}
          </div>

          <div className="field-wrapper">
            <input
              type="number"
              name="beds"
              placeholder="Beds"
              min="0"
              required
              onBlur={handleBlur}
              className={hasError("beds") ? "error" : ""}
            />
            {hasError("beds") && <span className="error-text">{errors.beds}</span>}
          </div>

          <div className="field-wrapper">
            <input
              type="number"
              name="bathrooms"
              placeholder="Bathrooms"
              min="0"
              required
              onBlur={handleBlur}
              className={hasError("bathrooms") ? "error" : ""}
            />
            {hasError("bathrooms") && (
              <span className="error-text">{errors.bathrooms}</span>
            )}
          </div>
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
                    />{" "}
                    {it.label}
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
          <label>
            Check in time
            <input type="time" name="checkIn" />
          </label>
          <label>
            Check out time
            <input type="time" name="checkOut" />
          </label>
        </div>
        <div className="adminproperty-options">
          <label className="adminproperty-radio">
            <input type="checkbox" name="ruleSmoking" /> No smoking
          </label>
          <label className="adminproperty-radio">
            <input type="checkbox" name="ruleParties" /> No parties or events
          </label>
          <label className="adminproperty-radio">
            <input type="checkbox" name="rulePets" /> Pets allowed
          </label>
        </div>
      </div>

      <input type="hidden" name="availability" value="As soon as possible" />

      <div className="adminproperty-group">
        <label>Add photos (min 5, max 10)</label>
        <p className="adminproperty-helper">Photos must be larger than 50 KB and smaller than 500 KB.</p>
        <input type="file" accept="image/*" multiple onChange={onPickFiles} />
        {hasError("images") && <span className="error-text">{errors.images}</span>}
        {files.length > 0 && (
          <div className="thumbs">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="thumb">
                <img src={URL.createObjectURL(f)} alt={`img-${i}`} />
                <button type="button" onClick={() => removeFile(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="adminproperty-group">
        <label>Set your rate</label>
        <div className="field-wrapper">
          <input
            type="number"
            name="rate"
            min="0"
            step="1"
            required
            onBlur={handleBlur}
            className={hasError("rate") ? "error" : ""}
          />
          {hasError("rate") && <span className="error-text">{errors.rate}</span>}
        </div>
      </div>

      <button type="submit" className="adminproperty-submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
