import React, { useState } from "react";
import { HOST_DISTRIBUTION_STATE, useHostDistribution } from "../hooks/useHostDistribution";
import {
  LISTING_VIEW,
  PLATFORMS,
  describeListingView,
  describeMissingItems,
  describePlatformCard,
} from "../utils/distributionStates";
import PlatformCard from "./PlatformCard";
import { NotReadyNotice, SetupFailedNotice } from "./DistributionNotices";

const LOADING_MESSAGE = "Loading your listings…";
const NO_LISTINGS_MESSAGE = "You have no listings yet.";
const LOAD_ERROR_MESSAGE = "We couldn't load your listings.";
const REFRESHING_MESSAGE = "Refreshing…";
const REFRESH_ERROR_MESSAGE = "We couldn't refresh your connections.";

// The three OTA cards of the picked listing (design note #3954, D7), or the notice that explains why
// there are none. Orchestration only: what each card says lives in utils/distributionStates.js.
function PlatformCardsSection() {
  const { listings, loadState, reload, refresh, refreshingPropertyId, refreshFailedPropertyId } = useHostDistribution();
  const [pickedPropertyId, setPickedPropertyId] = useState("");

  if (loadState === HOST_DISTRIBUTION_STATE.LOADING) {
    return <output className="host-chdist__empty-text">{LOADING_MESSAGE}</output>;
  }

  if (loadState === HOST_DISTRIBUTION_STATE.ERROR) {
    return (
      <div className="host-chdist__error" role="alert">
        <p className="host-chdist__error-text">{LOAD_ERROR_MESSAGE}</p>
        <button type="button" className="chdist-btn chdist-btn--primary" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return <output className="host-chdist__empty-text">{NO_LISTINGS_MESSAGE}</output>;
  }

  // Defaults to the first listing, and falls back to it if the picked one disappears.
  const selected = listings.find((listing) => listing.propertyId === pickedPropertyId) ?? listings[0];
  const listingView = describeListingView(selected);
  const isRefreshing = refreshingPropertyId === selected.propertyId;

  return (
    <div className="chdist-card-list">
      {listings.length > 1 && (
        <label className="host-chdist__picker">
          <span className="host-chdist__picker-label">Property</span>
          <select
            className="host-chdist__picker-select"
            value={selected.propertyId}
            onChange={(event) => setPickedPropertyId(event.target.value)}>
            {listings.map((listing) => (
              <option key={listing.propertyId} value={listing.propertyId}>
                {listing.title || listing.propertyId}
              </option>
            ))}
          </select>
        </label>
      )}

      {listingView === LISTING_VIEW.NOT_READY && (
        <NotReadyNotice items={describeMissingItems(selected.readiness?.missing)} />
      )}

      {listingView === LISTING_VIEW.SETUP_FAILED && <SetupFailedNotice />}

      {listingView === LISTING_VIEW.CARDS && (
        <>
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.otaCode}
              platform={platform}
              state={describePlatformCard(selected, platform.otaCode)}
            />
          ))}
          <div className="chdist-card__row">
            <button
              type="button"
              className="chdist-btn chdist-btn--secondary"
              disabled={isRefreshing}
              onClick={() => refresh(selected.propertyId)}>
              Refresh
            </button>
            {isRefreshing && <output className="host-chdist__empty-text">{REFRESHING_MESSAGE}</output>}
          </div>
          {refreshFailedPropertyId === selected.propertyId && (
            <p className="host-chdist__error-text" role="alert">
              {REFRESH_ERROR_MESSAGE}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default PlatformCardsSection;
