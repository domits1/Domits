import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";
import styles from "./HostProperty.module.css";
import amenitiesCatalogue from "../../store/amenities";
import arrowDownIcon from "../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../images/arrow-up-icon.svg";
import infoIcon from "../../images/icons/info.png";

const PROPERTY_API_BASE = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property";
const TABS = ["Overview", "Photos", "Amenities", "Pricing", "Availability", "Policies"];
const SPACE_TYPE_OPTIONS = ["Entire house", "Private room", "Shared room"];
const MAX_CAPACITY_VALUE = 99;
const AMENITY_CATEGORY_ORDER = [
  "Essentials",
  "Kitchen",
  "Bathroom",
  "Safety",
  "Outdoor",
  "Technology",
  "Bedroom",
  "LivingArea",
  "Laundry",
  "FamilyFriendly",
  "Convenience",
  "Accessibility",
  "ExtraServices",
  "EcoFriendly",
];
const POLICY_RULE_CONFIG = [
  { rule: "SmokingAllowed", label: "No smoking", invert: true },
  { rule: "PetsAllowed", label: "No pets", invert: true },
  { rule: "Parties/EventsAllowed", label: "No parties or events", invert: true },
  { rule: "SuitableForChildren", label: "Suitable for children", invert: false },
  { rule: "SuitableForInfants", label: "Suitable for infants", invert: false },
];

