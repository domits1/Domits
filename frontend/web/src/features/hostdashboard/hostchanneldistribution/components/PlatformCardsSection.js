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

// The three OTA cards of the picked listing (design note #3954, D7), or the notice that explains why
// there are none. Orchestration only: what each card says lives in utils/distributionStates.js.
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
  const listingView = describeListingView(selected);
  const isRefreshing = refreshingPropertyId === selected.propertyId;

  // Turning a switch on starts the connect flow (a listing that is not turned on gets the timezone and
  // enable steps from the hook), and turning one off starts the disconnect flow. While either flow is
  // open every switch, the picker and Refresh are locked: a connect and a disconnect can never run
  // at the same time, a second flow cannot start underneath the first, a Refresh cannot race a
  // request, and the host cannot move to a listing whose view has no cards, which would unmount the
  // flow's modals and leave the step stuck.
  const flowBusy = connectFlow.isActive || disconnectFlow.isActive;
  const canToggle = STARTABLE_STATUSES.includes(selected.distribution?.status) && !flowBusy;
  const handleToggle = ({ otaCode, turnOn }) => {
    const platform = PLATFORMS.find((candidate) => candidate.otaCode === otaCode);
    if (turnOn) {
      disconnectFlow.clearError();
      connectFlow.start({ platform, listing: selected });
      return;
    }
    const channel = selected.channels?.find((candidate) => candidate.otaCode === otaCode);
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
              turnOffEnabled
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

      {/* Outside the cards view, so a Retry from the "Setting up" notice can show its dialogs too. The
          notice already says it is setting up, so the flow's own sentence is left out there. */}
      <DisconnectFlowLayer disconnectFlow={disconnectFlow} />
      <ConnectFlowLayer connectFlow={connectFlow} showEnabling={listingView !== LISTING_VIEW.SETTING_UP} />
    </div>
  );
}

export default PlatformCardsSection;
