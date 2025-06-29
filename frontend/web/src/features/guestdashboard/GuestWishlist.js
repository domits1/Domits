import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { getAccessToken } from "./utils/authUtils";

import "./styles/GuestWishlist.scss";

import GuestSelector from "./components/GuestSelector";
import GuestActions from "./components/GuestActions";

import AccommodationCard from "../../pages/home/AccommodationCard";
// import "../../pages/home/Accommodations.css";

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
        const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "getWishlist",
            wishlistName: selectedList,
          }),
        });

        const result = await res.json();
        const propertyIds = (result.items || [])
          .filter((item) => item.propertyId)
          .map((item) => item.propertyId);

        if (propertyIds.length === 0) {
          setWishlist([]);
          return;
        }

        const detailsRes = await fetch(
          `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${propertyIds.join(",")}`
        );

        const fullData = await detailsRes.json();
        setWishlist(fullData);
      } catch (err) {
        console.error("Error fetching wishlist:", err.message);
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

    try {
      await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: accommodationId,
          wishlistName: selectedList,
        }),
      });
    } catch (err) {
      console.error(" Error removing from wishlist:", err.message);
    }
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
            onShare={() => console.log("Share clicked")}
            onCreate={(name) => setSelectedList(name)}
          />
        </div>

        <div className="wishlistHeader">
          <h2>{selectedList}</h2>
          <div className="wishlistSubRow">
            <p className="wishlistCount">❤️ {wishlist.length} saved accommodations</p>
            <GuestSelector onClose={(data) => console.log("Selected:", data)} />
          </div>
        </div>
      </div>

      {isEmpty ? (
        <p>
          You have not saved any favorites in <strong>"{selectedList}"</strong> yet.
        </p>
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
