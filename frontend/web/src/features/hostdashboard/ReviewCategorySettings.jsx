import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  fetchReviewCategoryConfiguration,
  saveReviewCategoryConfiguration,
} from "./services/reviewResponseService";

function ReviewCategorySettings({ properties, styles }) {
  const [propertyId, setPropertyId] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(String(properties[0].value));
    }
  }, [properties, propertyId]);

  useEffect(() => {
    if (!propertyId) {
      setCategories([]);
      return undefined;
    }

    let isMounted = true;
    setIsLoading(true);
    setMessage("");

    fetchReviewCategoryConfiguration(propertyId)
      .then((result) => {
        if (isMounted) setCategories(result);
      })
      .catch((error) => {
        if (isMounted) setMessage(error.message || "Could not load review category settings.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const orderedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)),
    [categories]
  );

  const updateCategory = (key, changes) => {
    setMessage("");
    setCategories((current) =>
      current.map((category) => (category.key === key ? { ...category, ...changes } : category))
    );
  };

  const saveCategories = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      const saved = await saveReviewCategoryConfiguration(
        propertyId,
        categories.map(({ key, isActive, sortOrder }) => ({
          key,
          isActive,
          sortOrder: Number(sortOrder),
        }))
      );
      setCategories(saved);
      setMessage("Review category settings saved.");
    } catch (error) {
      setMessage(error.message || "Could not save review category settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (properties.length === 0) {
    return <p className={styles.reviewAlert}>No managed properties are available.</p>;
  }

  return (
    <section className={styles.categorySettingsSection} aria-labelledby="review-category-settings-title">
      <div className={styles.categorySettingsHeader}>
        <h3 id="review-category-settings-title">Category settings</h3>
        <label>
          Property
          <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
            {properties.map((property) => (
              <option key={property.value} value={property.value}>{property.title}</option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p className={message.includes("saved") ? styles.categorySuccess : styles.reviewError} role="status">
          {message}
        </p>
      )}

      {isLoading ? (
        <p aria-busy="true">Loading category settings...</p>
      ) : (
        <div className={styles.categorySettingsList}>
          {orderedCategories.map((category) => (
            <div key={category.key} className={styles.categorySettingsRow}>
              <label className={styles.categoryToggle}>
                <input
                  type="checkbox"
                  checked={category.isActive}
                  onChange={(event) => updateCategory(category.key, { isActive: event.target.checked })}
                />
                <span>{category.label}</span>
              </label>
              <label className={styles.categoryOrder}>
                Order
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="10"
                  value={category.sortOrder}
                  onChange={(event) => updateCategory(category.key, { sortOrder: event.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.categorySaveButton}
        disabled={isLoading || isSaving || categories.length === 0}
        onClick={saveCategories}
      >
        {isSaving ? "Saving..." : "Save categories"}
      </button>
    </section>
  );
}

ReviewCategorySettings.propTypes = {
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
    })
  ).isRequired,
  styles: PropTypes.objectOf(PropTypes.string).isRequired,
};

export default ReviewCategorySettings;
