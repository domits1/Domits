import React, { useEffect, useState } from "react";
import { getAccessToken } from "../utils/authUtils";
import "../../guestdashboard/styles/GuestWishlistPage.scss";
import GuestSelector from "../../guestdashboard/components/GuestSelector";
import GuestActions from "../../guestdashboard/components/GuestActions";

import AccommodationCard from "../../../pages/home/AccommodationCard";
import "../../../pages/home/Accommodations.css";

const GuestWishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState("My next trip");

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = getAccessToken();
      if (!token) return;

      // Fetch all wishlist accommodation IDs
      try {
        // Stap 1: Haal alle wishlists op van de gebruiker
        const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        const ids = data?.wishlists?.[selectedList] || [];

        if (ids.length === 0) {
          setWishlist([]);
          return;
        }

               // Fetch full property details for each ID
        const detailsRes = await fetch(
          `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${ids.join(",")}`
        );

        const fullData = await detailsRes.json();
        setWishlist(fullData);
      } catch (err) {
        console.error("❌ Error fetching wishlist:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [selectedList]);

  // Delete accommodation (UI en DB)
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
      console.error("❌ Error removing from wishlist:", err.message);
    }
  };

  if (loading) return <p>Loading your wishlist...</p>;
  if (!Array.isArray(wishlist) || wishlist.length === 0)
    return <p>You have not saved any favorites in <strong>"{selectedList}"</strong> yet.</p>;  

  return (
    <div className="pageContainer">
      <div className="wishlistTopBar">
        <div className="wishlistActionsRow">
          <GuestActions
            selectedList={selectedList}
            onListChange={(list) => setSelectedList(list)}
            onShare={() => console.log("Share clicked")}
            onCreate={() => console.log("Create new list")}
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

      <div className="cardList">
        {wishlist.map((item) => (
          <div key={item.property?.id} className="wishlistCardWrapper">
            <AccommodationCard
              accommodation={item}
              onClick={() => console.log("Go to details of", item.property?.id)}
            />

            <button className="DeleteButton" onClick={() => handleUnlike(item.property?.id)}>
              Delete ❤️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuestWishlistPage;
