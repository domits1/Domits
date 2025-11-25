import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";

import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";

import { confirmEmailChange } from "./emailSettings";
import { getAccessToken } from "../../services/getAccessToken";
import dateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

const API_FETCH_BOOKINGS =
  "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest";
const API_LISTING_DETAILS_BASE =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails";

const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const placeholderImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='100%' height='100%' fill='%23eee'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-family='Arial' font-size='20'>No image</text></svg>";

const buildListingDetailsUrl = (propertyId) =>
  `${API_LISTING_DETAILS_BASE}?property=${encodeURIComponent(propertyId)}`;

const normalizeImageUrl = (maybeKeyOrUrl) => {
  if (!maybeKeyOrUrl) return placeholderImage;
  const val = String(maybeKeyOrUrl);
  if (val.startsWith("http")) return val;
  return `${S3_URL}${val.replace(/^\/+/, "")}`;
};

// ---------- Shared helpers ----------

const isValidPhoneE164 = (value) => /^\+[1-9]\d{7,14}$/.test(value || "");

const limitBetween = (value, min = 0, max = 20) =>
  Math.min(max, Math.max(min, value));

const parseFamilyString = (value = "") => {
  const match = String(value).match(
    /(\d+)\s*adult[s]?\s*-\s*(\d+)\s*kid[s]?/i
  );
  if (!match) return { adults: 0, kids: 0 };
  return {
    adults: Number(match[1] || 0),
    kids: Number(match[2] || 0),
  };
};

const formatFamilyLabel = ({ adults = 0, kids = 0 }) =>
  `${adults} adult${adults === 1 ? "" : "s"} - ${kids} kid${
    kids === 1 ? "" : "s"
  }`;

const toDate = (value) => {
  if (value == null) return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const milliseconds =
      String(Math.trunc(numericValue)).length <= 10
        ? numericValue * 1000
        : numericValue;
    const parsed = new Date(milliseconds);
    return isNaN(parsed) ? null : parsed;
  }

  const parsed = new Date(value);
  return isNaN(parsed) ? null : parsed;
};

const splitBookingsByTime = (bookingList) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);

  const currentBookings = [];
  const upcomingBookings = [];
  const pastBookings = [];

  bookingList.forEach((bookingItem) => {
    const arrivalDate =
      toDate(
        bookingItem?.arrivaldate ??
          bookingItem?.arrival_date ??
          bookingItem?.arrivalDate
      ) || null;

    const departureDate =
      toDate(
        bookingItem?.departuredate ??
          bookingItem?.departure_date ??
          bookingItem?.departureDate
      ) || null;

    if (!arrivalDate || !departureDate) {
      upcomingBookings.push(bookingItem);
      return;
    }

    const arrival = new Date(arrivalDate);
    arrival.setHours(0, 0, 0, 0);

    const departure = new Date(departureDate);
    departure.setHours(0, 0, 0, 0);

    if (departure < today) {
      pastBookings.push(bookingItem);
      return;
    }

    const isOngoing = arrival <= today && departure >= today;
    const startsThisWeek = arrival > today && arrival <= weekAhead;

    if (isOngoing || startsThisWeek) {
      currentBookings.push(bookingItem);
    } else if (arrival > weekAhead) {
      upcomingBookings.push(bookingItem);
    } else {
      upcomingBookings.push(bookingItem);
    }
  });

  return { currentBookings, upcomingBookings, pastBookings };
};

const getPropertyId = (b) =>
  b?.property_id ??
  b?.propertyId ??
  b?.PropertyID ??
  b?.id ??
  b?.ID ??
  null;

const getArrivalDate = (bookingItem) =>
  toDate(
    bookingItem?.arrivaldate ??
      bookingItem?.arrival_date ??
      bookingItem?.arrivalDate
  );

const getDepartureDate = (bookingItem) =>
  toDate(
    bookingItem?.departuredate ??
      bookingItem?.departure_date ??
      bookingItem?.departureDate
  );

