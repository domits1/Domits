import React, { useEffect, useState } from "react";
import { HOST_DISTRIBUTION_STATE, useHostDistribution } from "../hooks/useHostDistribution";
import {
  LISTING_VIEW,
  PLATFORMS,
  describeListingView,
  describeMissingItems,
  describePlatformCard,
} from "../utils/distributionStates";
import { CONNECT_STEP, useConnectFlow } from "../hooks/useConnectFlow";
import PlatformCard from "./PlatformCard";
import ConnectChecklistModal from "./ConnectChecklistModal";
import ChannexIframeModal from "./ChannexIframeModal";
import { NotReadyNotice } from "./DistributionNotices";

const LOADING_MESSAGE = "Loading your listings…";
const NO_LISTINGS_MESSAGE = "You have no listings yet.";
const LOAD_ERROR_MESSAGE = "We couldn't load your listings.";
const REFRESHING_MESSAGE = "Refreshing…";
const REFRESH_ERROR_MESSAGE = "We couldn't refresh your connections.";
const CONNECTING_MESSAGE = "Connecting…";
const DISTRIBUTION_READY = "READY";

// The three OTA cards of the picked listing (design note #3954, D7), or the notice that explains why
// there are none. Orchestration only: what each card says lives in utils/distributionStates.js.
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
  const listingView = describeListingView(selected);
  const isRefreshing = refreshingPropertyId === selected.propertyId;

  // A listing that is not set up yet has nothing to connect to: its switches stay disabled until
  // PR B2 adds the enable step. While a flow is open every switch and the picker are locked: a
  // second flow cannot start underneath the first, and the host cannot move to a listing whose view
  // has no cards, which would unmount the flow's modals and leave the step stuck.
  const canStartConnect = selected.distribution?.status === DISTRIBUTION_READY && !connectFlow.isActive;
  const handleToggle = ({ otaCode, turnOn }) => {
    if (!turnOn) return;
    connectFlow.start({
      platform: PLATFORMS.find((platform) => platform.otaCode === otaCode),
      propertyId: selected.propertyId,
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
          {connectFlow.errorMessage && (
            <p className="host-chdist__error-text" role="alert">
              {connectFlow.errorMessage}
            </p>
          )}
          {connectFlow.step === CONNECT_STEP.CONNECTING && (
            <output className="host-chdist__empty-text">{CONNECTING_MESSAGE}</output>
          )}
          {connectFlow.step === CONNECT_STEP.CHECKLIST && (
            <ConnectChecklistModal
              platform={connectFlow.platform}
              onContinue={connectFlow.continueFromChecklist}
              onClose={connectFlow.cancel}
            />
          )}
          {connectFlow.step === CONNECT_STEP.IFRAME && (
            <ChannexIframeModal
              platform={connectFlow.platform}
              url={connectFlow.url}
              onClose={connectFlow.closeIframe}
            />
          )}
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
