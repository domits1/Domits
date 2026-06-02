import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { TiWarningOutline } from "react-icons/ti";
import Toast from "../../components/toast/Toast";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader";
import AccommodationCard from "../../pages/home/AccommodationCard";
import GuestSelector from "./components/GuestSelector";
import GuestActions from "./components/GuestActions";
import { getAccessToken } from "./utils/authUtils";
import { fetchWishlistItems, updateWishlistItem } from "./services/wishlistService";

import "./styles/GuestWishlist.scss";

const WISHLIST_COUNT_LABEL = "\u2764\uFE0F";
const PROPERTY_SET_ENDPOINT =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set";
const LOADING_CARD_IDS = [
  "wishlist-loading-card-1",
  "wishlist-loading-card-2",
  "wishlist-loading-card-3",
];

const createUnavailableWishlistEntry = (propertyId) => ({
  property: {
    id: propertyId,
    title: "No longer available",
  },
  isUnavailable: true,
});

const normalizeWishlistPropertyCard = (propertyId, payload) => {
  if (Array.isArray(payload) && payload[0]?.property?.id) {
    return payload[0];
  }

  return createUnavailableWishlistEntry(propertyId);
};

const fetchWishlistPropertyCard = async (propertyId) => {
  try {
    const response = await fetch(`${PROPERTY_SET_ENDPOINT}?properties=${propertyId}`);
    if (!response.ok) {
      return createUnavailableWishlistEntry(propertyId);
    }

    const payload = await response.json();
    return normalizeWishlistPropertyCard(propertyId, payload);
  } catch {
    return createUnavailableWishlistEntry(propertyId);
  }
};

const fetchWishlistDisplayItems = async (propertyIds) => {
  const safePropertyIds = Array.isArray(propertyIds)
    ? propertyIds.map((propertyId) => String(propertyId || "").trim()).filter(Boolean)
    : [];

  if (safePropertyIds.length === 0) {
    return [];
  }

  try {
    const batchResponse = await fetch(`${PROPERTY_SET_ENDPOINT}?properties=${safePropertyIds.join(",")}`);

    if (batchResponse.ok) {
      const payload = await batchResponse.json();
      const propertyMap = new Map(
        (Array.isArray(payload) ? payload : [])
          .filter((item) => item?.property?.id)
          .map((item) => [String(item.property.id), item]),
      );

      return safePropertyIds.map((propertyId) =>
        propertyMap.get(propertyId) || createUnavailableWishlistEntry(propertyId),
      );
    }
  } catch {
    // Fall back to per-property resolution below.
  }

  return Promise.all(safePropertyIds.map((propertyId) => fetchWishlistPropertyCard(propertyId)));
};

const sortWishlistDisplayItems = (items) => {
  const safeItems = Array.isArray(items) ? items : [];
  const availableItems = safeItems.filter((item) => !item?.isUnavailable);
  const unavailableItems = safeItems.filter((item) => item?.isUnavailable);
  return [...availableItems, ...unavailableItems];
};

const UnavailableWishlistCard = ({ onRemove }) => (
  <article className="wishlistUnavailableCard" aria-label="Saved listing no longer available">
    <div className="wishlistUnavailableCard__media">
      <div className="wishlistUnavailableCard__overlay">
        <TiWarningOutline className="wishlistUnavailableCard__icon" />
        <p className="wishlistUnavailableCard__title">No longer available</p>
        <p className="wishlistUnavailableCard__subtitle">
          This saved listing was removed or switched to draft.
        </p>
      </div>
    </div>
    <div className="wishlistUnavailableCard__body" aria-hidden="true">
      <div className="wishlistUnavailableCard__line wishlistUnavailableCard__line--title" />
      <div className="wishlistUnavailableCard__line wishlistUnavailableCard__line--meta" />
      <div className="wishlistUnavailableCard__line wishlistUnavailableCard__line--metaShort" />
    </div>
    <div className="wishlistUnavailableCard__actions">
      <button type="button" className="wishlistUnavailableCard__removeBtn" onClick={onRemove}>
        Remove from wishlist
      </button>
    </div>
  </article>
);

UnavailableWishlistCard.propTypes = {
  onRemove: PropTypes.func.isRequired,
};

const WishlistLoadingContent = ({ selectedList }) => (
  <div className="wishlistLoading">
    <PulseBarsLoader message={`Loading ${selectedList}...`} />
    <div className="wishlistLoadingGrid" aria-hidden="true">
      {LOADING_CARD_IDS.map((loadingCardId) => (
        <div key={loadingCardId} className="wishlistLoadingCard">
          <div className="wishlistLoadingCard__image" />
          <div className="wishlistLoadingCard__line wishlistLoadingCard__line--title" />
          <div className="wishlistLoadingCard__line wishlistLoadingCard__line--meta" />
          <div className="wishlistLoadingCard__line wishlistLoadingCard__line--metaShort" />
        </div>
      ))}
    </div>
  </div>
);

