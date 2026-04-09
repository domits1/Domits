import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import styles from "../../HostProperty.module.css";
import arrowDownIcon from "../../../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../../../images/arrow-up-icon.svg";
import infoIcon from "../../../../images/icons/info.png";
import checkIcon from "../../../../images/icons/checkPng.png";
import crossIcon from "../../../../images/icons/cross.png";
import { HostPropertyPlaceholderTab } from "./HostPropertyShell";
import { usePhotoTileInteractionHandlers } from "../hooks/usePhotoTileInteractionHandlers";
import {
  createInitialPricingForm,
  MAX_CAPACITY_VALUE,
  MAX_PROPERTY_IMAGES,
  PHOTO_ACCEPT,
  PHOTO_CATEGORY_PLACEHOLDERS,
  POLICY_RULE_CONFIG,
  PRICING_DISCOUNT_PERCENT_OPTIONS,
  PRICING_EARLY_BIRD_DAY_OPTIONS,
  PRICING_LAST_MINUTE_DAY_OPTIONS,
  PRICING_MAX_NIGHTLY_RATE,
  PRICING_MAX_STAY_OPTIONS,
  PRICING_MIN_NIGHTLY_RATE_FOR_INPUT,
  PRICING_STAY_OPTIONS,
  SPACE_TYPE_OPTIONS,
} from "../constants";
import {
  animatePhotoTileToNewPosition,
  getSelectOptionsWithCurrent,
  getStayOptionLabel,
  normalizePricingForm,
} from "../utils/hostPropertyUtils";

const CAPACITY_COUNTER_FIELDS = [
  { key: "guests", label: "Guests" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "beds", label: "Beds" },
  { key: "bathrooms", label: "Bathrooms" },
];