// ---------- Row component (Email / Name / Address / Phone) ----------

const Row = ({
  label,
  field,
  type = "text",
  value,
  isEdit,
  tempValue,
  onTempChange,
  onSave,
  onStartEdit,
  onCancelEdit,
  isVerifying,
  verificationCode,
  setVerificationCode,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSave();
  };

  const renderInput = () => {
    if (!isEdit) {
      return (
        <span className="pi-value" title={value || "-"}>
          {value || "-"}
        </span>
      );
    }

    if (field === "email") {
      if (!isVerifying) {
        return (
          <input
            type="email"
            className="pi-input"
            value={tempValue ?? ""}
            onChange={(e) => onTempChange(field, e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        );
      }

      return (
        <input
          type="text"
          className="pi-input"
          placeholder="Verification code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      );
    }

    return (
      <input
        type={type}
        className="pi-input"
        value={tempValue ?? ""}
        onChange={(e) => onTempChange(field, e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  };

  return (
    <div className="pi-row">
      <div className="pi-left">
        <span className="pi-label">{label}</span>
        {renderInput()}
      </div>

      <div className="pi-right">
        {!isEdit ? (
          <button
            type="button"
            className="pi-action"
            onClick={() => onStartEdit(field)}
            aria-label={`Edit ${label}`}
          >
            <img src={editIcon} alt="" />
          </button>
        ) : (
          <div className="pi-actions">
            <button
              type="button"
              className="pi-action save"
              onClick={onSave}
              aria-label="Save"
            >
              <img src={checkIcon} alt="" />
            </button>
            <button
              type="button"
              className="pi-action cancel"
              onClick={() => onCancelEdit(field)}
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Family row ----------

const FamilyRow = ({
  userFamily,
  familyCounts,
  setFamilyCounts,
  isEdit,
  onStartEdit,
  onCancelEdit,
  onSave,
}) => {
  const increase = (key) =>
    setFamilyCounts((prev) => ({
      ...prev,
      [key]: limitBetween(prev[key] + 1),
    }));

  const decrease = (key) =>
    setFamilyCounts((prev) => ({
      ...prev,
      [key]: limitBetween(prev[key] - 1),
    }));

  return (
    <div className="pi-row">
      <div className="pi-left">
        <span className="pi-label">Family:</span>

        {!isEdit && (
          <span className="pi-value" title={userFamily || "-"}>
            {userFamily || "-"}
          </span>
        )}

        {isEdit && (
          <div className="booking-details__pi" style={{ display: "grid", gap: 8 }}>
            {/* Adults */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Adults</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("adults")}
                  aria-label="Decrease adults"
                >
                  −
                </button>
                <input
                  className="pi-input"
                  type="number"
                  min={0}
                  max={20}
                  value={familyCounts.adults}
                  onChange={(e) =>
                    setFamilyCounts((prev) => ({
                      ...prev,
                      adults: limitBetween(Number(e.target.value) || 0),
                    }))
                  }
                  style={{ width: 90 }}
                />
                <button
                  type="button"
                  className="pi-action"
                  onClick={() => increase("adults")}
                  aria-label="Increase adults"
                >
                  <img
                    src={checkIcon}
                    alt=""
                    style={{ visibility: "hidden" }}
                  />
                  <span
                    style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}
                  >
                    +
                  </span>
                </button>
              </div>
            </div>

            {/* Kids */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Kids</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("kids")}
                  aria-label="Decrease kids"
                >
                  −
                </button>
                <input
                  className="pi-input"
                  type="number"
                  min={0}
                  max={20}
                  value={familyCounts.kids}
                  onChange={(e) =>
                    setFamilyCounts((prev) => ({
                      ...prev,
                      kids: limitBetween(Number(e.target.value) || 0),
                    }))
                  }
                  style={{ width: 90 }}
                />
                <button
                  type="button"
                  className="pi-action"
                  onClick={() => increase("kids")}
                  aria-label="Increase kids"
                >
                  <img
                    src={checkIcon}
                    alt=""
                    style={{ visibility: "hidden" }}
                  />
                  <span
                    style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}
                  >
                    +
                  </span>
                </button>
              </div>
            </div>

            {/* Preview */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Preview</div>
              <div className="booking-details__value">
                {formatFamilyLabel(familyCounts)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pi-right">
        {!isEdit ? (
          <button
            type="button"
            className="pi-action"
            onClick={onStartEdit}
            aria-label="Edit Family"
          >
            <img src={editIcon} alt="" />
          </button>
        ) : (
          <div className="pi-actions">
            <button
              type="button"
              className="pi-action save"
              onClick={onSave}
              aria-label="Save"
            >
              <img src={checkIcon} alt="" />
            </button>
            <button
              type="button"
              className="pi-action cancel"
              onClick={onCancelEdit}
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Main: GuestDashboard ----------

const GuestDashboard = () => {
  // Personal info
  const [user, setUser] = useState({
    email: "",
    name: "",
    address: "",
    phone: "",
    family: "",
  });

  const [temp, setTemp] = useState({
    email: "",
    name: "",
    address: "",
    phone: "",
    family: "",
  });

  const [editing, setEditing] = useState({
    email: false,
    name: false,
    address: false,
    phone: false,
    family: false,
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [askPhoneVerify, setAskPhoneVerify] = useState(false);
  const [familyCounts, setFamilyCounts] = useState({ adults: 2, kids: 2 });

  // Booking-related state
  const [guestId, setGuestId] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [currentBookingImage, setCurrentBookingImage] =
    useState(placeholderImage);
  const [currentBookingTitle, setCurrentBookingTitle] =
    useState("Current booking");
  const [currentBookingCity, setCurrentBookingCity] = useState("");
  const [hostName, setHostName] = useState("—");
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");

  // ---- Edit handlers ----

  const startEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
    setIsVerifying(false);
    setAskPhoneVerify(false);

    setTemp((prev) => ({
      ...prev,
      [field]: user[field] ?? "",
    }));

    if (field === "family") {
      setFamilyCounts(parseFamilyString(user.family));
    }
  };

  const cancelEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: false }));

    if (field === "email") {
      setIsVerifying(false);
      setVerificationCode("");
    }

    if (field === "phone") {
      setAskPhoneVerify(false);
    }

    if (field === "family") {
      setFamilyCounts(parseFamilyString(user.family));
    }
  };

  const onTempChange = (field, value) => {
    setTemp((prev) => ({ ...prev, [field]: value }));
  };

  // ---- Save handlers ----

  const saveEmail = async () => {
    try {
      if (isVerifying) {
        const result = await confirmEmailChange(verificationCode);
        if (result.success) {
          setUser((prev) => ({ ...prev, email: temp.email }));
          cancelEdit("email");
        } else {
          alert("Incorrect verification code");
        }
        return;
      }

      const newEmail = (temp.email || "").trim();
      if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
        alert("Please provide a valid email address.");
        return;
      }

      const userInfo = await Auth.currentAuthenticatedUser();
      const params = { userId: userInfo.username, newEmail };

      const resp = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-CustomerIAM-Production-Update-UserEmail",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );

      const json = await resp.json();

      if (resp.ok) {
        if (
          json.message ===
          "Email update successful, please verify your new email."
        ) {
          setIsVerifying(true);
        } else if (json.message === "This email address is already in use.") {
          alert(json.message);
        } else {
          console.error("Unexpected:", json.message);
        }
      } else {
        alert("Failed to update email. Please try again later.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while updating the email.");
    }
  };

  const saveName = async () => {
    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const params = { userId: userInfo.username, newName: temp.name.trim() };

      const resp = await fetch(
        "https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );

      const json = await resp.json();

      if (json.statusCode === 200) {
        setUser((prev) => ({ ...prev, name: temp.name }));
        cancelEdit("name");
      } else {
        alert("Could not update name.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while updating the name.");
    }
  };

  const saveAddress = async () => {
    try {
      const authUser = await Auth.currentAuthenticatedUser();
      const newAddress = (temp.address || "").trim();
      const res = await Auth.updateUserAttributes(authUser, {
        address: newAddress,
      });

      if (res === "SUCCESS") {
        setUser((prev) => ({ ...prev, address: newAddress }));
        cancelEdit("address");
      } else {
        alert("Could not update address.");
      }
    } catch (e) {
      console.error("Update address error:", e);
      alert(
        "Failed to update address. Make sure 'address' is enabled & writable in Cognito."
      );
    }
  };

  const savePhone = async () => {
    try {
      const newPhone = (temp.phone || "").replace(/\s/g, "");

      if (!isValidPhoneE164(newPhone)) {
        alert("Phone must be in international format, e.g., +31612345678");
        return;
      }

      const authUser = await Auth.currentAuthenticatedUser();
      const res = await Auth.updateUserAttributes(authUser, {
        phone_number: newPhone,
      });

      if (res === "SUCCESS") {
        setUser((prev) => ({ ...prev, phone: newPhone }));
        setAskPhoneVerify(true);

        try {
          await Auth.verifyCurrentUserAttribute("phone_number");
        } catch {
          // ignore verification kick-off errors
        }

        cancelEdit("phone");
      } else {
        alert("Could not update phone number.");
      }
    } catch (e) {
      console.error("Update phone error:", e);
      alert(
        "Failed to update phone. Ensure 'phone_number' is enabled & writable in Cognito."
      );
    }
  };

  const saveFamily = async () => {
    try {
      const payload = formatFamilyLabel(familyCounts);

      try {
        const authUser = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(authUser, {
          "custom:family": payload,
        });
      } catch (e) {
        console.warn(
          "custom:family not writable/defined; keeping local only.",
          e
        );
      }

      setUser((prev) => ({ ...prev, family: payload }));
      cancelEdit("family");
    } catch (e) {
      console.error("saveFamily error:", e);
      alert("Couldn't save family details.");
    }
  };

  // ---- Fetch current booking (reusing GuestBooking logic) ----

  const fetchCurrentBooking = useCallback(async () => {
    if (!guestId) return;

    setBookingLoading(true);
    setBookingError("");
    setCurrentBooking(null);
    setCurrentBookingImage(placeholderImage);
    setHostName("—");
    setCurrentBookingTitle("Current booking");
    setCurrentBookingCity("");

    try {
      const requestUrl = new URL(API_FETCH_BOOKINGS);
      requestUrl.searchParams.set("guestId", guestId);

      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: await getAccessToken(),
        },
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "");
        throw new Error(
          `Fetch failed: ${response.status} ${response.statusText} ${responseText}`.trim()
        );
      }

      const rawData = await response.json().catch(async () => {
        const fallbackText = await response.text();
        try {
          return JSON.parse(fallbackText);
        } catch {
          return fallbackText;
        }
      });

      let normalizedBookings = [];
      if (Array.isArray(rawData)) normalizedBookings = rawData;
      else if (Array.isArray(rawData?.data)) normalizedBookings = rawData.data;
      else if (Array.isArray(rawData?.response))
        normalizedBookings = rawData.response;
      else if (typeof rawData?.body === "string") {
        try {
          const innerParsed = JSON.parse(rawData.body);
          if (Array.isArray(innerParsed)) normalizedBookings = innerParsed;
          else if (Array.isArray(innerParsed?.response))
            normalizedBookings = innerParsed.response;
        } catch {}
      }

      const paidBookings = normalizedBookings.filter(
        (b) =>
          String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
      );

      if (!paidBookings.length) {
        setBookingLoading(false);
        return;
      }

      const { currentBookings, upcomingBookings } =
        splitBookingsByTime(paidBookings);

      const selectedBooking =
        currentBookings[0] || upcomingBookings[0] || paidBookings[0];

      if (!selectedBooking) {
        setBookingLoading(false);
        return;
      }

      setCurrentBooking(selectedBooking);

      const bookingCity =
        selectedBooking?.city ||
        selectedBooking?.location?.city ||
        "Unknown city";
      setCurrentBookingCity(bookingCity);

      const propertyId = getPropertyId(selectedBooking);
      if (propertyId) {
        try {
          const resp = await fetch(buildListingDetailsUrl(propertyId));
          if (resp.ok) {
            const data = await resp.json().catch(() => ({}));
            const property = data.property || {};
            const images = Array.isArray(data.images) ? data.images : [];
            const location = data.location || {};

            const title =
              property.title ||
              property.name ||
              `Property #${property.id || propertyId}`;
            setCurrentBookingTitle(title);

            const firstImageKey = images[0]?.key || null;
            setCurrentBookingImage(normalizeImageUrl(firstImageKey));

            const subtitle = property.subtitle || "";
            const cityFromLocation = location.city || null;
            const cityFromSubtitle = subtitle
              ? subtitle.split(",")[0].trim()
              : "";
            const city = cityFromLocation || cityFromSubtitle || "";

            setCurrentBookingCity(city || subtitle || bookingCity);

            const host =
              property.hostName || property.hostId || "—";
            setHostName(host);
          }
        } catch (e) {
          console.warn("Could not load listing details for dashboard:", e);
        }
      }
    } catch (err) {
      console.error(err);
      setBookingError("Could not load your current booking.");
    } finally {
      setBookingLoading(false);
    }
  }, [guestId]);

  // ---- Init: load user info + guestId ----

  useEffect(() => {
    (async () => {
      try {
        const authUser = await Auth.currentAuthenticatedUser();
        const attrs = authUser.attributes || {};

        setGuestId(attrs.sub || null);

        let address = attrs.address || "";
        try {
          const parsed = JSON.parse(attrs.address);
          address =
            parsed.formatted ||
            parsed.street_address ||
            `${parsed.street_address || ""} ${parsed.postal_code || ""} ${
              parsed.locality || ""
            } ${parsed.country || ""}`.trim();
        } catch {
          // not JSON, keep as is
        }

        const familyAttr =
          attrs["custom:family"] || attrs["family"] || "2 adults - 2 kids";
        const parsedFamily = parseFamilyString(familyAttr);

        setUser({
          email: attrs.email ?? "",
          name: attrs.given_name ?? attrs.name ?? "",
          address: address ?? "",
          phone: attrs.phone_number ?? "",
          family: formatFamilyLabel(parsedFamily),
        });

        setFamilyCounts(parsedFamily);
      } catch (e) {
        console.error("Error fetching user data:", e);
        setBookingLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (guestId) fetchCurrentBooking();
  }, [guestId, fetchCurrentBooking]);

  const formatDate = (d) => {
    if (!d) return "-";
    return dateFormatterDD_MM_YYYY(d);
  };
useEffect(() => {
  async function testApi() {
    try {
      const resp = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=9882a79e-3420-42f3-ac3a-b37445264c89"
      );

      const data = await resp.json();
      console.log("LISTING DETAILS API RESPONSE:", data);
    } catch (e) {
      console.error("API TEST ERROR:", e);
    }
  }

  testApi();
}, []);

  return (
    <div className="guest-dashboard-page-body">
      <h2>{user.name ? `${user.name} Dashboard` : "Dashboard"}</h2>

      <div className="guest-dashboard-dashboards">
        <div className="guest-dashboard-content">
          {/* LEFT SIDE: current booking + messages */}
          <div className="guest-dashboard-accomodation-side">
            <Link to="/Bookings" className="guest-dashboard-viewAllBooking">
              View all bookings
            </Link>

            <article className="booking-details">
              <div className="booking-details__media">
                <img
                  className="booking-details__image"
                  src={currentBookingImage}
                  alt={currentBookingTitle}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = placeholderImage;
                  }}
                />
              </div>

              <div className="booking-details__content">
                <h4 className="booking-details__title">
                  {currentBookingTitle}
                </h4>

                {bookingLoading && (
                  <div className="booking-details__host">Loading booking…</div>
                )}

                {!bookingLoading && !currentBooking && !bookingError && (
                  <div className="booking-details__host">
                    You have no current or upcoming paid bookings.
                  </div>
                )}

                {bookingError && (
                  <div className="booking-details__host error">
                    {bookingError}
                  </div>
                )}

                {currentBooking && !bookingLoading && (
                  <>
                    <div className="booking-details__host">
                      Host: {hostName || "—"}
                    </div>
                    <div className="booking-details__host">
                      {currentBookingCity}
                    </div>

                    <div className="booking-details__pi">
                      <div className="booking-details__row">
                        <div className="booking-details__label">Check-in</div>
                        <div className="booking-details__value">
                          {formatDate(getArrivalDate(currentBooking))}
                        </div>
                      </div>
                      <div className="booking-details__row">
                        <div className="booking-details__label">Check-out</div>
                        <div className="booking-details__value">
                          {formatDate(getDepartureDate(currentBooking))}
                        </div>
                      </div>
                      <div className="booking-details__row">
                        <div className="booking-details__label">Status</div>
                        <div className="booking-details__value">
                          {String(
                            currentBooking?.status ??
                              currentBooking?.Status ??
                              ""
                          ) || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="booking-details__actions">
                      <Link to="/Bookings" className="btn">
                        Manage
                      </Link>
                      <button className="btn btn--ghost" type="button">
                        Invoice
                      </button>
                    </div>
                  </>
                )}
              </div>
            </article>

            <section className="messages-section">
              <div className="messages-section__header">
                <span className="messages-section__title">Messages</span>
                <span
                  className="messages-section__badge"
                  aria-label="9+ unread"
                >
                  9+
                </span>
              </div>
              <a className="messages-section__cta" href="#">
                <span>Go to message centre</span>
                <span
                  className="messages-section__icon"
                  aria-hidden="true"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a4 4 0 0 1-4 4H8l-4 4v-8a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h13a4 4 0 0 1 4 4z" />
                  </svg>
                </span>
              </a>
            </section>
          </div>

          {/* RIGHT SIDE: personal info */}
          <aside className="guest-dashboard-personalInfoContent">
            <div className="pi-card">
              <div className="pi-header">
                <h3>Personal information</h3>
              </div>

              <div className="pi-list">
                <Row
                  label="Email:"
                  field="email"
                  type="email"
                  value={user.email}
                  tempValue={temp.email}
                  isEdit={editing.email}
                  onTempChange={onTempChange}
                  onSave={saveEmail}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  isVerifying={isVerifying}
                  verificationCode={verificationCode}
                  setVerificationCode={setVerificationCode}
                />

                <Row
                  label="Name:"
                  field="name"
                  type="text"
                  value={user.name}
                  tempValue={temp.name}
                  isEdit={editing.name}
                  onTempChange={onTempChange}
                  onSave={saveName}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                />

                <Row
                  label="Address:"
                  field="address"
                  type="text"
                  value={user.address}
                  tempValue={temp.address}
                  isEdit={editing.address}
                  onTempChange={onTempChange}
                  onSave={saveAddress}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                />

                <Row
                  label="Phone:"
                  field="phone"
                  type="tel"
                  value={user.phone}
                  tempValue={temp.phone}
                  isEdit={editing.phone}
                  onTempChange={onTempChange}
                  onSave={savePhone}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                />

                <FamilyRow
                  userFamily={user.family}
                  familyCounts={familyCounts}
                  setFamilyCounts={setFamilyCounts}
                  isEdit={editing.family}
                  onStartEdit={() => startEdit("family")}
                  onCancelEdit={() => cancelEdit("family")}
                  onSave={saveFamily}
                />
              </div>

              {askPhoneVerify && (
                <p className="pi-hint">
                  We sent a code to your phone. If required, finish verification
                  in your profile.
                </p>
              )}
            </div>
          </aside>
        </div>
        
      </div>
    </div>
  );
};

export default GuestDashboard;
