import React, { useLayoutEffect, useRef } from "react";
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

function HostPropertyOverviewTab({
  form,
  updateField,
  displayedPropertyType,
  setCapacity,
  capacity,
  adjustCapacityField,
  updateCapacityField,
  address,
  updateAddressField,
}) {
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
          onClick={() => adjustCapacityField(key, 1)}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
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
        {CAPACITY_COUNTER_FIELDS.map((field) => renderCapacityCounter(field))}
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
            .filter(Boolean)
            .join(", ") || "Address details are not fully available yet."}
        </p>
      </div>
    </section>
  );
}

function HostPropertyPhotosTab({
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
}) {
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

  const renderPhotoTile = ({
    photo,
    wrapperClassName,
    tileClassName,
    imageClassName,
    ariaLabel,
    imageAlt,
  }) => (
    <div
      key={photo.id}
      className={`${styles.photoTileActionWrap} ${wrapperClassName}`}
      data-photo-id={photo.id}
      ref={(node) => setPhotoTileRef(photo.id, node)}
    >
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
        aria-label={ariaLabel}
      >
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
        aria-label="Delete photo"
      >
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
            disabled={saving}
          >
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

        <div className={styles.photosSecondaryGrid}>
          {renderGridTiles()}
        </div>
      </div>

      <div className={styles.photoCategoryGrid}>
        {PHOTO_CATEGORY_PLACEHOLDERS.map((category) => (
          <article key={category} className={styles.photoCategoryItem}>
            <span className={styles.photoCategoryName}>{category}</span>
            <button
              type="button"
              className={styles.photoCategoryAddButton}
              onClick={onOpenPhotoPicker}
              disabled={saving}
            >
              +Add
            </button>
          </article>
        ))}
      </div>

      <p className={styles.photosHint}>
        <img src={infoIcon} alt="" aria-hidden="true" className={styles.policiesHintIcon} />{" "}
        Listings with 10+ high-quality photos receive 30% more bookings.
      </p>

      <p className={styles.photosMeta}>
        {totalPhotoCount} / {MAX_PROPERTY_IMAGES} photos
        {pendingPhotoCount > 0 ? ` (${pendingPhotoCount} pending save)` : ""}
      </p>
    </section>
  );
}

export function HostPropertyPhotoDeleteModal({
  open,
  photoSrc,
  deletingPhoto,
  onCancel,
  onConfirm,
}) {
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
      }}
    >
      <section className={styles.photoDeleteModal}>
        <img src={photoSrc} alt="Selected listing preview" className={styles.photoDeletePreview} />

        <h4 id="photo-delete-modal-title" className={styles.photoDeleteTitle}>
          Delete this photo?
        </h4>
        <p className={styles.photoDeleteDescription}>
          This photo will be permanently removed from your listing.
        </p>

        <div className={styles.photoDeleteActions}>
          <button
            type="button"
            className={styles.photoDeleteCancelButton}
            onClick={onCancel}
            disabled={deletingPhoto}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.photoDeleteConfirmButton}
            onClick={onConfirm}
            disabled={deletingPhoto}
          >
            {deletingPhoto ? "Deleting..." : "Delete"}
          </button>
        </div>
      </section>
    </dialog>
  );
}

