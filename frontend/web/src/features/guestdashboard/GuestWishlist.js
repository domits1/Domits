import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "./utils/authUtils";
import { fetchWishlistItems, updateWishlistItem } from "./services/wishlistService";

import "./styles/GuestWishlist.scss";

import GuestSelector from "./components/GuestSelector";
import GuestActions from "./components/GuestActions";

import AccommodationCard from "../../pages/home/AccommodationCard";

const GuestWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState("My next trip");
  const cardListRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = getAccessToken();
      if (!token) return;

      setLoading(true);

      try {
        const items = await fetchWishlistItems(selectedList);
        const propertyIds = items.map((item) => item.propertyId);

        if (propertyIds.length === 0) {
          setWishlist([]);
          return;
        }

        const detailsRes = await fetch(
          `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${propertyIds.join(",")}`
        );

        const fullData = await detailsRes.json();
        setWishlist(fullData);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [selectedList]);

  const handleUnlike = async (accommodationId) => {
    setWishlist((prev) => prev.filter((item) => item.property.id !== accommodationId));

    const token = getAccessToken();
    if (!token) return;

    await updateWishlistItem(accommodationId, "DELETE", selectedList);
  };

  const scrollLeft = () => {
    cardListRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    cardListRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  if (loading) return <p>Loading your wishlist...</p>;

  const isEmpty = !Array.isArray(wishlist) || wishlist.length === 0;
  const showScrollButtons = wishlist.length > 4;

  return (
    <div className="pageContainer">
      <div className="wishlistTopBar">
        <div className="wishlistActionsRow">
          <GuestActions
            selectedList={selectedList}
            onListChange={(list) => setSelectedList(list)}
            onShare={() => {}}
            onCreate={(name) => setSelectedList(name)}
          />
        </div>

        <div className="wishlistHeader">
          <h2>{selectedList}</h2>
          <div className="wishlistSubRow">
            <p className="wishlistCount">❤️ {wishlist.length} saved accommodations</p>
            <GuestSelector onClose={() => {}} />
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="wishlistEmpty">
          <div className="wishlistEmpty__icon">
            <svg width="260" height="210" viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="40" width="185" height="155" rx="12" fill="#f0f0f0" stroke="#ddd" strokeWidth="2.5" strokeDasharray="10 7"/>
              <path d="M112 128 C112 110 90 98 90 114 C90 122 101 130 112 142 C123 130 134 122 134 114 C134 98 112 110 112 128Z" fill="none" stroke="#ccc" strokeWidth="3.5"/>
              <circle cx="195" cy="58" r="36" fill="var(--primary-color)"/>
              <path d="M195 44 C195 34 177 28 177 40 C177 47 186 54 195 63 C204 54 213 47 213 40 C213 28 195 34 195 44Z" fill="white"/>
            </svg>
          </div>
          <h3 className="wishlistEmpty__title">Your wishlist is empty</h3>
          <p className="wishlistEmpty__subtitle">Save your favorite listings and plan your next trip!</p>
          <button className="wishlistEmpty__cta" onClick={() => navigate("/")}>Explore properties</button>
        </div>
      ) : (
        <div className="wishlistScrollWrapper">
          {showScrollButtons && (
            <button className="scrollArrow scrollLeft" onClick={scrollLeft}>
              &#8592;
            </button>
          )}

          <div className="cardList" ref={cardListRef}>
            {wishlist.map((item) => (
              <div key={item.property?.id} className="wishlistCardWrapper">
                <AccommodationCard
                  accommodation={item}
                  onClick={(e, id) => navigate(`/listingdetails?ID=${id}`)}
                />
                <button className="DeleteButton" onClick={() => handleUnlike(item.property?.id)}>
                  Delete ❤️
                </button>
              </div>
            ))}
          </div>

          {showScrollButtons && (
            <button className="scrollArrow scrollRight" onClick={scrollRight}>
              &#8594;
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GuestWishlist;