WishlistLoadingContent.propTypes = {
  selectedList: PropTypes.string.isRequired,
};

const WishlistEmptyContent = ({ onExplore }) => (
  <div className="wishlistEmpty">
    <div className="wishlistEmpty__icon">
      <svg width="260" height="210" viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="20"
          y="40"
          width="185"
          height="155"
          rx="12"
          fill="#f0f0f0"
          stroke="#ddd"
          strokeWidth="2.5"
          strokeDasharray="10 7"
        />
        <path
          d="M112 128 C112 110 90 98 90 114 C90 122 101 130 112 142 C123 130 134 122 134 114 C134 98 112 110 112 128Z"
          fill="none"
          stroke="#ccc"
          strokeWidth="3.5"
        />
        <circle cx="195" cy="58" r="36" fill="var(--primary-color)" />
        <path
          d="M195 44 C195 34 177 28 177 40 C177 47 186 54 195 63 C204 54 213 47 213 40 C213 28 195 34 195 44Z"
          fill="white"
        />
      </svg>
    </div>
    <h3 className="wishlistEmpty__title">Your wishlist is empty</h3>
    <p className="wishlistEmpty__subtitle">Save your favorite listings and plan your next trip!</p>
    <button className="wishlistEmpty__cta" onClick={onExplore}>
      Explore properties
    </button>
  </div>
);

WishlistEmptyContent.propTypes = {
  onExplore: PropTypes.func.isRequired,
};

const WishlistCardGrid = ({ wishlist, onNavigateToListing, onRefresh, onRemoveUnavailable }) => (
  <div className="cardGrid">
    {wishlist.map((item) => (
      <div key={item.property?.id} className="wishlistCardWrapper">
        {item?.isUnavailable ? (
          <UnavailableWishlistCard onRemove={() => onRemoveUnavailable(item.property?.id)} />
        ) : (
          <AccommodationCard
            accommodation={item}
            onClick={(event, id) => onNavigateToListing(id)}
            onUnlike={onRefresh}
            imageVariant="web"
          />
        )}
      </div>
    ))}
  </div>
);

WishlistCardGrid.propTypes = {
  wishlist: PropTypes.arrayOf(PropTypes.object).isRequired,
  onNavigateToListing: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onRemoveUnavailable: PropTypes.func.isRequired,
};

const GuestWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState("My next trip");
  const [toast, setToast] = useState({ message: "", status: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const items = await fetchWishlistItems(selectedList);
        const propertyIds = items.map((item) => item.propertyId);

        if (propertyIds.length === 0) {
          setWishlist([]);
          return;
        }

        const fullData = await fetchWishlistDisplayItems(propertyIds);
        setWishlist(sortWishlistDisplayItems(fullData));
      } catch {
        setToast({ message: "Failed to load wishlist. Please try again.", status: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [selectedList, refreshKey]);

  const handleRemoveUnavailable = async (propertyId) => {
    try {
      await updateWishlistItem(propertyId, "DELETE", selectedList);
      setToast({ message: "Removed from wishlist", status: "info" });
      setRefreshKey((key) => key + 1);
    } catch {
      setToast({ message: "Failed to remove from wishlist. Please try again.", status: "error" });
    }
  };

  const isEmpty = !Array.isArray(wishlist) || wishlist.length === 0;
  const refreshWishlist = () => setRefreshKey((key) => key + 1);
  const handleListChange = useCallback((list) => setSelectedList(list), []);
  const handleCreateList = useCallback((name) => setSelectedList(name), []);

  let content = (
    <WishlistCardGrid
      wishlist={wishlist}
      onNavigateToListing={(id) => navigate(`/listingdetails?ID=${id}`)}
      onRefresh={refreshWishlist}
      onRemoveUnavailable={handleRemoveUnavailable}
    />
  );

  if (loading) {
    content = <WishlistLoadingContent selectedList={selectedList} />;
  } else if (isEmpty) {
    content = <WishlistEmptyContent onExplore={() => navigate("/")} />;
  }

  return (
    <div className="pageContainer">
      {ReactDOM.createPortal(
        <Toast
          message={toast.message}
          status={toast.status || "info"}
          onClose={() => setToast({ message: "", status: "" })}
        />,
        document.body,
      )}

      <div className="wishlistTopBar">
        <div className="wishlistActionsRow">
          <GuestActions
            selectedList={selectedList}
            onListChange={handleListChange}
            onShare={() => {}}
            onCreate={handleCreateList}
          />
        </div>

        <div className="wishlistHeader">
          <h2>{selectedList}</h2>
          <div className="wishlistSubRow">
            {loading ? (
              <PulseBarsLoader
                inline
                className="wishlistCountLoader"
                message="Loading saved accommodations..."
              />
            ) : (
              <p className="wishlistCount">
                {WISHLIST_COUNT_LABEL} {wishlist.length} saved accommodations
              </p>
            )}
            <GuestSelector onClose={() => {}} />
          </div>
        </div>
      </div>

      {content}
    </div>
  );
};

export default GuestWishlist;