function HostPropertyAmenitiesTab({
  amenityCategoryKeys,
  amenitiesByCategory,
  expandedAmenityCategories,
  selectedAmenityCountByCategory,
  selectedAmenityIdSet,
  toggleAmenityCategory,
  toggleAmenitySelection,
}) {
  return (
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
              disabled={!enabled}
            >
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
            disabled={!enabled}
          >
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
            <span aria-hidden="true" className={styles.pricingRateCurrency}>EUR</span>
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

        <div className={styles.pricingRateRow}>
          <label htmlFor="pricing-weekend-rate" className={styles.pricingRateLabel}>
            Weekend rate
          </label>
          <div className={styles.pricingRateInputWrap}>
            <span aria-hidden="true" className={styles.pricingRateCurrency}>EUR</span>
            <input
              id="pricing-weekend-rate"
              type="number"
              min={PRICING_MIN_NIGHTLY_RATE_FOR_INPUT}
              max={PRICING_MAX_NIGHTLY_RATE}
              step={1}
              className={styles.pricingRateInput}
              value={pricingForm.weekendRate === 0 ? "" : pricingForm.weekendRate}
              onChange={(event) => {
                const nextWeekendRate = event.target.value;
                updatePricingForm({ weekendRate: nextWeekendRate === "" ? 0 : nextWeekendRate });
              }}
            />
          </div>
        </div>

        <p className={styles.pricingBaseHint}>
          Set the base nightly rate and weekend rate guests will be charged.
        </p>

        <div className={styles.pricingStayGrid}>
          <label className={styles.pricingStayField}>
            <span className={styles.pricingStayLabel}>Minimum stay</span>
            <select
              className={styles.pricingSelect}
              value={pricingForm.minimumStay}
              onChange={(event) => {
                const nextMinimumStay = Number(event.target.value);
                const nextMaximumStay = pricingForm.maximumStay !== 0 && pricingForm.maximumStay < nextMinimumStay
                  ? nextMinimumStay
                  : pricingForm.maximumStay;
                updatePricingForm({
                  minimumStay: nextMinimumStay,
                  maximumStay: nextMaximumStay,
                });
              }}
            >
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
              onChange={(event) => updatePricingForm({ maximumStay: Number(event.target.value) })}
            >
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
          onToggle={(enabled) => updatePricingForm({
            weeklyDiscountEnabled: enabled,
            weeklyDiscountPercent: enabled && pricingForm.weeklyDiscountPercent === 0
              ? createInitialPricingForm().weeklyDiscountPercent
              : pricingForm.weeklyDiscountPercent,
          })}
          percentValue={pricingForm.weeklyDiscountPercent}
          percentOptions={weeklyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ weeklyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Monthly discount"
          description="Discount applied to stays of 28+ nights."
          enabled={pricingForm.monthlyDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            monthlyDiscountEnabled: enabled,
            monthlyDiscountPercent: enabled && pricingForm.monthlyDiscountPercent === 0
              ? createInitialPricingForm().monthlyDiscountPercent
              : pricingForm.monthlyDiscountPercent,
          })}
          percentValue={pricingForm.monthlyDiscountPercent}
          percentOptions={monthlyPercentOptions}
          onPercentChange={(value) => updatePricingForm({ monthlyDiscountPercent: value })}
        />
        <HostPropertyPricingDiscountRow
          title="Last minute discount"
          description="Discount applied to bookings made within days of check-in."
          enabled={pricingForm.lastMinuteDiscountEnabled}
          onToggle={(enabled) => updatePricingForm({
            lastMinuteDiscountEnabled: enabled,
            lastMinuteDiscountDays: enabled && pricingForm.lastMinuteDiscountDays === 0
              ? createInitialPricingForm().lastMinuteDiscountDays
              : pricingForm.lastMinuteDiscountDays,
            lastMinuteDiscountPercent: enabled && pricingForm.lastMinuteDiscountPercent === 0
              ? createInitialPricingForm().lastMinuteDiscountPercent
              : pricingForm.lastMinuteDiscountPercent,
          })}
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
          onToggle={(enabled) => updatePricingForm({
            earlyBirdDiscountEnabled: enabled,
            earlyBirdDiscountDays: enabled && pricingForm.earlyBirdDiscountDays === 0
              ? createInitialPricingForm().earlyBirdDiscountDays
              : pricingForm.earlyBirdDiscountDays,
            earlyBirdDiscountPercent: enabled && pricingForm.earlyBirdDiscountPercent === 0
              ? createInitialPricingForm().earlyBirdDiscountPercent
              : pricingForm.earlyBirdDiscountPercent,
          })}
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
        Strategic discounts can help increase occupancy and revenue.
      </p>
    </section>
  );
}

function HostPropertyPoliciesTab({ policyRules, updatePolicyRule, handleDeletePropertyClick, saving }) {
  return (
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
        {" "}
        Clear policies help set expectations and avoid misunderstandings with guests.
      </p>
    </>
  );
}