const createInitialPolicyRules = () =>
  POLICY_RULE_CONFIG.reduce((accumulator, ruleConfig) => {
    accumulator[ruleConfig.rule] = false;
    return accumulator;
  }, {});

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
  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);
  const [policyRules, setPolicyRules] = useState(createInitialPolicyRules);
  const [expandedAmenityCategories, setExpandedAmenityCategories] = useState({});
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
  const isDevelopment = process.env.NODE_ENV === "development";

  const amenitiesByCategory = useMemo(() => {
    return amenitiesCatalogue.reduce((categories, amenity) => {
      if (!categories[amenity.category]) {
        categories[amenity.category] = [];
      }
      categories[amenity.category].push(amenity);
      return categories;
    }, {});
  }, []);

  const amenityCategoryKeys = useMemo(() => {
    const categorySet = new Set(Object.keys(amenitiesByCategory));
    const ordered = AMENITY_CATEGORY_ORDER.filter((category) => categorySet.has(category));
    const leftovers = Object.keys(amenitiesByCategory)
      .filter((category) => !AMENITY_CATEGORY_ORDER.includes(category))
      .sort((left, right) => left.localeCompare(right));
    return [...ordered, ...leftovers];
  }, [amenitiesByCategory]);

  const selectedAmenityIdSet = useMemo(() => new Set(selectedAmenityIds), [selectedAmenityIds]);

  const selectedAmenityCountByCategory = useMemo(() => {
    return amenityCategoryKeys.reduce((counts, category) => {
      const categoryAmenities = amenitiesByCategory[category] || [];
      counts[category] = categoryAmenities.filter((amenity) => selectedAmenityIdSet.has(String(amenity.id))).length;
      return counts;
    }, {});
  }, [amenitiesByCategory, amenityCategoryKeys, selectedAmenityIdSet]);

  useEffect(() => {
    if (amenityCategoryKeys.length === 0) {
      return;
    }
    setExpandedAmenityCategories((previous) => {
      if (Object.keys(previous).length > 0) {
        return previous;
      }
      return { [amenityCategoryKeys[0]]: true };
    });
  }, [amenityCategoryKeys]);

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
        const propertyAmenities = Array.isArray(data?.amenities) ? data.amenities : [];
        const propertyRules = Array.isArray(data?.rules) ? data.rules : [];
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
        setSelectedAmenityIds(
          propertyAmenities.map((amenity) => String(amenity?.amenityId || "")).filter((amenityId) => amenityId)
        );
        setPolicyRules(() => {
          const nextRules = createInitialPolicyRules();
          propertyRules.forEach((rule) => {
            const ruleName = String(rule?.rule || "");
            if (!Object.prototype.hasOwnProperty.call(nextRules, ruleName)) {
              return;
            }
            nextRules[ruleName] = Boolean(rule?.value);
          });
          return nextRules;
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

    let digitEndIndex = 0;
    while (digitEndIndex < value.length && value[digitEndIndex] >= "0" && value[digitEndIndex] <= "9") {
      digitEndIndex += 1;
    }

    if (digitEndIndex === 0) {
      return null;
    }

    const parsedHouseNumber = Number(value.slice(0, digitEndIndex));
    if (!Number.isFinite(parsedHouseNumber)) {
      return null;
    }

    return {
      houseNumber: Math.trunc(parsedHouseNumber),
      houseNumberExtension: value.slice(digitEndIndex).trim(),
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

  const getApiErrorMessage = async (response, fallbackMessage) => {
    try {
      const rawBody = await response.text();
      if (!rawBody) {
        return fallbackMessage;
      }

      try {
        const parsedBody = JSON.parse(rawBody);
        if (typeof parsedBody === "string" && parsedBody.trim()) {
          return parsedBody.trim();
        }
        if (typeof parsedBody?.message === "string" && parsedBody.message.trim()) {
          return parsedBody.message.trim();
        }
      } catch {
        if (rawBody.trim()) {
          return rawBody.trim();
        }
      }

      return fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const saveOverview = async () => {
    const isSavingAmenities = selectedTab === "Amenities";
    const isSavingPolicies = selectedTab === "Policies";
    const normalizedTitle = form.title.trim();
    const normalizedSubtitle = form.subtitle.trim();
    const normalizedDescription = form.description.trim();

    if (!normalizedTitle || !normalizedDescription) {
      const validationMessage = "Title and description cannot be empty.";
      setError(validationMessage);
      toast.error(validationMessage);
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
      const amenitiesPayload = isSavingAmenities ? selectedAmenityIds.map((amenityId) => String(amenityId)) : undefined;
      const rulesPayload = isSavingPolicies
        ? POLICY_RULE_CONFIG.map((ruleConfig) => ({
            rule: ruleConfig.rule,
            value: Boolean(policyRules[ruleConfig.rule]),
          }))
        : undefined;

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
          amenities: amenitiesPayload,
          rules: rulesPayload,
        }),
      });

      if (!response.ok) {
        const apiErrorMessage = await getApiErrorMessage(response, "Failed to save property overview.");
        throw new Error(apiErrorMessage);
      }

      if (isSavingAmenities) {
        const verificationResponse = await fetch(
          `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`,
          {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }
        );
        if (!verificationResponse.ok) {
          throw new Error("Amenities were not verified after save. Please try again.");
        }

        const verificationData = await verificationResponse.json();
        const persistedAmenityIds = new Set(
          (Array.isArray(verificationData?.amenities) ? verificationData.amenities : [])
            .map((amenity) => String(amenity?.amenityId || ""))
            .filter((amenityId) => amenityId)
        );
        const expectedAmenityIds = new Set((amenitiesPayload || []).map((amenityId) => String(amenityId)));
        const hasSameAmenities =
          persistedAmenityIds.size === expectedAmenityIds.size &&
          [...expectedAmenityIds].every((amenityId) => persistedAmenityIds.has(amenityId));

        if (!hasSameAmenities) {
          throw new Error("Amenities could not be updated in the deployed backend yet.");
        }
      }

      if (isSavingPolicies) {
        const verificationResponse = await fetch(
          `${PROPERTY_API_BASE}/hostDashboard/single?property=${encodeURIComponent(propertyId)}`,
          {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }
        );
        if (!verificationResponse.ok) {
          throw new Error("Policies were not verified after save. Please try again.");
        }

        const verificationData = await verificationResponse.json();
        const persistedRulesMap = new Map(
          (Array.isArray(verificationData?.rules) ? verificationData.rules : [])
            .map((rule) => [String(rule?.rule || ""), Boolean(rule?.value)])
            .filter(([ruleName]) => ruleName)
        );
        const hasSamePolicies = (rulesPayload || []).every(
          (rule) => persistedRulesMap.get(rule.rule) === Boolean(rule.value)
        );

        if (!hasSamePolicies) {
          throw new Error("Policies could not be updated in the deployed backend yet.");
        }
      }

      setForm({
        title: normalizedTitle,
        subtitle: normalizedSubtitle,
        description: normalizedDescription,
      });
      const saveSuccessMessage = isSavingAmenities
        ? "Amenities updated successfully."
        : isSavingPolicies
          ? "Policies updated successfully."
          : "Property updated successfully.";
      toast.success(saveSuccessMessage);
    } catch (err) {
      console.error(err);
      const resolvedErrorMessage =
        err?.name === "TypeError"
          ? isDevelopment
            ? "Could not reach the API. Check AWS deployment/CORS configuration and try again."
            : "Something went wrong while saving. Please try again later."
          : err?.message || "Saving failed. Please try again.";
      setError(resolvedErrorMessage);
      toast.error(resolvedErrorMessage);
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
  const isAmenitiesTab = selectedTab === "Amenities";
  const isPoliciesTab = selectedTab === "Policies";
  const savingMessage = isAmenitiesTab
    ? "Saving amenities..."
    : isPoliciesTab
      ? "Saving policies..."
      : "Saving property details...";

  const handlePropertyChange = (event) => {
    const nextPropertyId = event.target.value;
    if (!nextPropertyId || nextPropertyId === propertyId) {
      return;
    }
    navigate(`/hostdashboard/property?ID=${encodeURIComponent(nextPropertyId)}`);
  };

  const toggleAmenityCategory = (category) => {
    setExpandedAmenityCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  };

  const toggleAmenitySelection = (amenityId) => {
    const normalizedAmenityId = String(amenityId);
    setSelectedAmenityIds((previous) =>
      previous.includes(normalizedAmenityId)
        ? previous.filter((id) => id !== normalizedAmenityId)
        : [...previous, normalizedAmenityId]
    );
  };

  const updatePolicyRule = (ruleName, value) => {
    setPolicyRules((previous) => ({
      ...previous,
      [ruleName]: value,
    }));
  };

  const handleDeletePropertyClick = () => {
    toast.info("Delete property flow will be enabled in the dedicated delete release.");
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Listing editor</p>
      <div className="page-Host-content">
        <section className={`host-pc-dashboard ${styles.editorShell}`}>
          {saving ? (
            <div className={styles.savingOverlay} role="status" aria-live="polite">
              <div className={styles.savingOverlayContent}>
                <ClipLoader size={80} color="#0D9813" loading />
                <p className={styles.savingOverlayText}>{savingMessage}</p>
              </div>
            </div>
          ) : null}

          <div className={styles.tabs} role="tablist" aria-label="Listing editor tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                className={`${styles.tab} ${selectedTab === tab ? styles.tabActive : ""}`}
                onClick={() => setSelectedTab(tab)}
                aria-selected={selectedTab === tab}
                disabled={saving}
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
              disabled={saving}
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
                <button className={styles.actionButton} onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                  Back to listings
                </button>
                <button className={styles.actionButton} onClick={saveOverview} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          ) : isAmenitiesTab ? (
            <>
              <section className={`${styles.card} ${styles.amenitiesCard}`}>
                <h3 className={styles.sectionTitle}>Amenities</h3>
                <p className={styles.amenitiesSubtitle}>
                  Highlight the amenities and features your property offers.
                </p>

                <div className={styles.amenitiesAccordion}>
                  {amenityCategoryKeys.map((category) => {
                    const categoryAmenities = amenitiesByCategory[category] || [];
                    const isExpanded = Boolean(expandedAmenityCategories[category]);
                    const selectedCount = selectedAmenityCountByCategory[category] || 0;

                    return (
                      <article key={category} className={styles.amenityCategoryItem}>
                        <button
                          type="button"
                          className={styles.amenityCategoryHeader}
                          onClick={() => toggleAmenityCategory(category)}
                          aria-expanded={isExpanded}
                        >
                          <span className={styles.amenityCategoryTitle}>
                            {category}{" "}
                            <span className={styles.amenityCategoryCount}>
                              ({selectedCount} out of {categoryAmenities.length} selected)
                            </span>
                          </span>
                          <span className={styles.amenityCategoryChevron}>
                            <img
                              src={isExpanded ? arrowUpIcon : arrowDownIcon}
                              alt=""
                              aria-hidden="true"
                              className={styles.amenityCategoryChevronIcon}
                            />
                          </span>
                        </button>

                        <div
                          className={`${styles.amenityCategoryBody} ${
                            isExpanded ? styles.amenityCategoryBodyOpen : ""
                          }`}
                          aria-hidden={!isExpanded}
                        >
                          <div className={styles.amenityCheckboxGrid}>
                            {categoryAmenities.map((amenity) => {
                              const amenityId = String(amenity.id);
                              const checked = selectedAmenityIdSet.has(amenityId);
                              return (
                                <label key={amenityId} className={styles.amenityCheckboxItem}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleAmenitySelection(amenityId)}
                                  />
                                  <span>{amenity.amenity}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <p className={styles.amenitiesHint}>Listings with popular amenities like Wi-Fi receive more bookings.</p>
              </section>

              {error ? <p className={styles.errorText}>{error}</p> : null}

              <div className={styles.actions}>
                <button className={styles.actionButton} onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                  Back to listings
                </button>
                <button className={styles.actionButton} onClick={saveOverview} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </>
          ) : isPoliciesTab ? (
            <>
              <section className={`${styles.card} ${styles.policiesCard}`}>
                <h3 className={styles.sectionTitle}>Policies</h3>
                <p className={styles.policiesSubtitle}>
                  Add important policies that guests must follow during their stay.
                </p>

                <div className={styles.policiesRulesPanel}>
                  <header className={styles.policiesRulesHeader}>House rules</header>
                  <div className={styles.policiesRulesList}>
                    {POLICY_RULE_CONFIG.map((ruleConfig) => {
                      const currentRuleValue = Boolean(policyRules[ruleConfig.rule]);
                      const isChecked = ruleConfig.invert ? !currentRuleValue : currentRuleValue;
                      return (
                        <label key={ruleConfig.rule} className={styles.policyRuleRow}>
                          <span className={styles.policyRuleLabel}>{ruleConfig.label}</span>
                          <input
                            type="checkbox"
                            className={styles.policyRuleInput}
                            checked={isChecked}
                            onChange={(event) => {
                              const nextRuleValue = ruleConfig.invert ? !event.target.checked : event.target.checked;
                              updatePolicyRule(ruleConfig.rule, nextRuleValue);
                            }}
                          />
                          <span className={styles.policyRuleSwitch} aria-hidden="true" />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className={styles.deletePropertyPanel}>
                <div className={styles.deletePropertyText}>
                  <h4 className={styles.deletePropertyTitle}>Delete property</h4>
                  <p className={styles.deletePropertyDescription}>
                    This will permanently remove this listing, its calendar and related data.
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.deletePropertyButton}
                  onClick={handleDeletePropertyClick}
                  disabled={saving}
                >
                  Delete permanently
                </button>
              </section>

              <p className={styles.policiesHint}>
                <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />
                Clear policies help set expectations and avoid misunderstandings with guests.
              </p>

              {error ? <p className={styles.errorText}>{error}</p> : null}

              <div className={styles.actions}>
                <button className={styles.actionButton} onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                  Back to listings
                </button>
                <button className={styles.actionButton} onClick={saveOverview} disabled={saving}>
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
                <button className={styles.actionButton} onClick={() => navigate("/hostdashboard/listings")} disabled={saving}>
                  Back to listings
                </button>
                <button className={styles.actionButton} disabled>
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
