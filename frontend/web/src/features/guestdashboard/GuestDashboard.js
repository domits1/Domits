import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";

import { confirmEmailChange } from "./emailSettings";
import { getGuestBookings, buildListingDetailsUrl } from "./services/bookingAPI";

import GuestInfoRow from "./components/GuestInfoRow";
import GuestFamilyRow from "./components/GuestFamilyRow";


import { placeholderImage, normalizeImageUrl } from "./utils/image";

import {
  isValidPhoneE164,
  parseFamilyString,
  formatFamilyLabel,
  splitBookingsByTime,
  getPropertyId,
  getArrivalDate,
  getDepartureDate,
  formatDate,
} from "./utils/guestDashboardUtils";

const GuestDashboard = () => {
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

  const [guestId, setGuestId] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [currentBookingImage, setCurrentBookingImage] = useState(placeholderImage);
  const [currentBookingTitle, setCurrentBookingTitle] = useState("Current booking");
  const [currentBookingCity, setCurrentBookingCity] = useState("");
  const [hostName, setHostName] = useState("—");
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState("");

  const startEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
    setIsVerifying(false);
    setAskPhoneVerify(false);
    setTemp((prev) => ({ ...prev, [field]: user[field] ?? "" }));
    if (field === "family") setFamilyCounts(parseFamilyString(user.family));
  };

  const cancelEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: false }));
    if (field === "email") {
      setIsVerifying(false);
      setVerificationCode("");
    }
    if (field === "phone") setAskPhoneVerify(false);
    if (field === "family") setFamilyCounts(parseFamilyString(user.family));
  };

  const onTempChange = (field, value) => setTemp((prev) => ({ ...prev, [field]: value }));

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

      const json = await resp.json().catch(() => ({}));

      if (resp.ok) {
        if (json.message === "Email update successful, please verify your new email.") {
          setIsVerifying(true);
        } else if (json.message === "This email address is already in use.") {
          alert(json.message);
        } else {
          alert("Email update response was unexpected. Please try again.");
        }
      } else {
        alert("Failed to update email. Please try again later.");
      }
    } catch {
      alert("An error occurred while updating the email.");
    }
  };

  const saveName = async () => {
    try {
      const userInfo = await Auth.currentAuthenticatedUser();
      const params = { userId: userInfo.username, newName: (temp.name || "").trim() };

      const resp = await fetch(
        "https://5imk8jy3hf.execute-api.eu-north-1.amazonaws.com/default/General-CustomerIAM-Production-Update-UserName",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        }
      );

      const json = await resp.json().catch(() => ({}));

      if (json.statusCode === 200) {
        setUser((prev) => ({ ...prev, name: temp.name }));
        cancelEdit("name");
      } else {
        alert("Could not update name.");
      }
    } catch {
      alert("An error occurred while updating the name.");
    }
  };

  const saveAddress = async () => {
    try {
      const authUser = await Auth.currentAuthenticatedUser();
      const newAddress = (temp.address || "").trim();
      const res = await Auth.updateUserAttributes(authUser, { address: newAddress });

      if (res === "SUCCESS") {
        setUser((prev) => ({ ...prev, address: newAddress }));
        cancelEdit("address");
      } else {
        alert("Could not update address.");
      }
    } catch {
      alert("Failed to update address. Make sure 'address' is enabled & writable in Cognito.");
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
      const res = await Auth.updateUserAttributes(authUser, { phone_number: newPhone });

      if (res === "SUCCESS") {
        setUser((prev) => ({ ...prev, phone: newPhone }));
        setAskPhoneVerify(true);
        try {
          await Auth.verifyCurrentUserAttribute("phone_number");
        } catch {}
        cancelEdit("phone");
      } else {
        alert("Could not update phone number.");
      }
    } catch {
      alert("Failed to update phone. Ensure 'phone_number' is enabled & writable in Cognito.");
    }
  };

  const saveFamily = async () => {
    try {
      const payload = formatFamilyLabel(familyCounts);
      try {
        const authUser = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(authUser, { "custom:family": payload });
      } catch {}
      setUser((prev) => ({ ...prev, family: payload }));
      cancelEdit("family");
    } catch {
      alert("Couldn't save family details.");
    }
  };

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
      const bookingData = await getGuestBookings(guestId);

      let normalizedBookings = [];
      if (Array.isArray(bookingData)) normalizedBookings = bookingData;
      else if (Array.isArray(bookingData?.data)) normalizedBookings = bookingData.data;
      else if (Array.isArray(bookingData?.response)) normalizedBookings = bookingData.response;
      else if (typeof bookingData?.body === "string") {
        try {
          const innerParsed = JSON.parse(bookingData.body);
          if (Array.isArray(innerParsed)) normalizedBookings = innerParsed;
          else if (Array.isArray(innerParsed?.response)) normalizedBookings = innerParsed.response;
        } catch {}
      }

      const paidBookings = normalizedBookings.filter(
        (b) => String(b?.status ?? b?.Status ?? "").toLowerCase() === "paid"
      );

      if (!paidBookings.length) return;

      const { currentBookings, upcomingBookings } = splitBookingsByTime(paidBookings);
      const selectedBooking = currentBookings[0] || upcomingBookings[0] || paidBookings[0];
      if (!selectedBooking) return;

      setCurrentBooking(selectedBooking);

      const bookingCity = selectedBooking?.city || selectedBooking?.location?.city || "Unknown city";
      setCurrentBookingCity(bookingCity);

      const propertyId = getPropertyId(selectedBooking);
      if (!propertyId) return;

      const resp = await fetch(buildListingDetailsUrl(propertyId));
      if (!resp.ok) return;

      const data = await resp.json().catch(() => ({}));
      const property = data.property || {};
      const images = Array.isArray(data.images) ? data.images : [];
      const location = data.location || {};
      const hostObj = data.host || data.hostInfo || property.host || property.hostInfo || null;

      const hostNameFromHost =
        hostObj?.name ||
        hostObj?.fullName ||
        (hostObj?.firstName && hostObj?.lastName ? `${hostObj.firstName} ${hostObj.lastName}` : null);

      const hostNameFromProperty =
        property.username && property.familyname
          ? `${String(property.username).trim()} ${String(property.familyname).trim()}`
          : (property.username && String(property.username).trim()) ||
            (property.familyname && String(property.familyname).trim()) ||
            null;

      const resolvedHostName =
        hostNameFromHost ||
        hostNameFromProperty ||
        data.hostName ||
        property.hostName ||
        selectedBooking?.hostName ||
        selectedBooking?.host_name ||
        selectedBooking?.host?.name ||
        selectedBooking?.host?.fullName ||
        property.hostId ||
        "—";

      setHostName(resolvedHostName);

      const title = property.title || property.name || `Property #${property.id || propertyId}`;
      setCurrentBookingTitle(title);

      const firstImageKey = images[0]?.key || null;
      setCurrentBookingImage(normalizeImageUrl(firstImageKey));

      const subtitle = property.subtitle || "";
      const cityFromLocation = location.city || null;
      const cityFromSubtitle = subtitle ? subtitle.split(",")[0].trim() : "";
      const city = cityFromLocation || cityFromSubtitle || "";
      setCurrentBookingCity(city || subtitle || bookingCity);
    } catch {
      setBookingError("Could not load your current booking.");
    } finally {
      setBookingLoading(false);
    }
  }, [guestId]);

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
            `${parsed.street_address || ""} ${parsed.postal_code || ""} ${parsed.locality || ""} ${
              parsed.country || ""
            }`.trim();
        } catch {}

        const familyAttr = attrs["custom:family"] || attrs["family"] || "2 adults - 2 kids";
        const parsedFamily = parseFamilyString(familyAttr);

        setUser({
          email: attrs.email ?? "",
          name: attrs.given_name ?? attrs.name ?? "",
          address: address ?? "",
          phone: attrs.phone_number ?? "",
          family: formatFamilyLabel(parsedFamily),
        });

        setFamilyCounts(parsedFamily);
      } catch {
        setBookingLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (guestId) fetchCurrentBooking();
  }, [guestId, fetchCurrentBooking]);

  return (
    <div className="guest-dashboard-shell">
      <div className="guest-dashboard-page-body">
        <h2>{user.name ? `${user.name} Dashboard` : "Dashboard"}</h2>

        <div className="guest-dashboard-dashboards">
          <div className="guest-dashboard-content">
            <div className="guest-dashboard-accomodation-side">
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
                  <h4 className="booking-details__title">{currentBookingTitle}</h4>

                  {bookingLoading && <div className="booking-details__host">Loading booking…</div>}

                  {!bookingLoading && !currentBooking && !bookingError && (
                    <div className="booking-details__host">You have no current or upcoming paid bookings.</div>
                  )}

                  {bookingError && <div className="booking-details__host error">{bookingError}</div>}

                  {currentBooking && !bookingLoading && (
                    <>
                      <div className="booking-details__host">Host: {hostName || "—"}</div>
                      <div className="booking-details__host">{currentBookingCity}</div>

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
                            {String(currentBooking?.status ?? currentBooking?.Status ?? "") || "—"}
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
                  <span className="messages-section__badge" aria-label="9+ unread">
                    9+
                  </span>
                </div>
                <a className="messages-section__cta" href="#">
                  <span>Go to message centre</span>
                  <span className="messages-section__icon" aria-hidden="true">
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

            <aside className="guest-dashboard-personalInfoContent">
              <div className="pi-card">
                <div className="pi-header">
                  <h3>Personal information</h3>
                </div>

                <div className="pi-list">
                  <GuestInfoRow
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

                  <GuestInfoRow
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

                  <GuestInfoRow
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

                  <GuestInfoRow
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

                  <GuestFamilyRow
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
                    We sent a code to your phone. If required, finish verification in your profile.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