const CANCELLATION_POLICIES = [
  {
    id: "flexible",
    name: "Flexible",
    summary: "Full refund until 1 day before check-in",
    rules: [
      "At least 1 day before check-in, they will receive 100% refund ( you will keep 0% of the booking)",
      "Less than 1 day before check-in, they will receive no refund ( you will keep 100% of the booking)",
    ],
    important:
      "your payout is processed once the booking becomes non-refundable (within 24 hours of check-in). You should receive your payout within 3 days of processing.",
  },
  {
    id: "moderate",
    name: "Moderate",
    summary: "Full refund until 5 days before check-in",
    rules: [
      "At least 5 days before check-in, they will receive 100% refund (you will keep 0% of the booking)",
      "Less than 5 days before check-in, they will receive a 50% refund (you will keep 50% of the booking)",
    ],
    important: null,
  },
  {
    id: "strict",
    name: "Strict",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, they will receive a 70% refund (you will keep 30% of the booking)",
      "Less than 30 days before check-in, they will receive no refund (you will keep 100% of the booking)",
    ],
    important: null,
  },
  {
    id: "firm",
    name: "Firm",
    summary: "Full refund until 30 days before check-in",
    rules: [
      "At least 30 days before check-in, they will receive a 100% refund (you will keep 0% of the booking)",
      "Less than 30 days but more than 7 days before check-in, they will receive a 50% refund (you will keep 50% of the booking)",
      "Less than 7 days before check-in, they will receive no refund (you will keep 100% of the booking)",
    ],
    important: null,
  },
];

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${styles.policyToggleSwitch} ${checked ? styles.policyToggleSwitchOn : ""}`}>
      <span className={styles.policyToggleThumb} />
    </button>
  );
}

function CustomRuleRow({ rule, onToggle, onDelete }) {
  return (
    <div className={styles.policyCustomRuleRow}>
      <span className={styles.policyRuleLabelCustom}>{rule.label}</span>
      <div className={styles.policyRuleRowRight}>
        <ToggleSwitch checked={rule.enabled} onChange={(val) => onToggle(rule.id, val)} />
        <button
          type="button"
          className={styles.policyCustomRuleDelete}
          onClick={() => onDelete(rule.id)}
          aria-label="Remove rule">
          ×
        </button>
      </div>
    </div>
  );
}

function PolicySelectField({ id, label, value, onChange, disabled, options, hint }) {
  return (
    <div className={styles.checkinField}>
      <label htmlFor={id} className={styles.checkinLabel}>
        {label}
      </label>
      {hint ? <p className={styles.checkinFieldHint}>{hint}</p> : null}
      <select id={id} className={styles.checkinSelect} value={value} onChange={onChange} disabled={disabled}>
        {options.map((option) => {
          const optionValue = typeof option === "object" ? option.value : option;
          const optionLabel = typeof option === "object" ? option.label : option;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function PolicyLateTimeField({ id, label, enabled, onToggle, value, onChange, disabled, options }) {
  return (
    <div className={styles.checkinField}>
      <label htmlFor={id} className={styles.checkinLabel}>
        {label}
      </label>
      <div className={styles.checkinToggleRow}>
        <ToggleSwitch checked={enabled} onChange={onToggle} disabled={disabled} />
        {enabled ? (
          <select id={id} className={styles.checkinSelectInline} value={value} onChange={onChange} disabled={disabled}>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

function RuleToggleField({ label, checked, onChange, disabled }) {
  return (
    <div className={styles.ruleToggleRow}>
      <span className={styles.ruleToggleLabel}>{label}</span>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function CustomRuleEditor({ visible, value, onChange, onConfirm, onCancel, onShow }) {
  if (visible) {
    return (
      <div className={styles.customRuleInputRow}>
        <input
          type="text"
          className={styles.customRuleInput}
          placeholder="Rule label..."
          value={value}
          onChange={onChange}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onConfirm();
            }
          }}
          autoFocus
        />
        <button type="button" className={styles.customRuleAddConfirm} onClick={onConfirm}>
          Add
        </button>
        <button type="button" className={styles.customRuleAddCancel} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button type="button" className={styles.addCustomRuleBtn} onClick={onShow}>
      <span className={styles.addCustomRulePlus}>+</span> Add custom rule
    </button>
  );
}

function TextInputField({ id, label, value, onChange, type = "text" }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={onChange} className={styles.input} />
    </div>
  );
}

function TextareaField({ id, label, value, onChange, rows = 5 }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} onChange={onChange} rows={rows} className={styles.textarea} />
    </div>
  );
}

function HostPropertyOverviewTab(props) {
  const {
    form,
    updateField,
    displayedPropertyType,
    setCapacity,
    capacity,
    adjustCapacityField,
    updateCapacityField,
    address,
    updateAddressField,
  } = props;
  const renderCapacityCounter = ({ key, label }) => (
    <div key={key} className={styles.counterItem}>
      <span className={styles.counterLabel}>{label}</span>
      <div className={styles.counterControl}>
        <button type="button" className={styles.counterButton} onClick={() => adjustCapacityField(key, -1)}>
          -
        </button>
        <input
          type="number"
          min={0}
          max={MAX_CAPACITY_VALUE}
          value={capacity[key]}
          onChange={(event) => updateCapacityField(key, event.target.value)}
          className={styles.counterValue}
        />
        <button
          type="button"
          className={`${styles.counterButton} ${styles.counterButtonPlus}`}
          onClick={() => adjustCapacityField(key, 1)}>
          +
        </button>
      </div>
    </div>
  );

  return (
    <section className={styles.card}>
      <h3 className={styles.sectionTitle}>Property Information</h3>
      <TextInputField
        id="property-title"
        label="Title"
        value={form.title}
        onChange={(event) => updateField("title", event.target.value)}
      />

      <TextareaField
        id="property-description"
        label="Description"
        value={form.description}
        onChange={(event) => updateField("description", event.target.value)}
      />

      <TextInputField
        id="property-subtitle"
        label="Subtitle"
        value={form.subtitle}
        onChange={(event) => updateField("subtitle", event.target.value)}
      />

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitle}>Capacity</h3>
      <div className={styles.field}>
        <label htmlFor="property-type">Property type</label>
        <select
          id="property-type"
          className={styles.input}
          value={displayedPropertyType}
          onChange={(event) => setCapacity((prev) => ({ ...prev, propertyType: event.target.value }))}>
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

      <div className={styles.capacityGrid}>{CAPACITY_COUNTER_FIELDS.map((field) => renderCapacityCounter(field))}</div>

      <div className={styles.sectionDivider} />

      <h3 className={styles.sectionTitle}>Location</h3>
      <p className={styles.locationNote}>Guests only see the approximate location until booking is confirmed.</p>

      <div className={styles.locationGridTwo}>
        <TextInputField
          id="location-street"
          label="Street"
          value={address.street}
          onChange={(event) => updateAddressField("street", event.target.value)}
        />

        <TextInputField
          id="location-house-number"
          label="House number"
          value={address.houseNumber}
          onChange={(event) => updateAddressField("houseNumber", event.target.value)}
        />
      </div>

      <div className={styles.locationGridThree}>
        <TextInputField
          id="location-postal-code"
          label="Postal code"
          value={address.postalCode}
          onChange={(event) => updateAddressField("postalCode", event.target.value)}
        />

        <TextInputField
          id="location-city"
          label="City"
          value={address.city}
          onChange={(event) => updateAddressField("city", event.target.value)}
        />

        <TextInputField
          id="location-country"
          label="Country"
          value={address.country}
          onChange={(event) => updateAddressField("country", event.target.value)}
        />
      </div>

      <div className={styles.mapPreview}>
        <p className={styles.mapPreviewLabel}>Map preview</p>
        <p className={styles.mapPreviewAddress}>
          {[address.street, address.houseNumber, address.postalCode, address.city, address.country]
            .filter(Boolean)
            .join(", ") || "Address details are not fully available yet."}
        </p>
      </div>
    </section>
  );
}

function HostPropertyPhotosTab(props) {
  const {
    displayedPhotos,
    pendingPhotoCount,
    onOpenPhotoPicker,
    onPhotoFilesSelected,
    onPhotoDrop,
    onPhotoDragOver,
    onPhotoDragLeave,
    isPhotoDragOver,
    onRequestDeletePhoto,
    onPhotoTileDragStart,
    onPhotoTileDragEnd,
    onPhotoTileDragOver,
    onPhotoTileDragLeave,
    onPhotoTileDrop,
    draggingPhotoId,
    photoDropTargetId,
    saving,
    deletingPhoto,
    photoInputRef,
  } = props;
  const photoTileRefs = useRef(new Map());
  const previousTileRectsRef = useRef(new Map());
  const coverPhoto = displayedPhotos[0] || null;
  const gridPhotos = displayedPhotos.slice(1);
  const totalPhotoCount = displayedPhotos.length;
  const {
    handlePhotoTilePointerDown,
    handlePhotoTilePointerMove,
    handlePhotoTilePointerUp,
    handlePhotoTilePointerCancel,
    handlePhotoTileKeyDown,
  } = usePhotoTileInteractionHandlers({
    displayedPhotos,
    onPhotoTileDragStart,
    onPhotoTileDragOver,
    onPhotoTileDragEnd,
    onPhotoTileDrop,
    saving,
    deletingPhoto,
  });

  useLayoutEffect(() => {
    const nextRects = new Map();
    displayedPhotos.forEach((photo) => {
      const node = photoTileRefs.current.get(photo.id);
      if (node) {
        nextRects.set(photo.id, node.getBoundingClientRect());
      }
    });

    const previousRects = previousTileRectsRef.current;
    nextRects.forEach((nextRect, photoId) => {
      const previousRect = previousRects.get(photoId);
      if (!previousRect) {
        return;
      }
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
        return;
      }
      const node = photoTileRefs.current.get(photoId);
      if (!node) {
        return;
      }
      animatePhotoTileToNewPosition(node, deltaX, deltaY);
    });

    previousTileRectsRef.current = nextRects;
  }, [displayedPhotos]);

  const setPhotoTileRef = (photoId, node) => {
    if (node) {
      photoTileRefs.current.set(photoId, node);
      return;
    }
    photoTileRefs.current.delete(photoId);
  };

  const renderPhotoTile = ({ photo, wrapperClassName, tileClassName, imageClassName, ariaLabel, imageAlt }) => (
    <div
      key={photo.id}
      className={`${styles.photoTileActionWrap} ${wrapperClassName}`}
      data-photo-id={photo.id}
      ref={(node) => setPhotoTileRef(photo.id, node)}>
      <button
        type="button"
        className={`${tileClassName} ${draggingPhotoId === photo.id ? styles.photoTileDragActive : ""} ${
          photoDropTargetId === photo.id ? styles.photoTileDropTarget : ""
        } ${photo.isPending ? styles.photoTilePending : ""}`}
        data-photo-id={photo.id}
        draggable
        onDragStart={() => onPhotoTileDragStart(photo.id)}
        onDragEnd={onPhotoTileDragEnd}
        onDragOver={(event) => {
          event.preventDefault();
          onPhotoTileDragOver(photo.id);
        }}
        onDragLeave={() => onPhotoTileDragLeave(photo.id)}
        onDrop={(event) => {
          event.preventDefault();
          onPhotoTileDrop(photo.id);
        }}
        onPointerDown={(event) => handlePhotoTilePointerDown(photo.id, event)}
        onPointerMove={handlePhotoTilePointerMove}
        onPointerUp={handlePhotoTilePointerUp}
        onPointerCancel={handlePhotoTilePointerCancel}
        onKeyDown={(event) => handlePhotoTileKeyDown(photo.id, event)}
        aria-label={ariaLabel}>
        <img src={photo.src} alt={imageAlt} className={imageClassName} />
        {photo.isPending ? null : (
          <span className={styles.photoCheck} aria-hidden="true">
            <img src={checkIcon} alt="" aria-hidden="true" className={styles.photoCheckIcon} />
          </span>
        )}
        {photo.isPending ? <span className={styles.photoPendingBadge}>New - Unsaved</span> : null}
      </button>
      <button
        type="button"
        className={styles.photoRemoveButton}
        onClick={() => onRequestDeletePhoto(photo)}
        disabled={saving || deletingPhoto}
        aria-label="Delete photo">
        <img src={crossIcon} alt="" aria-hidden="true" className={styles.photoRemoveIcon} />
      </button>
    </div>
  );

  const renderCoverTile = () => {
    if (!coverPhoto) {
      return (
        <div className={styles.photoTileLarge}>
          <span className={styles.photoEmptyLabel}>No photos yet</span>
        </div>
      );
    }
    return renderPhotoTile({
      photo: coverPhoto,
      wrapperClassName: styles.photoTileActionWrapLarge,
      tileClassName: styles.photoTileLarge,
      imageClassName: styles.photoImageLarge,
      ariaLabel: "Reorder cover tile",
      imageAlt: "Cover",
    });
  };

  const renderGridTiles = () => {
    if (gridPhotos.length === 0) {
      return (
        <div className={styles.photoTileSmall}>
          <span className={styles.photoTilePlaceholder}>Additional photos will appear here.</span>
        </div>
      );
    }

    return gridPhotos.map((photo, index) =>
      renderPhotoTile({
        photo,
        wrapperClassName: styles.photoTileActionWrapSmall,
        tileClassName: styles.photoTileSmall,
        imageClassName: styles.photoImageSmall,
        ariaLabel: `Reorder listing view ${index + 2}`,
        imageAlt: `Listing view ${index + 2}`,
      })
    );
  };

  return (
    <section className={`${styles.card} ${styles.photosCard}`}>
      <h3 className={styles.sectionTitle}>Photos</h3>
      <p className={styles.photosSubtitle}>Upload and manage photos for your listing.</p>

      <div className={styles.photosLayout}>
        <div className={styles.photosPrimaryColumn}>
          {renderCoverTile()}
          <p className={styles.photoCoverCaption}>Cover photo</p>

          <button
            type="button"
            className={`${styles.photoAddButton} ${isPhotoDragOver ? styles.photoAddButtonDragOver : ""}`}
            onClick={onOpenPhotoPicker}
            onDragOver={onPhotoDragOver}
            onDragLeave={onPhotoDragLeave}
            onDrop={onPhotoDrop}
            disabled={saving}>
            <span className={styles.photoAddIcon}>+</span>
            <span>Add photos</span>
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            multiple
            className={styles.photoInputHidden}
            onChange={onPhotoFilesSelected}
            disabled={saving}
          />
        </div>

        <div className={styles.photosSecondaryGrid}>{renderGridTiles()}</div>
      </div>

      <div className={styles.photoCategoryGrid}>
        {PHOTO_CATEGORY_PLACEHOLDERS.map((category) => (
          <article key={category} className={styles.photoCategoryItem}>
            <span className={styles.photoCategoryName}>{category}</span>
            <button
              type="button"
              className={styles.photoCategoryAddButton}
              onClick={onOpenPhotoPicker}
              disabled={saving}>
              +Add
            </button>
          </article>
        ))}
      </div>

      <p className={styles.photosHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />{" "}
        <span>Listings with 10+ high-quality photos receive 30% more bookings.</span>
      </p>

      <p className={styles.photosMeta}>
        {totalPhotoCount} / {MAX_PROPERTY_IMAGES} photos
        {pendingPhotoCount > 0 ? ` (${pendingPhotoCount} pending save)` : ""}
      </p>
    </section>
  );
}

export function HostPropertyPhotoDeleteModal({ open, photoSrc, deletingPhoto, onCancel, onConfirm }) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.photoDeleteModalOverlay}
      aria-labelledby="photo-delete-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!deletingPhoto) {
          onCancel();
        }
      }}>
      <section className={styles.photoDeleteModal}>
        <img src={photoSrc} alt="Selected listing preview" className={styles.photoDeletePreview} />

        <h4 id="photo-delete-modal-title" className={styles.photoDeleteTitle}>
          Delete this photo?
        </h4>
        <p className={styles.photoDeleteDescription}>This photo will be permanently removed from your listing.</p>

        <div className={styles.photoDeleteActions}>
          <button type="button" className={styles.photoDeleteCancelButton} onClick={onCancel} disabled={deletingPhoto}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.photoDeleteConfirmButton}
            onClick={onConfirm}
            disabled={deletingPhoto}>
            {deletingPhoto ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </dialog>
  );
}

function HostPropertyAmenitiesTab(props) {
  const {
    amenityCategoryKeys,
    amenitiesByCategory,
    expandedAmenityCategories,
    selectedAmenityCountByCategory,
    selectedAmenityIdSet,
    toggleAmenityCategory,
    toggleAmenitySelection,
  } = props;
  return (
    <section className={`${styles.card} ${styles.amenitiesCard}`}>
      <h3 className={styles.sectionTitle}>Amenities</h3>
      <p className={styles.amenitiesSubtitle}>Highlight the amenities and features your property offers.</p>

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
                aria-expanded={isExpanded}>
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
                className={`${styles.amenityCategoryBody} ${isExpanded ? styles.amenityCategoryBodyOpen : ""}`}
                aria-hidden={!isExpanded}>
                <div className={styles.amenityCheckboxGrid}>
                  {categoryAmenities.map((amenity) => {
                    const amenityId = String(amenity.id);
                    const checked = selectedAmenityIdSet.has(amenityId);
                    return (
                      <label key={amenityId} className={styles.amenityCheckboxItem}>
                        <input type="checkbox" checked={checked} onChange={() => toggleAmenitySelection(amenityId)} />
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
  );
}

function HostPropertyPricingDiscountRow({
  title,
  description,
  enabled,
  onToggle,
  percentValue,
  percentOptions,
  onPercentChange,
  timingLabel = "",
  timingValue = 0,
  timingOptions = [],
  onTimingChange = () => {},
}) {
  const toggleId = `pricing-discount-toggle-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

  return (
    <article className={styles.pricingDiscountRow}>
      <div className={styles.pricingDiscountToggleWrap}>
        <input
          id={toggleId}
          type="checkbox"
          className={styles.pricingDiscountToggleInput}
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={title}
        />
        <label htmlFor={toggleId} className={styles.pricingDiscountToggleLabel}>
          <span className={styles.srOnly}>{`Toggle ${title}`}</span>
          <span className={styles.pricingDiscountToggle} aria-hidden="true" />
          <span className={styles.pricingDiscountText}>
            <span className={styles.pricingDiscountTitle}>{title}</span>
            <span className={styles.pricingDiscountDescription}>{description}</span>
          </span>
        </label>
      </div>

      <div className={styles.pricingDiscountControls}>
        {timingLabel ? (
          <label className={styles.pricingDiscountSelectWrap}>
            <span className={styles.pricingDiscountSelectLabel}>{timingLabel}</span>
            <select
              className={styles.pricingSelect}
              value={timingValue}
              onChange={(event) => onTimingChange(Number(event.target.value))}
              disabled={!enabled}>
              {timingOptions.map((option) => (
                <option key={option} value={option}>
                  {option} days before check in
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={styles.pricingDiscountSelectWrap}>
          <span className={styles.pricingDiscountSelectLabel}>Amount</span>
          <select
            className={styles.pricingSelect}
            value={percentValue}
            onChange={(event) => onPercentChange(Number(event.target.value))}
            disabled={!enabled}>
            {percentOptions.map((percent) => (
              <option key={percent} value={percent}>
                {percent}%
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function HostPropertyPricingTab({ pricingForm, setPricingForm }) {
  const minimumStayOptions = getSelectOptionsWithCurrent(PRICING_STAY_OPTIONS, pricingForm.minimumStay);
  const maximumStayOptions = getSelectOptionsWithCurrent(PRICING_MAX_STAY_OPTIONS, pricingForm.maximumStay);
  const weeklyPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.weeklyDiscountPercent
  );
  const monthlyPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.monthlyDiscountPercent
  );
  const lastMinutePercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.lastMinuteDiscountPercent
  );
  const earlyBirdPercentOptions = getSelectOptionsWithCurrent(
    PRICING_DISCOUNT_PERCENT_OPTIONS,
    pricingForm.earlyBirdDiscountPercent
  );
  const lastMinuteDayOptions = getSelectOptionsWithCurrent(
    PRICING_LAST_MINUTE_DAY_OPTIONS,
    pricingForm.lastMinuteDiscountDays
  );
  const earlyBirdDayOptions = getSelectOptionsWithCurrent(
    PRICING_EARLY_BIRD_DAY_OPTIONS,
    pricingForm.earlyBirdDiscountDays
  );

  const updatePricingForm = (patch) => {
    setPricingForm((previous) => normalizePricingForm({ ...previous, ...patch }));
  };

  return (
    <section className={`${styles.card} ${styles.pricingCard}`}>
      <h3 className={styles.sectionTitle}>Pricing</h3>
      <p className={styles.pricingSubtitle}>Define the pricing settings for your listing.</p>

      <div className={styles.pricingBasePanel}>
        <div className={styles.pricingRateRow}>
          <label htmlFor="pricing-nightly-rate" className={styles.pricingRateLabel}>
            Nightly rate
          </label>
          <div className={styles.pricingRateInputWrap}>
            <span aria-hidden="true" className={styles.pricingRateCurrency}>
              EUR
            </span>
            <input
              id="pricing-nightly-rate"
              type="number"
              min={PRICING_MIN_NIGHTLY_RATE_FOR_INPUT}
              max={PRICING_MAX_NIGHTLY_RATE}
              step={1}
              className={styles.pricingRateInput}
              value={pricingForm.nightlyRate === 0 ? "" : pricingForm.nightlyRate}
              onChange={(event) => {
                const nextNightlyRate = event.target.value;
                updatePricingForm({ nightlyRate: nextNightlyRate === "" ? 0 : nextNightlyRate });
              }}
            />
          </div>
        </div>

        <p className={styles.pricingBaseHint}>Set the base nightly rate guests will be charged.</p>

        <div className={styles.pricingStayGrid}>
          <label className={styles.pricingStayField}>
            <span className={styles.pricingStayLabel}>Minimum stay</span>
            <select
              className={styles.pricingSelect}
              value={pricingForm.minimumStay}
              onChange={(event) => {
                const nextMinimumStay = Number(event.target.value);
                const nextMaximumStay =
                  pricingForm.maximumStay !== 0 && pricingForm.maximumStay < nextMinimumStay
                    ? nextMinimumStay
                    : pricingForm.maximumStay;
                updatePricingForm({
                  minimumStay: nextMinimumStay,
                  maximumStay: nextMaximumStay,
                });
              }}>
              {minimumStayOptions.map((value) => (
                <option key={value} value={value}>
                  {getStayOptionLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.pricingStayField}>
            <span className={styles.pricingStayLabel}>Maximum stay</span>
            <select
              className={styles.pricingSelect}
              value={pricingForm.maximumStay}
              onChange={(event) => updatePricingForm({ maximumStay: Number(event.target.value) })}>
              {maximumStayOptions.map((value) => (
                <option key={value} value={value}>
                  {getStayOptionLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <h3 className={styles.sectionTitle}>Discounts</h3>

      <div className={styles.pricingDiscountList}>
        <HostPropertyPricingDiscountRow
          title="Weekly discount"
          description="Discount applied to stays of 7+ nights."
          enabled={pricingForm.weeklyDiscountEnabled}
          onToggle={(enabled) =>
            updatePricingForm({
              weeklyDiscountEnabled: enabled,
              weeklyDiscountPercent:
                enabled && pricingForm.weeklyDiscountPercent === 0
                  ? createInitialPricingForm().weeklyDiscountPercent
                  : pricingForm.weeklyDiscountPercent,
            })
          }
          percentValue={pricingForm.weeklyDiscountPercent}
          percentOptions={weeklyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ weeklyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Monthly discount"
          description="Discount applied to stays of 28+ nights."
          enabled={pricingForm.monthlyDiscountEnabled}
          onToggle={(enabled) =>
            updatePricingForm({
              monthlyDiscountEnabled: enabled,
              monthlyDiscountPercent:
                enabled && pricingForm.monthlyDiscountPercent === 0
                  ? createInitialPricingForm().monthlyDiscountPercent
                  : pricingForm.monthlyDiscountPercent,
            })
          }
          percentValue={pricingForm.monthlyDiscountPercent}
          percentOptions={monthlyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ monthlyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Last minute discount"
          description="Discount applied to bookings made within days of check-in."
          enabled={pricingForm.lastMinuteDiscountEnabled}
          onToggle={(enabled) =>
            updatePricingForm({
              lastMinuteDiscountEnabled: enabled,
              lastMinuteDiscountDays:
                enabled && pricingForm.lastMinuteDiscountDays === 0
                  ? createInitialPricingForm().lastMinuteDiscountDays
                  : pricingForm.lastMinuteDiscountDays,
              lastMinuteDiscountPercent:
                enabled && pricingForm.lastMinuteDiscountPercent === 0
                  ? createInitialPricingForm().lastMinuteDiscountPercent
                  : pricingForm.lastMinuteDiscountPercent,
            })
          }
          percentValue={pricingForm.lastMinuteDiscountPercent}
          percentOptions={lastMinutePercentOptions}
          onPercentChange={(value) => updatePricingForm({ lastMinuteDiscountPercent: value })}
          timingLabel="Timing"
          timingValue={pricingForm.lastMinuteDiscountDays}
          timingOptions={lastMinuteDayOptions}
          onTimingChange={(value) => updatePricingForm({ lastMinuteDiscountDays: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Early bird discount"
          description="Discount applied to bookings made at least selected days in advance."
          enabled={pricingForm.earlyBirdDiscountEnabled}
          onToggle={(enabled) =>
            updatePricingForm({
              earlyBirdDiscountEnabled: enabled,
              earlyBirdDiscountDays:
                enabled && pricingForm.earlyBirdDiscountDays === 0
                  ? createInitialPricingForm().earlyBirdDiscountDays
                  : pricingForm.earlyBirdDiscountDays,
              earlyBirdDiscountPercent:
                enabled && pricingForm.earlyBirdDiscountPercent === 0
                  ? createInitialPricingForm().earlyBirdDiscountPercent
                  : pricingForm.earlyBirdDiscountPercent,
            })
          }
          percentValue={pricingForm.earlyBirdDiscountPercent}
          percentOptions={earlyBirdPercentOptions}
          onPercentChange={(value) => updatePricingForm({ earlyBirdDiscountPercent: value })}
          timingLabel="Timing"
          timingValue={pricingForm.earlyBirdDiscountDays}
          timingOptions={earlyBirdDayOptions}
          onTimingChange={(value) => updatePricingForm({ earlyBirdDiscountDays: value })}
        />
      </div>

      <p className={styles.pricingHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />{" "}
        <span>Strategic discounts can help increase occupancy and revenue.</span>
      </p>
    </section>
  );
}

function PolicyRuleSection({
  title,
  toggleFields,
  toggleState,
  onToggleChange,
  disabled,
  customRules = [],
  onToggleCustomRule = () => {},
  onDeleteCustomRule = () => {},
  customRuleInputVisible = false,
  customRuleValue = "",
  onCustomRuleChange = () => {},
  onConfirmCustomRule = () => {},
  onCancelCustomRule = () => {},
  onShowCustomRuleInput = () => {},
}) {
  return (
    <section className={`${styles.card} ${styles.policiesCard}`}>
      <h3 className={styles.sectionTitle}>{title}</h3>

      <div className={styles.rulesGrid}>
        {toggleFields.map((field) => (
          <RuleToggleField
            key={field.rule || field.key}
            label={field.label}
            checked={Boolean(toggleState[field.rule || field.key])}
            onChange={(value) => onToggleChange(field.rule || field.key, value)}
            disabled={disabled}
          />
        ))}

        {customRules.map((rule) => (
          <CustomRuleRow key={rule.id} rule={rule} onToggle={onToggleCustomRule} onDelete={onDeleteCustomRule} />
        ))}
      </div>

      <CustomRuleEditor
        visible={customRuleInputVisible}
        value={customRuleValue}
        onChange={onCustomRuleChange}
        onConfirm={onConfirmCustomRule}
        onCancel={onCancelCustomRule}
        onShow={onShowCustomRuleInput}
      />
    </section>
  );
}

const createCustomRule = (label) => ({
  id: Date.now(),
  label: label.trim(),
  enabled: false,
});

function useRuleSectionState(initialToggleState) {
  const [toggleState, setToggleState] = useState(initialToggleState);
  const [customRules, setCustomRules] = useState([]);
  const [newRuleValue, setNewRuleValue] = useState("");
  const [showRuleInput, setShowRuleInput] = useState(false);

  const addCustomRule = () => {
    if (!newRuleValue.trim()) {
      return;
    }
    setCustomRules((previous) => [...previous, createCustomRule(newRuleValue)]);
    setNewRuleValue("");
    setShowRuleInput(false);
  };

  const toggleCustomRule = (ruleId, value) => {
    setCustomRules((previous) => previous.map((rule) => (rule.id === ruleId ? { ...rule, enabled: value } : rule)));
  };

  const deleteCustomRule = (ruleId) => {
    setCustomRules((previous) => previous.filter((rule) => rule.id !== ruleId));
  };

  const cancelCustomRule = () => {
    setShowRuleInput(false);
    setNewRuleValue("");
  };

  return {
    toggleState,
    setToggleState,
    customRules,
    newRuleValue,
    setNewRuleValue,
    showRuleInput,
    setShowRuleInput,
    addCustomRule,
    toggleCustomRule,
    deleteCustomRule,
    cancelCustomRule,
  };
}

const POLICY_TOGGLE_FIELDS = [
  { rule: "SuitableForChildren", label: "Children allowed" },
  { rule: "SuitableForInfants", label: "Infants allowed" },
  { rule: "PetsAllowed", label: "Pets allowed" },
  { rule: "SmokingAllowed", label: "Smoking allowed" },
  { rule: "Parties/EventsAllowed", label: "Parties / Events allowed" },
];
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return `${h}:00`;
});
const ADVANCE_NOTICE_OPTIONS = [
  { value: 0, label: "Same day" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 5, label: "5 days" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];
const PREPARATION_TIME_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 4, label: "4 days" },
  { value: 5, label: "5 days" },
  { value: 6, label: "6 days" },
  { value: 7, label: "7 days" },
];
const CHECK_IN_FALLBACK_TIME = "15:00";
const CHECK_OUT_FALLBACK_TIME = "11:00";
const PROPERTY_RULE_TOGGLE_FIELDS = [
  { key: "CookingAllowed", label: "Cooking allowed", rule: "CookingAllowed" },
  { key: "ParkingAvailable", label: "Parking available", rule: "ParkingAvailable" },
];
const SAFETY_RULE_TOGGLE_FIELDS = [
  { key: "smokeDetector", label: "Smoke detector" },
  { key: "carbonMonoxide", label: "Carbon monoxide" },
  { key: "fireExtinguisher", label: "Fire extinguisher" },
  { key: "firstAidKit", label: "First aid kit" },
];

const resolveDistinctLateTime = (fromValue, preferredTillValue, fallbackFromValue) => {
  const normalizedFromValue = fromValue || fallbackFromValue;
  const normalizedPreferredTillValue = preferredTillValue || normalizedFromValue;

  if (normalizedPreferredTillValue && normalizedPreferredTillValue !== normalizedFromValue) {
    return normalizedPreferredTillValue;
  }

  const selectedTimeIndex = TIME_OPTIONS.indexOf(normalizedFromValue);
  if (selectedTimeIndex >= 0 && selectedTimeIndex < TIME_OPTIONS.length - 1) {
    return TIME_OPTIONS[selectedTimeIndex + 1];
  }

  return normalizedFromValue;
};

export default function HostPropertyPoliciesTab(props) {
  const {
    policyRules,
    checkInDetails,
    policyAvailabilitySettings,
    setCheckInDetails,
    setPolicyAvailabilitySettings,
    updatePolicyRule,
    handleDeletePropertyClick,
    saving,
  } = props;
  const [selectedPolicy, setSelectedPolicy] = useState("flexible");
  const [cancellationPolicy, setCancellationPolicy] = useState("flexible");

  // Sync cancellation policy from policyRules
  useEffect(() => {
    const policyOrder = ["Strict", "Firm", "Moderate", "Flexible"];
    for (const policyName of policyOrder) {
      if (policyRules[`CancellationPolicy:${policyName}`]) {
        const policyId = policyName.toLowerCase();
        setSelectedPolicy(policyId);
        setCancellationPolicy(policyId);
        return;
      }
    }
    // No policy selected, reset to default
    setSelectedPolicy("flexible");
    setCancellationPolicy("flexible");
  }, [policyRules]);
  const [expandedPolicy, setExpandedPolicy] = useState("flexible");
  const safetyRuleSection = useRuleSectionState({
    smokeDetector: true,
    carbonMonoxide: true,
    fireExtinguisher: true,
    firstAidKit: true,
  });

  const handleSelectPolicy = (id) => {
    setSelectedPolicy(id);
    setCancellationPolicy(id);
    updatePolicyRule(`CancellationPolicy:${id.charAt(0).toUpperCase() + id.slice(1)}`, true);
    CANCELLATION_POLICIES.filter((p) => p.id !== id).forEach((p) => {
      updatePolicyRule(`CancellationPolicy:${p.id.charAt(0).toUpperCase() + p.id.slice(1)}`, false);
    });
    setExpandedPolicy(id);
  };

  const toggleExpandPolicy = (id) => {
    setExpandedPolicy((prev) => (prev === id ? null : id));
  };

  const lateCheckInEnabled = Boolean(
    checkInDetails?.checkIn?.till && checkInDetails?.checkIn?.till !== checkInDetails?.checkIn?.from
  );
  const lateCheckOutEnabled = Boolean(
    checkInDetails?.checkOut?.till && checkInDetails?.checkOut?.till !== checkInDetails?.checkOut?.from
  );

  const updateTimeWindow = (windowKey, fallbackValue, lateEnabled, nextValue) => {
    setCheckInDetails((previous) => {
      const currentWindow = previous?.[windowKey] || {};
      return {
        ...previous,
        [windowKey]: {
          ...currentWindow,
          from: nextValue,
          till: lateEnabled ? resolveDistinctLateTime(nextValue, currentWindow.till, fallbackValue) : nextValue,
        },
      };
    });
  };

  const updateLateTimeWindow = (windowKey, fallbackValue, enabled, nextValue) => {
    setCheckInDetails((previous) => {
      const currentWindow = previous?.[windowKey] || {};
      const currentFrom = currentWindow.from || fallbackValue;
      const currentTill = currentWindow.till || currentFrom;
      return {
        ...previous,
        [windowKey]: {
          ...currentWindow,
          from: currentFrom,
          till: enabled ? resolveDistinctLateTime(currentFrom, nextValue || currentTill, fallbackValue) : currentFrom,
        },
      };
    });
  };

  const updatePolicyAvailabilityField = (field, value) => {
    setPolicyAvailabilitySettings((previous) => ({
      ...previous,
      [field]: Number(value) || 0,
    }));
  };

  const policyRuleSections = [
    {
      title: "Property Rules",
      toggleFields: PROPERTY_RULE_TOGGLE_FIELDS,
      policyRules,
      updatePolicyRule,
      saving,
    },
    {
      title: "Safety & Property",
      toggleFields: SAFETY_RULE_TOGGLE_FIELDS,
      sectionState: safetyRuleSection,
    },
  ];
  const checkInFieldSections = [
    {
      id: "checkin",
      label: "Check-in",
      windowKey: "checkIn",
      fallbackValue: CHECK_IN_FALLBACK_TIME,
      lateEnabled: lateCheckInEnabled,
      values: checkInDetails?.checkIn,
    },
    {
      id: "checkout",
      label: "Check-out",
      windowKey: "checkOut",
      fallbackValue: CHECK_OUT_FALLBACK_TIME,
      lateEnabled: lateCheckOutEnabled,
      values: checkInDetails?.checkOut,
    },
  ];
  const policyAvailabilityFields = [
    {
      id: "advance-notice",
      label: "Minimum advance notice",
      hint: "Minimum amount of notice required before a guest can book.",
      value: policyAvailabilitySettings?.advanceNoticeDays ?? 0,
      field: "advanceNoticeDays",
      options: ADVANCE_NOTICE_OPTIONS,
    },
    {
      id: "prep-time",
      label: "Preparation time",
      hint: "Time required between bookings to clean and prepare the property.",
      value: policyAvailabilitySettings?.preparationTimeDays ?? 0,
      field: "preparationTimeDays",
      options: PREPARATION_TIME_OPTIONS,
    },
  ];

  return (
    <>
      <section className={`${styles.card} ${styles.policiesCard}`}>
        <h3 className={styles.sectionTitle}>Cancellation Policies</h3>

        <div className={styles.cancellationPolicyList}>
          {CANCELLATION_POLICIES.map((policy) => {
            const isSelected = cancellationPolicy === policy.id;
            const isExpanded = expandedPolicy === policy.id;

            return (
              <div
                key={policy.id}
                className={`${styles.cancellationPolicyItem} ${isSelected ? styles.cancellationPolicyItemSelected : ""}`}>
                <button
                  type="button"
                  className={styles.cancellationPolicyRow}
                  onClick={() => handleSelectPolicy(policy.id)}>
                  <div className={styles.cancellationPolicyRadioGroup}>
                    <span
                      className={`${styles.cancellationPolicyRadio} ${isSelected ? styles.cancellationPolicyRadioSelected : ""}`}>
                      {isSelected && <span className={styles.cancellationPolicyRadioDot} />}
                    </span>
                    <span className={styles.cancellationPolicyName}>{policy.name}</span>
                  </div>
                  <div className={styles.cancellationPolicySummaryRow}>
                    {isSelected && <span className={styles.cancellationPolicyCheck}>✓</span>}
                    <span
                      className={`${styles.cancellationPolicySummary} ${isSelected ? styles.cancellationPolicySummaryActive : ""}`}>
                      {policy.summary}
                    </span>
                  </div>
                </button>

                {isSelected && isExpanded && (
                  <div className={styles.cancellationPolicyDetails}>
                    <p className={styles.cancellationPolicyDetailsTitle}>{policy.name}</p>
                    <p className={styles.cancellationPolicyDetailsSubtitle}>If your guest cancels:</p>
                    <ul className={styles.cancellationPolicyDetailsList}>
                      {policy.rules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                    {policy.important && (
                      <p className={styles.cancellationPolicyImportant}>
                        <strong>Important:</strong> {policy.important}
                      </p>
                    )}
                    <button
                      type="button"
                      className={styles.cancellationPolicyHideBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandPolicy(policy.id);
                      }}>
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${styles.card} ${styles.policiesCard}`}>
        <h3 className={styles.sectionTitle}>Check-in &amp; Check-out</h3>

        <div className={styles.checkinGrid}>
          {checkInFieldSections.map(({ id, label, windowKey, fallbackValue, lateEnabled, values }) => (
            <React.Fragment key={id}>
              <PolicySelectField
                id={`${id}-time`}
                label={`${label} time`}
                value={values?.from || fallbackValue}
                onChange={(event) => updateTimeWindow(windowKey, fallbackValue, lateEnabled, event.target.value)}
                disabled={saving}
                options={TIME_OPTIONS}
              />

              <PolicyLateTimeField
                id={`late-${id}-time`}
                label={`Late ${label.toLowerCase()} time`}
                enabled={lateEnabled}
                onToggle={(enabled) =>
                  updateLateTimeWindow(
                    windowKey,
                    fallbackValue,
                    enabled,
                    enabled ? values?.till || values?.from || fallbackValue : ""
                  )
                }
                value={values?.till || values?.from || fallbackValue}
                onChange={(event) => updateLateTimeWindow(windowKey, fallbackValue, true, event.target.value)}
                disabled={saving}
                options={TIME_OPTIONS}
              />
            </React.Fragment>
          ))}

          {policyAvailabilityFields.map(({ id, label, hint, value, field, options }) => (
            <PolicySelectField
              key={id}
              id={id}
              label={label}
              hint={hint}
              value={value}
              onChange={(event) => updatePolicyAvailabilityField(field, event.target.value)}
              disabled={saving}
              options={options}
            />
          ))}
        </div>
      </section>

      <section className={`${styles.card} ${styles.policiesCard}`}>
        <h3 className={styles.sectionTitle}>House Rules</h3>

        <div className={styles.rulesGrid}>
          {POLICY_TOGGLE_FIELDS.map((field) => (
            <RuleToggleField
              key={field.rule}
              label={field.label}
              checked={Boolean(policyRules[field.rule])}
              onChange={(val) => updatePolicyRule(field.rule, val)}
              disabled={saving}
            />
          ))}
        </div>
      </section>

      {policyRuleSections.map(({ title, toggleFields, policyRules, updatePolicyRule, saving, sectionState }) => (
        <PolicyRuleSection
          key={title}
          title={title}
          toggleFields={toggleFields}
          toggleState={policyRules}
          onToggleChange={(fieldKey, value) => updatePolicyRule(fieldKey, value)}
          disabled={saving}
          {...(sectionState || {})}
        />
      ))}

      <p className={styles.policiesHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />
        <span>Clear policies help set expectations and avoid misunderstandings with guests.</span>
      </p>

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
          disabled={saving}>
          Delete permanently
        </button>
      </section>
    </>
  );
}

export function HostPropertyTabContent(props) {
  const { selectedTab, pricingForm, setPricingForm } = props;
  switch (selectedTab) {
    case "Overview":
      return <HostPropertyOverviewTab {...props} />;
    case "Photos":
      return <HostPropertyPhotosTab {...props} />;
    case "Amenities":
      return <HostPropertyAmenitiesTab {...props} />;
    case "Pricing":
      return <HostPropertyPricingTab pricingForm={pricingForm} setPricingForm={setPricingForm} />;
    case "Policies":
      return <HostPropertyPoliciesTab {...props} />;
    default:
      return <HostPropertyPlaceholderTab selectedTab={selectedTab} />;
  }
}

const propertyFormShape = PropTypes.shape({
  title: PropTypes.string,
  subtitle: PropTypes.string,
  description: PropTypes.string,
});

const propertyCapacityShape = PropTypes.shape({
  propertyType: PropTypes.string,
  guests: PropTypes.number,
  bedrooms: PropTypes.number,
  beds: PropTypes.number,
  bathrooms: PropTypes.number,
});

const propertyAddressShape = PropTypes.shape({
  street: PropTypes.string,
  houseNumber: PropTypes.string,
  postalCode: PropTypes.string,
  city: PropTypes.string,
  country: PropTypes.string,
});

const pricingFormShape = PropTypes.shape({
  nightlyRate: PropTypes.number,
  minimumStay: PropTypes.number,
  maximumStay: PropTypes.number,
  weeklyDiscountEnabled: PropTypes.bool,
  weeklyDiscountPercent: PropTypes.number,
  monthlyDiscountEnabled: PropTypes.bool,
  monthlyDiscountPercent: PropTypes.number,
  lastMinuteDiscountEnabled: PropTypes.bool,
  lastMinuteDiscountDays: PropTypes.number,
  lastMinuteDiscountPercent: PropTypes.number,
  earlyBirdDiscountEnabled: PropTypes.bool,
  earlyBirdDiscountDays: PropTypes.number,
  earlyBirdDiscountPercent: PropTypes.number,
});

const amenityShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  amenity: PropTypes.string,
});

const displayedPhotoShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  src: PropTypes.string.isRequired,
  isPending: PropTypes.bool.isRequired,
});

const customRuleShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  enabled: PropTypes.bool.isRequired,
});

const overviewTabPropTypes = {
  form: propertyFormShape.isRequired,
  updateField: PropTypes.func.isRequired,
  displayedPropertyType: PropTypes.string.isRequired,
  setCapacity: PropTypes.func.isRequired,
  capacity: propertyCapacityShape.isRequired,
  adjustCapacityField: PropTypes.func.isRequired,
  updateCapacityField: PropTypes.func.isRequired,
  address: propertyAddressShape.isRequired,
  updateAddressField: PropTypes.func.isRequired,
};

const photoTabPropTypes = {
  displayedPhotos: PropTypes.arrayOf(displayedPhotoShape).isRequired,
  pendingPhotoCount: PropTypes.number.isRequired,
  onOpenPhotoPicker: PropTypes.func.isRequired,
  onPhotoFilesSelected: PropTypes.func.isRequired,
  onPhotoDrop: PropTypes.func.isRequired,
  onPhotoDragOver: PropTypes.func.isRequired,
  onPhotoDragLeave: PropTypes.func.isRequired,
  isPhotoDragOver: PropTypes.bool.isRequired,
  onRequestDeletePhoto: PropTypes.func.isRequired,
  onPhotoTileDragStart: PropTypes.func.isRequired,
  onPhotoTileDragEnd: PropTypes.func.isRequired,
  onPhotoTileDragOver: PropTypes.func.isRequired,
  onPhotoTileDragLeave: PropTypes.func.isRequired,
  onPhotoTileDrop: PropTypes.func.isRequired,
  draggingPhotoId: PropTypes.string,
  photoDropTargetId: PropTypes.string,
  saving: PropTypes.bool.isRequired,
  deletingPhoto: PropTypes.bool.isRequired,
  photoInputRef: PropTypes.shape({
    current: PropTypes.any,
  }).isRequired,
};

const amenitiesTabPropTypes = {
  amenityCategoryKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  amenitiesByCategory: PropTypes.objectOf(PropTypes.arrayOf(amenityShape)).isRequired,
  expandedAmenityCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
  selectedAmenityCountByCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedAmenityIdSet: PropTypes.instanceOf(Set).isRequired,
  toggleAmenityCategory: PropTypes.func.isRequired,
  toggleAmenitySelection: PropTypes.func.isRequired,
};

const policiesTabPropTypes = {
  policyRules: PropTypes.objectOf(PropTypes.bool).isRequired,
  checkInDetails: PropTypes.shape({
    checkIn: PropTypes.shape({
      from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      till: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    checkOut: PropTypes.shape({
      from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      till: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
  policyAvailabilitySettings: PropTypes.shape({
    advanceNoticeDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    preparationTimeDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    advanceNoticeRestrictionKey: PropTypes.string,
    preparationTimeRestrictionKey: PropTypes.string,
  }),
  setCheckInDetails: PropTypes.func.isRequired,
  setPolicyAvailabilitySettings: PropTypes.func.isRequired,
  updatePolicyRule: PropTypes.func.isRequired,
  handleDeletePropertyClick: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyOverviewTab.propTypes = overviewTabPropTypes;

HostPropertyPhotosTab.propTypes = photoTabPropTypes;

HostPropertyPhotoDeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  photoSrc: PropTypes.string,
  deletingPhoto: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

HostPropertyAmenitiesTab.propTypes = amenitiesTabPropTypes;

HostPropertyPricingDiscountRow.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  enabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  percentValue: PropTypes.number.isRequired,
  percentOptions: PropTypes.arrayOf(PropTypes.number).isRequired,
  onPercentChange: PropTypes.func.isRequired,
  timingLabel: PropTypes.string,
  timingValue: PropTypes.number,
  timingOptions: PropTypes.arrayOf(PropTypes.number),
  onTimingChange: PropTypes.func,
};

HostPropertyPricingTab.propTypes = {
  pricingForm: pricingFormShape.isRequired,
  setPricingForm: PropTypes.func.isRequired,
};

PolicyRuleSection.propTypes = {
  title: PropTypes.string.isRequired,
  onToggleChange: PropTypes.func,
  toggleFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  toggleState: PropTypes.objectOf(PropTypes.bool).isRequired,
  setToggleState: PropTypes.func.isRequired,
  customRules: PropTypes.arrayOf(customRuleShape).isRequired,
  onToggleCustomRule: PropTypes.func.isRequired,
  onDeleteCustomRule: PropTypes.func.isRequired,
  customRuleInputVisible: PropTypes.bool.isRequired,
  customRuleValue: PropTypes.string.isRequired,
  onCustomRuleChange: PropTypes.func.isRequired,
  onConfirmCustomRule: PropTypes.func.isRequired,
  onCancelCustomRule: PropTypes.func.isRequired,
  onShowCustomRuleInput: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

HostPropertyPoliciesTab.propTypes = policiesTabPropTypes;

HostPropertyTabContent.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  checkinTime: PropTypes.string,
  setCheckinTime: PropTypes.func,
  checkoutTime: PropTypes.string,
  setCheckoutTime: PropTypes.func,
  lateCheckinEnabled: PropTypes.bool,
  setLateCheckinEnabled: PropTypes.func,
  lateCheckinTime: PropTypes.string,
  setLateCheckinTime: PropTypes.func,
  lateCheckoutEnabled: PropTypes.bool,
  setLateCheckoutEnabled: PropTypes.func,
  lateCheckoutTime: PropTypes.string,
  setLateCheckoutTime: PropTypes.func,
  houseRules: PropTypes.object,
  setHouseRules: PropTypes.func,
  updateHouseRule: PropTypes.func,
  propertyRules: PropTypes.object,
  setPropertyRules: PropTypes.func,
  updatePropertyRule: PropTypes.func,
  customPropertyRules: PropTypes.array,
  setCustomPropertyRules: PropTypes.func,
  safetyRules: PropTypes.object,
  setSafetyRules: PropTypes.func,
  updateSafetyRule: PropTypes.func,
  customSafetyRules: PropTypes.array,
  setCustomSafetyRules: PropTypes.func,
  selectedCancellationPolicy: PropTypes.string,
  setSelectedCancellationPolicy: PropTypes.func,
  ...overviewTabPropTypes,
  ...photoTabPropTypes,
  ...amenitiesTabPropTypes,
  pricingForm: pricingFormShape.isRequired,
  setPricingForm: PropTypes.func.isRequired,
  ...policiesTabPropTypes,
};

ToggleSwitch.propTypes = {
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

CustomRuleRow.propTypes = {
  rule: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

PolicySelectField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
      }),
    ])
  ).isRequired,
  hint: PropTypes.string,
};

PolicyLateTimeField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  enabled: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
};

RuleToggleField.propTypes = {
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

CustomRuleEditor.propTypes = {
  visible: PropTypes.bool.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onShow: PropTypes.func.isRequired,
};

TextInputField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
};

TextareaField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  rows: PropTypes.number,
};
