import React, { useEffect, useState } from "react";
import editIcon from "../../images/icons/edit-05.png";
import checkIcon from "../../images/icons/checkPng.png";
import { Auth } from "aws-amplify";
import { confirmEmailChange } from "./emailSettings";
import roomImg from "../../images/4-Bed-Kona-Homes.jpeg";
import { Link } from "react-router-dom";

//const navigate = useNavigate();


const isE164 = (v) => /^\+[1-9]\d{7,14}$/.test(v || "");
const clamp = (n, min = 0, max = 20) => Math.min(max, Math.max(min, n));

const parseFamily = (s = "") => {
  const m = String(s).match(/(\d+)\s*adult[s]?\s*-\s*(\d+)\s*kid[s]?/i);
  if (!m) return { adults: 0, kids: 0 };
  return { adults: Number(m[1] || 0), kids: Number(m[2] || 0) };
};

const formatFamily = ({ adults = 0, kids = 0 }) =>
  `${adults} adult${adults === 1 ? "" : "s"} - ${kids} kid${kids === 1 ? "" : "s"}`;

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

  const [hostName, setHostName] = useState("Jhon");
  const [loadingHost, setLoadingHost] = useState(false);

  const startEdit = (field) => {
    setEditing((e) => ({ ...e, [field]: true }));
    setIsVerifying(false);
    setAskPhoneVerify(false);
    setTemp((t) => ({ ...t, [field]: user[field] ?? "" }));
    if (field === "family") {
      setFamilyCounts(parseFamily(user.family));
    }
  };

  const cancelEdit = (field) => {
    setEditing((e) => ({ ...e, [field]: false }));
    if (field === "email") {
      setIsVerifying(false);
      setVerificationCode("");
    }
    if (field === "phone") setAskPhoneVerify(false);
  };

  const onTempChange = (field, value) => {
    setTemp((t) => ({ ...t, [field]: value }));
  };

  /* ---------- EMAIL ---------- */
  const saveEmail = async () => {
    try {
      if (isVerifying) {
        const result = await confirmEmailChange(verificationCode);
        if (result.success) {
          setUser((u) => ({ ...u, email: temp.email }));
          cancelEdit("email");
        } else {
          alert("Incorrect verification code");
        }
        return;
      }

      const newEmail = temp.email.trim();
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
        if (json.message === "Email update successful, please verify your new email.") {
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

  /* ---------- NAME ---------- */
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
        setUser((u) => ({ ...u, name: temp.name }));
        cancelEdit("name");
      } else {
        alert("Could not update name.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while updating the name.");
    }
  };

  /* ---------- ADDRESS ---------- */
  const saveAddress = async () => {
    try {
      const u = await Auth.currentAuthenticatedUser();
      const newAddress = (temp.address || "").trim();
      const res = await Auth.updateUserAttributes(u, { address: newAddress });
      if (res === "SUCCESS") {
        setUser((x) => ({ ...x, address: newAddress }));
        cancelEdit("address");
      } else {
        alert("Could not update address.");
      }
    } catch (e) {
      console.error("Update address error:", e);
      alert("Failed to update address. Make sure 'address' is enabled & writable in Cognito.");
    }
  };

  /* ---------- PHONE (E.164) ---------- */
  const savePhone = async () => {
    try {
      const newPhone = (temp.phone || "").replace(/\s/g, "");
      if (!isE164(newPhone)) {
        alert("Phone must be in international format, e.g., +31612345678");
        return;
      }
      const u = await Auth.currentAuthenticatedUser();
      const res = await Auth.updateUserAttributes(u, { phone_number: newPhone });
      if (res === "SUCCESS") {
        setUser((x) => ({ ...x, phone: newPhone }));
        setAskPhoneVerify(true);
        try {
          await Auth.verifyCurrentUserAttribute("phone_number");
        } catch {
          
        }
        cancelEdit("phone");
      } else {
        alert("Could not update phone number.");
      }
    } catch (e) {
      console.error("Update phone error:", e);
      alert("Failed to update phone. Ensure 'phone_number' is enabled & writable in Cognito.");
    }
  };

  /* ---------- FAMILY (Adults/Kids ±) ---------- */
  const saveFamily = async () => {
    try {
      const payload = formatFamily(familyCounts);

      try {
        const u = await Auth.currentAuthenticatedUser();
        await Auth.updateUserAttributes(u, { "custom:family": payload });
      } catch (e) {
        
        console.warn("custom:family not writable/defined; keeping local only.", e);
      }

      setUser((u) => ({ ...u, family: payload }));
      cancelEdit("family");
    } catch (e) {
      console.error("saveFamily error:", e);
      alert("Couldn't save family details.");
    }
  };

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      try {
        const u = await Auth.currentAuthenticatedUser();
        const a = u.attributes || {};

        let addr = a.address || "";
        try {
          const parsed = JSON.parse(a.address);
          addr =
            parsed.formatted ||
            parsed.street_address ||
            `${parsed.street_address || ""} ${parsed.postal_code || ""} ${parsed.locality || ""} ${parsed.country || ""}`.trim();
        } catch {
          
        }

        const famAttr = a["custom:family"] || a["family"] || "2 adults - 2 kids";
        const famParsed = parseFamily(famAttr);

        setUser({
          email: a.email ?? "",
          name: a.given_name ?? a.name ?? "",
          address: addr ?? "",
          phone: a.phone_number ?? "",
          family: formatFamily(famParsed),
        });
        setFamilyCounts(famParsed);

        // (Optional) Load host name from API
        // setLoadingHost(true);
        // const session = await Auth.currentSession();
        // const token = session.getIdToken().getJwtToken();
        // const resp = await fetch(`https://api.example.com/bookings/current?userId=${encodeURIComponent(u.username)}`, {
        //   headers: { "Content-Type": "application/json", Authorization: token },
        // });
        // if (resp.ok) {
        //   const json = await resp.json();
        //   setHostName(json.hostName || "");
        // }
      } catch (e) {
        console.error("Error fetching user data:", e);
      } finally {
        setLoadingHost(false);
      }
    })();
  }, []);

  /* ---------- UI Rows ---------- */
  const Row = ({ label, field, type = "text", value, onSave }) => {
    const isEdit = editing[field];
    return (
      <div className="pi-row">
        <div className="pi-left">
          <span className="pi-label">{label}</span>
          {!isEdit && <span className="pi-value" title={value || "-"}>{value || "-"}</span>}

          {isEdit && field !== "email" && field !== "family" && (
            <input
              type={type}
              className="pi-input"
              value={temp[field] ?? ""}
              onChange={(e) => onTempChange(field, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSave()}
              autoFocus
            />
          )}

          {isEdit && field === "email" && (
            <>
              {!isVerifying ? (
                <input
                  type="email"
                  className="pi-input"
                  value={temp.email ?? ""}
                  onChange={(e) => onTempChange("email", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSave()}
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  className="pi-input"
                  placeholder="Verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSave()}
                  autoFocus
                />
              )}
            </>
          )}
        </div>

        <div className="pi-right">
          {!isEdit ? (
            <button type="button" className="pi-action" onClick={() => startEdit(field)} aria-label={`Edit ${label}`}>
              <img src={editIcon} alt="" />
            </button>
          ) : (
            <div className="pi-actions">
              <button type="button" className="pi-action save" onClick={onSave} aria-label="Save">
                <img src={checkIcon} alt="" />
              </button>
              <button type="button" className="pi-action cancel" onClick={() => cancelEdit(field)} aria-label="Cancel">
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FamilyRow = () => {
    const isEdit = editing.family;

    const inc = (key) => setFamilyCounts((c) => ({ ...c, [key]: clamp(c[key] + 1) }));
    const dec = (key) => setFamilyCounts((c) => ({ ...c, [key]: clamp(c[key] - 1) }));

    return (
      <div className="pi-row">
        <div className="pi-left">
          <span className="pi-label">Family:</span>

          {!isEdit && (
            <span className="pi-value" title={user.family || "-"}>
              {user.family || "-"}
            </span>
          )}

          {isEdit && (
            <div className="booking-details__pi" style={{ display: "grid", gap: 8 }}>
              {/* Adults */}
              <div className="booking-details__row" style={{ gridTemplateColumns: "140px auto" }}>
                <div className="booking-details__label">Adults</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="pi-action cancel"
                    onClick={() => dec("adults")}
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
                      setFamilyCounts((c) => ({ ...c, adults: clamp(Number(e.target.value) || 0) }))
                    }
                    style={{ width: 90 }}
                  />
                  <button
                    type="button"
                    className="pi-action"
                    onClick={() => inc("adults")}
                    aria-label="Increase adults"
                  >
                    <img src={checkIcon} alt="" style={{ visibility: "hidden" }} />
                    <span style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}>+</span>
                  </button>
                </div>
              </div>

              {/* Kids */}
              <div className="booking-details__row" style={{ gridTemplateColumns: "140px auto" }}>
                <div className="booking-details__label">Kids</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="pi-action cancel"
                    onClick={() => dec("kids")}
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
                      setFamilyCounts((c) => ({ ...c, kids: clamp(Number(e.target.value) || 0) }))
                    }
                    style={{ width: 90 }}
                  />
                  <button
                    type="button"
                    className="pi-action"
                    onClick={() => inc("kids")}
                    aria-label="Increase kids"
                  >
                    <img src={checkIcon} alt="" style={{ visibility: "hidden" }} />
                    <span style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}>+</span>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="booking-details__row" style={{ gridTemplateColumns: "140px auto" }}>
                <div className="booking-details__label">Preview</div>
                <div className="booking-details__value">{formatFamily(familyCounts)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="pi-right">
          {!isEdit ? (
            <button
              type="button"
              className="pi-action"
              onClick={() => setEditing((e) => ({ ...e, family: true }))}
              aria-label="Edit Family"
            >
              <img src={editIcon} alt="" />
            </button>
          ) : (
            <div className="pi-actions">
              <button type="button" className="pi-action save" onClick={saveFamily} aria-label="Save">
                <img src={checkIcon} alt="" />
              </button>
              <button
                type="button"
                className="pi-action cancel"
                onClick={() => {
                  setFamilyCounts(parseFamily(user.family));
                  setEditing((e) => ({ ...e, family: false }));
                }}
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

  return (
    <div className="guest-dashboard-page-body">
      <h2>{user.name ? `${user.name} Dashboard` : "Dashboard"}</h2>

      <div className="guest-dashboard-dashboards">
        <div className="guest-dashboard-content">
        
          <div className="guest-dashboard-accomodation-side">
           
              {/* <a className="guest-dashboard-viewAllBooking" href={onClick={navigate("/Booking")}}>
                View all bookings
              </a> */}
              <Link to="/Bookings" className="guest-dashboard-viewAllBooking">
                View all bookings
              </Link>

            <article className="booking-details">
              <div className="booking-details__media">
                <img
                  className="booking-details__image"
                  src={roomImg}
                  alt="4-Bed Kona Homes"
                  loading="lazy"
                />
              </div>

              <div className="booking-details__content">
                <h4 className="booking-details__title">Current booking</h4>
                <div className="booking-details__host">
                  Host name: {loadingHost ? "Loading…" : hostName || "—"}
                </div>
                
                <div className="booking-details__pi">
                  <div className="booking-details__row">
                    <div className="booking-details__label">Check-in</div>
                    <div className="booking-details__value">12 Oct 2025</div>
                  </div>
                  <div className="booking-details__row">
                    <div className="booking-details__label">Check-out</div>
                    <div className="booking-details__value">15 Oct 2025</div>
                  </div>
                  <div className="booking-details__row">
                    <div className="booking-details__label">Guests</div>
                    <div className="booking-details__value">{user.family || "-"}</div>
                  </div>
                </div>

                <div className="booking-details__actions">
                  <button className="btn" type="button">
                    Manage
                  </button>
                  <button className="btn btn--ghost" type="button">
                    Invoice
                  </button>
                </div>
              </div>
            </article>

            {/* Messages */}
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

          {/* Personal information */}
          <aside className="guest-dashboard-personalInfoContent">
            <div className="pi-card">
              <div className="pi-header">
                <h3>Personal information</h3>
              </div>

              <div className="pi-list">
                <Row label="Email:" field="email" type="email" value={user.email} onSave={saveEmail} />
                <Row label="Name:" field="name" type="text" value={user.name} onSave={saveName} />
                <Row
                  label="Address:"
                  field="address"
                  type="text"
                  value={user.address}
                  onSave={saveAddress}
                />
                <Row label="Phone:" field="phone" type="tel" value={user.phone} onSave={savePhone} />
                <FamilyRow />
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
    
  );
};

export default GuestDashboard;
