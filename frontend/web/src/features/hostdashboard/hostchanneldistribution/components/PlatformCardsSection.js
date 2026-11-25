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
import { DISCONNECT_STEP, useDisconnectFlow } from "../hooks/useDisconnectFlow";
import PlatformCard from "./PlatformCard";
import ConnectFlowLayer from "./ConnectFlowLayer";
import DisconnectFlowLayer from "./DisconnectFlowLayer";
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
  const {
    listings,
    loadState,
    reload,
    rereadListings,
    refresh,
    applyListing,
    refreshingPropertyId,
    refreshFailedPropertyId,
  } = useHostDistribution();
  const [pickedPropertyId, setPickedPropertyId] = useState("");
  const connectFlow = useConnectFlow({ refresh, rereadListings });
  const disconnectFlow = useDisconnectFlow({ refresh, applyListing });
  const { isActive: flowActive, propertyId: flowPropertyId, reset: resetFlow } = connectFlow;
  const { isActive: disconnectActive, propertyId: disconnectPropertyId, reset: resetDisconnect } = disconnectFlow;
  const hasListing = (propertyId) => listings.some((listing) => listing.propertyId === propertyId);
  const flowListingGone = flowActive && !hasListing(flowPropertyId);
  const disconnectListingGone = disconnectActive && !hasListing(disconnectPropertyId);

  // A reload or a vanished listing unmounts the flows' modals, so the flows end with them.
  useEffect(() => {
    if (loadState !== HOST_DISTRIBUTION_STATE.LOADED || flowListingGone) resetFlow();
  }, [loadState, flowListingGone, resetFlow]);
  useEffect(() => {
    if (loadState !== HOST_DISTRIBUTION_STATE.LOADED || disconnectListingGone) resetDisconnect();
  }, [loadState, disconnectListingGone, resetDisconnect]);

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

  // While a connect or disconnect flow is open the switches, the picker and Refresh are locked: two flows
  // cannot run at once, and moving to a listing without cards would unmount a flow's modals.
  const flowBusy = connectFlow.isActive || disconnectFlow.isActive;
  const canToggle = STARTABLE_STATUSES.includes(selected.distribution?.status) && !flowBusy;
  const channelOf = (otaCode) => selected.channels?.find((candidate) => candidate.otaCode === otaCode);
  const handleToggle = ({ otaCode, turnOn }) => {
    const platform = PLATFORMS.find((candidate) => candidate.otaCode === otaCode);
    if (turnOn) {
      disconnectFlow.clearError();
      connectFlow.start({ platform, listing: selected });
      return;
    }
    const channel = channelOf(otaCode);
    if (!channel) return;
    connectFlow.clearError();
    disconnectFlow.start({ platform, propertyId: selected.propertyId, channel });
  };
  const isTurningOff = (otaCode) =>
    disconnectFlow.step === DISCONNECT_STEP.DISCONNECTING && disconnectFlow.platform?.otaCode === otaCode;

  return (
    <div className="chdist-card-list">
      {listings.length > 1 && (
        <label className="host-chdist__picker">
          <span className="host-chdist__picker-label">Property</span>
          <select
            className="host-chdist__picker-select"
            value={selected.propertyId}
            disabled={flowBusy}
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
              state={describePlatformCard(selected, platform.otaCode, { turningOff: isTurningOff(platform.otaCode) })}
              onToggle={canToggle ? handleToggle : undefined}
              turnOffEnabled={Boolean(channelOf(platform.otaCode)?.channelId)}
            />
          ))}
          <div className="chdist-card__row">
            <button
              type="button"
              className="chdist-btn chdist-btn--secondary"
              disabled={isRefreshing || flowBusy}
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
      <DisconnectFlowLayer disconnectFlow={disconnectFlow} />
      <ConnectFlowLayer
        connectFlow={connectFlow}
        listingId={selected.propertyId}
        showEnabling={listingView !== LISTING_VIEW.SETTING_UP}
      />
    </div>
  );
}

export default PlatformCardsSection;
