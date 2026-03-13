import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Auth } from "aws-amplify";

import { confirmEmailChange } from "./emailSettings";
import { getGuestBookings, buildListingDetailsUrl } from "./services/bookingAPI";

import GuestInfoRow from "./components/GuestInfoRow";
import GuestFamilyRow from "./components/GuestFamilyRow";

import { placeholderImage } from "./utils/image";
import { resolvePrimaryAccommodationImageUrl } from "../../utils/accommodationImage";

import {
  isValidPhoneE164,
  parseFamilyString,
  formatFamilyLabel,
  getCurrentOrUpcomingBooking,
  getPropertyId,
  getArrivalDate,
  getDepartureDate,
  formatDate,
  resolveHostName,
  resolveSubtitleCity,
} from "./utils/guestDashboardUtils";

const EMAIL_UPDATE_SUCCESS_MESSAGE = "Email update successful, please verify your new email.";
const EMAIL_IN_USE_MESSAGE = "This email address is already in use.";

const resolveAddressAttribute = (rawAddress = "") => {
  let address = rawAddress || "";

  try {
    const parsed = JSON.parse(rawAddress);
    address =
      parsed.formatted ||
      parsed.street_address ||
      `${parsed.street_address || ""} ${parsed.postal_code || ""} ${parsed.locality || ""} ${
        parsed.country || ""
      }`.trim();
  } catch {}

  return address;
};

const isValidEmailAddress = (email = "") => /\S+@\S+\.\S+/.test(email);

const requestEmailUpdate = async (userId, newEmail) => {
  const response = await fetch(
    "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-CustomerIAM-Production-Update-UserEmail",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newEmail }),
    }
  );

  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const getEmailUpdateErrorMessage = (responseOk, message) => {
  if (!responseOk) {
    return "Failed to update email. Please try again later.";
  }
  if (message === EMAIL_IN_USE_MESSAGE) {
    return message;
  }
  if (message !== EMAIL_UPDATE_SUCCESS_MESSAGE) {
    return "Email update response was unexpected. Please try again.";
  }
  return "";
};

const buildCurrentBookingSummary = async (guestId) => {
  const selectedBooking = getCurrentOrUpcomingBooking(await getGuestBookings(guestId));

  if (!selectedBooking) {
    return {
      booking: null,
      image: placeholderImage,
      title: "Current booking",
      city: "",
      hostName: "-",
    };
  }

  const bookingCity = selectedBooking?.city || selectedBooking?.location?.city || "Unknown city";
  const propertyId = getPropertyId(selectedBooking);

  if (!propertyId) {
    return {
      booking: selectedBooking,
      image: placeholderImage,
      title: "Current booking",
      city: bookingCity,
      hostName: resolveHostName(
        selectedBooking?.hostName,
        selectedBooking?.host_name,
        selectedBooking?.host?.name,
        selectedBooking?.host?.fullName
      ),
    };
  }

  const response = await fetch(buildListingDetailsUrl(propertyId));
  if (!response.ok) {
    return {
      booking: selectedBooking,
      image: placeholderImage,
      title: `Property #${propertyId}`,
      city: bookingCity,
      hostName: resolveHostName(
        selectedBooking?.hostName,
        selectedBooking?.host_name,
        selectedBooking?.host?.name,
        selectedBooking?.host?.fullName
      ),
    };
  }

  const data = await response.json().catch(() => ({}));
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

  const subtitle = property.subtitle || "";
  const cityFromLocation = location.city || null;
  const cityFromSubtitle = resolveSubtitleCity(subtitle);

  return {
    booking: selectedBooking,
    image: resolvePrimaryAccommodationImageUrl(images, "thumb"),
    title: property.title || property.name || `Property #${property.id || propertyId}`,
    city: cityFromLocation || cityFromSubtitle || subtitle || bookingCity,
    hostName: resolveHostName(
      hostNameFromHost,
      hostNameFromProperty,
      data.hostName,
      property.hostName,
      selectedBooking?.hostName,
      selectedBooking?.host_name,
      selectedBooking?.host?.name,
      selectedBooking?.host?.fullName,
      property.hostId
    ),
  };
};

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
  const [hostName, setHostName] = useState("-");
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
      if (!newEmail || !isValidEmailAddress(newEmail)) {
        alert("Please provide a valid email address.");
        return;
      }

      const userInfo = await Auth.currentAuthenticatedUser();
      const { response, json } = await requestEmailUpdate(userInfo.username, newEmail);
      const errorMessage = getEmailUpdateErrorMessage(response.ok, json.message);

      if (errorMessage) {
        alert(errorMessage);
        return;
      }

      setIsVerifying(true);
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
      const newPhone = (temp.phone || "").replaceAll(/\s/g, "");
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
    setHostName("-");
    setCurrentBookingTitle("Current booking");
    setCurrentBookingCity("");

    try {
      const summary = await buildCurrentBookingSummary(guestId);
      setCurrentBooking(summary.booking);
      setCurrentBookingImage(summary.image);
      setCurrentBookingTitle(summary.title);
      setCurrentBookingCity(summary.city);
      setHostName(summary.hostName);
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

        const familyAttr = attrs["custom:family"] || attrs.family || "2 adults - 2 kids";
        const parsedFamily = parseFamilyString(familyAttr);

        setUser({
          email: attrs.email ?? "",
          name: attrs.given_name ?? attrs.name ?? "",
          address: resolveAddressAttribute(attrs.address),
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

                  {bookingLoading && <div className="booking-details__host">Loading booking...</div>}

                  {!bookingLoading && !currentBooking && !bookingError && (
                    <div className="booking-details__host">You have no current or upcoming paid bookings.</div>
                  )}

                  {bookingError && <div className="booking-details__host error">{bookingError}</div>}

                  {currentBooking && !bookingLoading && (
                    <>
                      <div className="booking-details__host">Host: {hostName || "-"}</div>
                      <div className="booking-details__host">{currentBookingCity}</div>

                      <div className="booking-details__pi">
                        <div className="booking-details__row">
                          <div className="booking-details__label">Check-in</div>
                          <div className="booking-details__value">{formatDate(getArrivalDate(currentBooking))}</div>
                        </div>
                        <div className="booking-details__row">
                          <div className="booking-details__label">Check-out</div>
                          <div className="booking-details__value">{formatDate(getDepartureDate(currentBooking))}</div>
                        </div>
                        <div className="booking-details__row">
                          <div className="booking-details__label">Status</div>
                          <div className="booking-details__value">
                            {String(currentBooking?.status ?? currentBooking?.Status ?? "") || "-"}
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
                <Link className="messages-section__cta" to="/guestdashboard/messages">
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
                </Link>
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