export function HostPropertyTabContent({
  selectedTab,
  form,
  updateField,
  displayedPropertyType,
  setCapacity,
  capacity,
  adjustCapacityField,
  updateCapacityField,
  address,
  updateAddressField,
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
  deletingPhoto,
  photoInputRef,
  amenityCategoryKeys,
  amenitiesByCategory,
  expandedAmenityCategories,
  selectedAmenityCountByCategory,
  selectedAmenityIdSet,
  toggleAmenityCategory,
  toggleAmenitySelection,
  pricingForm,
  setPricingForm,
  policyRules,
  updatePolicyRule,
  handleDeletePropertyClick,
  saving,
}) {
  switch (selectedTab) {
    case "Overview":
      return (
        <HostPropertyOverviewTab
          form={form}
          updateField={updateField}
          displayedPropertyType={displayedPropertyType}
          setCapacity={setCapacity}
          capacity={capacity}
          adjustCapacityField={adjustCapacityField}
          updateCapacityField={updateCapacityField}
          address={address}
          updateAddressField={updateAddressField}
        />
      );
    case "Photos":
      return (
        <HostPropertyPhotosTab
          displayedPhotos={displayedPhotos}
          pendingPhotoCount={pendingPhotoCount}
          onOpenPhotoPicker={onOpenPhotoPicker}
          onPhotoFilesSelected={onPhotoFilesSelected}
          onPhotoDrop={onPhotoDrop}
          onPhotoDragOver={onPhotoDragOver}
          onPhotoDragLeave={onPhotoDragLeave}
          isPhotoDragOver={isPhotoDragOver}
          onRequestDeletePhoto={onRequestDeletePhoto}
          onPhotoTileDragStart={onPhotoTileDragStart}
          onPhotoTileDragEnd={onPhotoTileDragEnd}
          onPhotoTileDragOver={onPhotoTileDragOver}
          onPhotoTileDragLeave={onPhotoTileDragLeave}
          onPhotoTileDrop={onPhotoTileDrop}
          draggingPhotoId={draggingPhotoId}
          photoDropTargetId={photoDropTargetId}
          saving={saving}
          deletingPhoto={deletingPhoto}
          photoInputRef={photoInputRef}
        />
      );
    case "Amenities":
      return (
        <HostPropertyAmenitiesTab
          amenityCategoryKeys={amenityCategoryKeys}
          amenitiesByCategory={amenitiesByCategory}
          expandedAmenityCategories={expandedAmenityCategories}
          selectedAmenityCountByCategory={selectedAmenityCountByCategory}
          selectedAmenityIdSet={selectedAmenityIdSet}
          toggleAmenityCategory={toggleAmenityCategory}
          toggleAmenitySelection={toggleAmenitySelection}
        />
      );
    case "Pricing":
      return (
        <HostPropertyPricingTab
          pricingForm={pricingForm}
          setPricingForm={setPricingForm}
        />
      );
    case "Policies":
      return (
        <HostPropertyPoliciesTab
          policyRules={policyRules}
          updatePolicyRule={updatePolicyRule}
          handleDeletePropertyClick={handleDeletePropertyClick}
          saving={saving}
        />
      );
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
  weekendRate: PropTypes.number,
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

HostPropertyOverviewTab.propTypes = {
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

HostPropertyPhotosTab.propTypes = {
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

HostPropertyPhotoDeleteModal.propTypes = {
  open: PropTypes.bool.isRequired,
  photoSrc: PropTypes.string,
  deletingPhoto: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

HostPropertyAmenitiesTab.propTypes = {
  amenityCategoryKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  amenitiesByCategory: PropTypes.objectOf(PropTypes.arrayOf(amenityShape)).isRequired,
  expandedAmenityCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
  selectedAmenityCountByCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedAmenityIdSet: PropTypes.instanceOf(Set).isRequired,
  toggleAmenityCategory: PropTypes.func.isRequired,
  toggleAmenitySelection: PropTypes.func.isRequired,
};

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

HostPropertyPoliciesTab.propTypes = {
  policyRules: PropTypes.objectOf(PropTypes.bool).isRequired,
  updatePolicyRule: PropTypes.func.isRequired,
  handleDeletePropertyClick: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};

HostPropertyTabContent.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  form: propertyFormShape.isRequired,
  updateField: PropTypes.func.isRequired,
  displayedPropertyType: PropTypes.string.isRequired,
  setCapacity: PropTypes.func.isRequired,
  capacity: propertyCapacityShape.isRequired,
  adjustCapacityField: PropTypes.func.isRequired,
  updateCapacityField: PropTypes.func.isRequired,
  address: propertyAddressShape.isRequired,
  updateAddressField: PropTypes.func.isRequired,
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
  deletingPhoto: PropTypes.bool.isRequired,
  photoInputRef: PropTypes.shape({
    current: PropTypes.any,
  }).isRequired,
  amenityCategoryKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  amenitiesByCategory: PropTypes.objectOf(PropTypes.arrayOf(amenityShape)).isRequired,
  expandedAmenityCategories: PropTypes.objectOf(PropTypes.bool).isRequired,
  selectedAmenityCountByCategory: PropTypes.objectOf(PropTypes.number).isRequired,
  selectedAmenityIdSet: PropTypes.instanceOf(Set).isRequired,
  toggleAmenityCategory: PropTypes.func.isRequired,
  toggleAmenitySelection: PropTypes.func.isRequired,
  pricingForm: pricingFormShape.isRequired,
  setPricingForm: PropTypes.func.isRequired,
  policyRules: PropTypes.objectOf(PropTypes.bool).isRequired,
  updatePolicyRule: PropTypes.func.isRequired,
  handleDeletePropertyClick: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
};
