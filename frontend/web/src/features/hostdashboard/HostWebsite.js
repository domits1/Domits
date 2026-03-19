import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HostWebsite.module.scss";
import { fetchHostPropertySelectOptions } from "./services/hostTaskPropertyService";

const EMPTY_SELECTION = "";

const PROPERTY_STATUS_LABELS = {
  ACTIVE: "Live",
  INACTIVE: "Draft",
  ARCHIVED: "Archived",
};

const getPropertyStatusLabel = (status) =>
  PROPERTY_STATUS_LABELS[String(status || "").toUpperCase()] || "Unknown";

function HostWebsite() {
  const [propertyOptions, setPropertyOptions] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(EMPTY_SELECTION);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  const loadProperties = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const nextPropertyOptions = await fetchHostPropertySelectOptions();
      setPropertyOptions(nextPropertyOptions);
      setSelectedPropertyId((currentPropertyId) =>
        nextPropertyOptions.some((option) => option.value === currentPropertyId)
          ? currentPropertyId
          : EMPTY_SELECTION
      );
    } catch (error) {
      console.error("Failed to load website property options:", error);
      setPropertyOptions([]);
      setSelectedPropertyId(EMPTY_SELECTION);
      setLoadError(error?.message || "We could not load your listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProperties();
  }, []);

  const selectedProperty =
    propertyOptions.find((propertyOption) => propertyOption.value === selectedPropertyId) || null;

  const previewImages = selectedProperty?.previewImages || [];

  const renderSelectionState = () => {
    if (isLoading) {
      return <p className={styles.stateText}>Loading your listings...</p>;
    }

    if (loadError) {
      return (
        <div className={`${styles.stateCard} ${styles.errorState}`}>
          <p>{loadError}</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => void loadProperties()}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    if (propertyOptions.length === 0) {
      return (
        <div className={styles.stateCard}>
          <p>
            You do not have any listings yet. Create one first, then come back here to start building
            your website.
          </p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => navigate("/hostonboarding")}>
              Add new accommodation
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="website-property-select">
            Listing
          </label>
          <select
            id="website-property-select"
            className={styles.selectInput}
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
          >
            <option value={EMPTY_SELECTION}>Choose a listing</option>
            {propertyOptions.map((propertyOption) => (
              <option key={propertyOption.value} value={propertyOption.value}>
                {propertyOption.label}
              </option>
            ))}
          </select>
          <p className={styles.helperText}>Only properties connected to your host account are shown here.</p>
        </div>

        {selectedProperty ? (
          <div className={styles.selectionSummary}>
            <div className={styles.selectionPreview}>
              <div
                key={selectedProperty.value}
                className={styles.photoStack}
                aria-hidden="true"
              >
                {previewImages.map((imageUrl, index) => (
                  <div
                    key={`${selectedProperty.value}-${index}`}
                    className={`${styles.photoCard} ${styles[`photoCard${index + 1}`] || ""}`}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      className={styles.photoImage}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.selectionContent}>
                <p className={styles.summaryLabel}>Selected listing</p>
                <p className={styles.summaryValue}>{selectedProperty.title || selectedProperty.label}</p>
                {selectedProperty.location ? (
                  <p className={styles.summaryLocation}>{selectedProperty.location}</p>
                ) : null}
                <div className={styles.metaRow}>
                  <span className={styles.statusPill}>
                    Status: {getPropertyStatusLabel(selectedProperty.status)}
                  </span>
                  <span className={styles.metaText}>
                    {selectedProperty.imageCount > 0
                      ? `${selectedProperty.imageCount} photo${selectedProperty.imageCount === 1 ? "" : "s"} imported`
                      : "No photos imported yet"}
                  </span>
                </div>
                <p className={styles.summaryMeta}>
                  A few listing photos are pulled in automatically so you can recognize the property you are
                  about to turn into a standalone website.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.websitePage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Standalone property website</p>
            <h1 className={styles.heroTitle}>Build your own free website for one of your listings</h1>
            <p className={styles.heroDescription}>
              Choose one of your Domits listings to start a standalone website. We use the property
              information you already manage in Domits, so the website setup begins from real listing data
              instead of manual re-entry.
            </p>
          </div>

          <div className={styles.selectorCard}>
            <div className={styles.selectorHeader}>
              <h2>Select your listing</h2>
              <p>
                Pick the property you want to use as the base for your website. This page only shows
                listings that belong to your host account.
              </p>
            </div>

            {renderSelectionState()}
          </div>
        </section>
      </div>
    </main>
  );
}

export default HostWebsite;
