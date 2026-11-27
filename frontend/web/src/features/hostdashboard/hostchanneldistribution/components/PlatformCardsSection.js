import React, { useEffect, useState } from "react";
import { HOST_DISTRIBUTION_STATE, useHostDistribution } from "../hooks/useHostDistribution";
import {
  DISTRIBUTION_STATUS,
  LISTING_VIEW,
  PLATFORMS,
  describeListingView,
  describeMissingItems,
  describePlatformCard,
} from "../utils/distributionStates";
import { useConnectFlow } from "../hooks/useConnectFlow";
import PlatformCard from "./PlatformCard";
import ConnectFlowLayer from "./ConnectFlowLayer";
import { NotReadyNotice, SettingUpNotice } from "./DistributionNotices";

const LOADING_MESSAGE = "Loading your listings…";
const NO_LISTINGS_MESSAGE = "You have no listings yet.";
const LOAD_ERROR_MESSAGE = "We couldn't load your listings.";
const REFRESHING_MESSAGE = "Refreshing…";
const REFRESH_ERROR_MESSAGE = "We couldn't refresh your connections.";
// A listing in any other state (setting up, or failed halfway) has its own card or notice instead.
const STARTABLE_STATUSES = [DISTRIBUTION_STATUS.READY, DISTRIBUTION_STATUS.NOT_ENABLED];

// The OTA cards of the picked listing (design note #3954, D7), or the notice that says why there are none.
function PlatformCardsSection() {
  const { listings, loadState, reload, rereadListings, refresh, refreshingPropertyId, refreshFailedPropertyId } =
    useHostDistribution();
  const [pickedPropertyId, setPickedPropertyId] = useState("");
  const connectFlow = useConnectFlow({ refresh, rereadListings });
  const { isActive: flowActive, propertyId: flowPropertyId, reset: resetFlow } = connectFlow;
  const flowListingGone = flowActive && !listings.some((listing) => listing.propertyId === flowPropertyId);

  // A reload or a vanished listing unmounts the flow's modals, so the flow ends with them.
  useEffect(() => {
    if (loadState !== HOST_DISTRIBUTION_STATE.LOADED || flowListingGone) resetFlow();
  }, [loadState, flowListingGone, resetFlow]);

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
  // Turned on, state unreadable: shown as setting up until it is known.
  const setupUnconfirmed = connectFlow.unconfirmedSetupPropertyId === selected.propertyId;
  const baseView = describeListingView(selected);
  const listingView = setupUnconfirmed && baseView === LISTING_VIEW.CARDS ? LISTING_VIEW.SETTING_UP : baseView;
  const isRefreshing = refreshingPropertyId === selected.propertyId;

  // While a flow is open the switches, the picker and Refresh are locked: a second flow cannot start under
  // the first, and moving to a listing without cards would unmount the flow's modals.
  const canStartConnect = STARTABLE_STATUSES.includes(selected.distribution?.status) && !connectFlow.isActive;
  const handleToggle = ({ otaCode, turnOn }) => {
    if (!turnOn) return;
    connectFlow.start({
      platform: PLATFORMS.find((platform) => platform.otaCode === otaCode),
      listing: selected,
    });
  };

  return (
    <div className="chdist-card-list">
      {listings.length > 1 && (
        <label className="host-chdist__picker">
          <span className="host-chdist__picker-label">Property</span>
          <select
            className="host-chdist__picker-select"
            value={selected.propertyId}
            disabled={connectFlow.isActive}
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
        <NotReadyNotice items={describeMissingItems(selected.distribution?.missing)} />
      )}

      {listingView === LISTING_VIEW.SETTING_UP && (
        <SettingUpNotice onRetry={() => connectFlow.retry({ listing: selected })} busy={connectFlow.isActive} />
      )}

      {listingView === LISTING_VIEW.CARDS && (
        <>
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.otaCode}
              platform={platform}
              state={describePlatformCard(selected, platform.otaCode)}
              onToggle={canStartConnect ? handleToggle : undefined}
            />
          ))}
          <div className="chdist-card__row">
            <button
              type="button"
              className="chdist-btn chdist-btn--secondary"
              disabled={isRefreshing || connectFlow.isActive}
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

      {/* Outside the cards view, so a Retry from the Setting up notice can show its dialogs. */}
      <ConnectFlowLayer
        connectFlow={connectFlow}
        listingId={selected.propertyId}
        showEnabling={listingView !== LISTING_VIEW.SETTING_UP}
      />
    </div>
  );
}

export default PlatformCardsSection;
