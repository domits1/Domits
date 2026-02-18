import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "./HostProperty.module.css";

const PROPERTY_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
const TABS = ["Overview", "Photos", "Amenities", "Pricing", "Availability", "Policies"];
const SPACE_TYPE_OPTIONS = ["Entire house", "Private room", "Shared room"];
const MAX_CAPACITY_VALUE = 99;

export default function HostProperty() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const propertyId = params.get("ID");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("INACTIVE");
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [hostProperties, setHostProperties] = useState([]);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
  });
  const [capacity, setCapacity] = useState({
    propertyType: "",
    guests: 0,
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
  });
  const [address, setAddress] = useState({
    street: "",
    houseNumber: "",
    postalCode: "",
    city: "",
    country: "",
  });

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("Missing property ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const [response, hostPropertiesResponse] = await Promise.all([
          fetch(`${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`, {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }),
          fetch(`${PROPERTY_API_BASE}/hostDashboard/all`, {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }),
        ]);

        if (!response.ok) {
          throw new Error("Failed to fetch property.");
        }

        const data = await response.json();
        let hostPropertiesData = [];
        if (hostPropertiesResponse.ok) {
          hostPropertiesData = await hostPropertiesResponse.json();
        }
        const property = data?.property || {};
        const generalDetails = Array.isArray(data?.generalDetails) ? data.generalDetails : [];
        const locationData = data?.location || {};
        const propertyType = data?.propertyType || {};
        const houseNumberRaw = locationData.houseNumber ?? locationData.housenumber ?? "";
        const houseNumberExtension = locationData.houseNumberExtension ?? locationData.housenumberextension ?? "";
        const houseNumber = houseNumberRaw !== "" ? `${houseNumberRaw}${houseNumberExtension ? ` ${houseNumberExtension}` : ""}` : "";

        const findDetailValue = (key) => {
          const detail = generalDetails.find((item) => item?.detail === key);
          if (!detail) {
            return 0;
          }
          const value = Number(detail.value);
          return Number.isFinite(value) ? value : 0;
        };

        setStatus(property.status || "INACTIVE");
        setForm({
          title: property.title || "",
          subtitle: property.subtitle || "",
          description: property.description || "",
        });
        setCapacity({
          propertyType: propertyType.spaceType || "",
          guests: findDetailValue("Guests"),
          bedrooms: findDetailValue("Bedrooms"),
          beds: findDetailValue("Beds"),
          bathrooms: findDetailValue("Bathrooms"),
        });
        setAddress({
          street: locationData.street || "",
          houseNumber: houseNumber,
          postalCode: locationData.postalCode || locationData.postalcode || "",
          city: locationData.city || "",
          country: locationData.country || "",
        });

        const mappedHostProperties = (Array.isArray(hostPropertiesData) ? hostPropertiesData : [])
          .map((accommodation) => ({
            id: accommodation?.property?.id || "",
            title: accommodation?.property?.title || "Untitled listing",
            status: accommodation?.property?.status || "INACTIVE",
          }))
          .filter((accommodation) => accommodation.id);

        if (property?.id && !mappedHostProperties.find((accommodation) => accommodation.id === property.id)) {
          mappedHostProperties.unshift({
            id: property.id,
            title: property.title || "Untitled listing",
            status: property.status || "INACTIVE",
          });
        }

        setHostProperties(mappedHostProperties);
      } catch (err) {
        console.error(err);
        setError("Could not load property details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const updateAddressField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const normalizeCapacityValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(MAX_CAPACITY_VALUE, Math.trunc(numeric)));
  };

  const updateCapacityField = (field, value) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(value) }));
  };

  const adjustCapacityField = (field, delta) => {
    setCapacity((prev) => ({ ...prev, [field]: normalizeCapacityValue(prev[field] + delta) }));
  };

  const parseHouseNumber = (houseNumberInput) => {
    const value = String(houseNumberInput || "").trim();
    if (!value) {
      return null;
    }
    const match = value.match(/^(\d+)\s*(.*)$/);
    if (!match) {
      return null;
    }
    const parsedHouseNumber = Number(match[1]);
    if (!Number.isFinite(parsedHouseNumber)) {
      return null;
    }
    return {
      houseNumber: parsedHouseNumber,
      houseNumberExtension: (match[2] || "").trim(),
    };
  };

  const getLocationPayload = () => {
    const street = address.street.trim();
    const houseNumber = address.houseNumber.trim();
    const postalCode = address.postalCode.trim();
    const city = address.city.trim();
    const country = address.country.trim();

    if (!street || !houseNumber || !postalCode || !city || !country) {
      return undefined;
    }

    const parsedHouseNumber = parseHouseNumber(houseNumber);
    if (!parsedHouseNumber) {
      return undefined;
    }

    return {
      street,
      houseNumber: parsedHouseNumber.houseNumber,
      houseNumberExtension: parsedHouseNumber.houseNumberExtension,
      postalCode,
      city,
      country,
    };
  };

  const saveOverview = async () => {
    const normalizedTitle = form.title.trim();
    const normalizedSubtitle = form.subtitle.trim();
    const normalizedDescription = form.description.trim();

    if (!normalizedTitle || !normalizedDescription) {
      alert("Title and description cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const capacityPayload = {
        spaceType: capacity.propertyType || "Entire house",
        guests: normalizeCapacityValue(capacity.guests),
        bedrooms: normalizeCapacityValue(capacity.bedrooms),
        beds: normalizeCapacityValue(capacity.beds),
        bathrooms: normalizeCapacityValue(capacity.bathrooms),
      };
      const locationPayload = getLocationPayload();

      const response = await fetch(`${PROPERTY_API_BASE}/overview`, {
        method: "PATCH",
        headers: {
          Authorization: getAccessToken(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId,
          title: normalizedTitle,
          subtitle: normalizedSubtitle,
          description: normalizedDescription,
          capacity: capacityPayload,
          location: locationPayload,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save property overview.");
      }

      setForm({
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        description: normalizedDescription,
      });
      alert("Property updated successfully.");
    } catch (err) {
      console.error(err);
      setError("Saving failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-Host">
        <p className="page-Host-title">Listing editor</p>
        <div className="page-Host-content">
          <section className={`host-pc-dashboard ${styles.editorShell}`}>
            <div className={styles.loaderWrap}>
              <ClipLoader size={80} color="#0D9813" loading />
              <p className={styles.loaderText}>Loading property details...</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const statusLabel = status === "ACTIVE" ? "Live" : "Draft";
  const statusDotClass = status === "ACTIVE" ? styles.statusDotLive : styles.statusDotDraft;
  const displayedPropertyType = capacity.propertyType || "Entire house";
  const isOverviewTab = selectedTab === "Overview";

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    if (!nextPropertyId || nextPropertyId === propertyId) {
      return;
    }
    navigate(`/hostdashboard/property?ID=${encodeURIComponent(nextPropertyId)}`);
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          <div className={styles.tabs} role="tablist" aria-label="Listing editor tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className={`${styles.tab} ${selectedTab === tab ? styles.tabActive : ""}`}
                onClick={() => setSelectedTab(tab)}
                aria-selected={selectedTab === tab}
              >
                {tab}
              </button>
            ))}
          </div>

          <article className={styles.listingSummary}>
            <select
              id="listing-selector"
              value={propertyId || ""}
              onChange={handlePropertyChange}
              className={styles.listingSelect}
            >
              {hostProperties.length > 0 ? (
                hostProperties.map((accommodation) => (
                  <option key={accommodation.id} value={accommodation.id}>
                    {accommodation.title}
                  </option>
                ))
              ) : (
                <option value={propertyId || ""}>{form.title || "Untitled listing"}</option>
              )}
            </select>
            <p className={styles.listingStatus}>
              <span className={`${styles.statusDot} ${statusDotClass}`} />
              {statusLabel}
            </p>
          </article>

          {isOverviewTab ? (
            <>
              <section className={styles.card}>
                <h3 className={styles.sectionTitle}>Property Information</h3>
                <div className={styles.field}>
                  <label htmlFor="property-title">Title</label>
                  <input
                    id="property-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="property-description">Description</label>
                  <textarea
                    id="property-description"
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={5}
                    className={styles.textarea}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="property-subtitle">Subtitle</label>
                  <input
                    id="property-subtitle"
                    type="text"
                    value={form.subtitle}
                    onChange={(event) => updateField("subtitle", event.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.sectionDivider} />

                <h3 className={styles.sectionTitle}>Capacity</h3>
                <div className={styles.field}>
                  <label htmlFor="property-type">Property type</label>
                  <select
                    id="property-type"
                    className={styles.input}
                    value={displayedPropertyType}
                    onChange={(event) => setCapacity((prev) => ({ ...prev, propertyType: event.target.value }))}
                  >
                    {!SPACE_TYPE_OPTIONS.includes(displayedPropertyType) && (
                      <option value={displayedPropertyType}>{displayedPropertyType}</option>
                    )}
                    {SPACE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.capacityGrid}>
                  <div className={styles.counterItem}>
                    <span className={styles.counterLabel}>Guests</span>
                    <div className={styles.counterControl}>
                      <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("guests", -1)}>
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={MAX_CAPACITY_VALUE}
                        value={capacity.guests}
                        onChange={(event) => updateCapacityField("guests", event.target.value)}
                        className={styles.counterValue}
                      />
                      <button
                        type="button"
                        className={`${styles.counterButton} ${styles.counterButtonPlus}`}
                        onClick={() => adjustCapacityField("guests", 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.counterItem}>
                    <span className={styles.counterLabel}>Bedrooms</span>
                    <div className={styles.counterControl}>
                      <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("bedrooms", -1)}>
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={MAX_CAPACITY_VALUE}
                        value={capacity.bedrooms}
                        onChange={(event) => updateCapacityField("bedrooms", event.target.value)}
                        className={styles.counterValue}
                      />
                      <button
                        type="button"
                        className={`${styles.counterButton} ${styles.counterButtonPlus}`}
                        onClick={() => adjustCapacityField("bedrooms", 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.counterItem}>
                    <span className={styles.counterLabel}>Beds</span>
                    <div className={styles.counterControl}>
                      <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField("beds", -1)}>
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={MAX_CAPACITY_VALUE}
                        value={capacity.beds}
                        onChange={(event) => updateCapacityField("beds", event.target.value)}
                        className={styles.counterValue}
                      />
                      <button
                        type="button"
                        className={`${styles.counterButton} ${styles.counterButtonPlus}`}
                        onClick={() => adjustCapacityField("beds", 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.counterItem}>
                    <span className={styles.counterLabel}>Bathrooms</span>
                    <div className={styles.counterControl}>
                      <button
                        type="button"
                        className={styles.counterButton}
                        onClick={() => adjustCapacityField("bathrooms", -1)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={MAX_CAPACITY_VALUE}
                        value={capacity.bathrooms}
                        onChange={(event) => updateCapacityField("bathrooms", event.target.value)}
                        className={styles.counterValue}
                      />
                      <button
                        type="button"
                        className={`${styles.counterButton} ${styles.counterButtonPlus}`}
                        onClick={() => adjustCapacityField("bathrooms", 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.sectionDivider} />

                <h3 className={styles.sectionTitle}>Location</h3>
                <p className={styles.locationNote}>
                  Guests only see the approximate location until booking is confirmed.
                </p>

                <div className={styles.locationGridTwo}>
                  <div className={styles.field}>
                    <label htmlFor="location-street">Street</label>
                    <input
                      id="location-street"
                      type="text"
                      value={address.street}
                      onChange={(event) => updateAddressField("street", event.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="location-house-number">House number</label>
                    <input
                      id="location-house-number"
                      type="text"
                      value={address.houseNumber}
                      onChange={(event) => updateAddressField("houseNumber", event.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.locationGridThree}>
                  <div className={styles.field}>
                    <label htmlFor="location-postal-code">Postal code</label>
                    <input
                      id="location-postal-code"
                      type="text"
                      value={address.postalCode}
                      onChange={(event) => updateAddressField("postalCode", event.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="location-city">City</label>
                    <input
                      id="location-city"
                      type="text"
                      value={address.city}
                      onChange={(event) => updateAddressField("city", event.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="location-country">Country</label>
                    <input
                      id="location-country"
                      type="text"
                      value={address.country}
                      onChange={(event) => updateAddressField("country", event.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>

                <div className={styles.mapPreview}>
                  <p className={styles.mapPreviewLabel}>Map preview</p>
                  <p className={styles.mapPreviewAddress}>
                    {[address.street, address.houseNumber, address.postalCode, address.city, address.country]
                      .filter((item) => item)
                      .join(", ") || "Address details are not fully available yet."}
                  </p>
                </div>
              </section>

              {error ? <p className={styles.errorText}>{error}</p> : null}

              <div className={styles.actions}>
                <button className="greenBtn" onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                  Back to listings
                </button>
                <button className="greenBtn" onClick={saveOverview} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          ) : (
            <>
              <section className={`${styles.card} ${styles.placeholderCard}`}>
                <p className={styles.placeholderBadge}>Coming soon</p>
                <h3 className={styles.sectionTitle}>{selectedTab}</h3>
                <p className={styles.placeholderText}>
                  Editing for {selectedTab.toLowerCase()} is not available yet. We will enable this tab in a next rollout.
                </p>
              </section>

              <div className={styles.actions}>
                <button className="greenBtn" onClick={() => navigate("/hostdashboard/listings")}>
                  Back to listings
                </button>
                <button className="greenBtn" disabled>
                  Save changes
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
