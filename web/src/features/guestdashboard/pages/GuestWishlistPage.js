import React, { useEffect, useState } from "react";
import { getAccessToken } from "../utils/authUtils";
import "../../guestdashboard/styles/GuestWishlistPage.scss";
import GuestSelector from "../../guestdashboard/components/GuestSelector";
import GuestActions from "../../guestdashboard/components/GuestActions";
import FavoriteIcon from "@mui/icons-material/Favorite"; // ❤️ icon

const GuestWishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = getAccessToken();
      if (!token) return;

      // Fetch all wishlist accommodation IDs

      try {
        const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        const ids =
          data?.AccommodationIDs?.map((entry) => (typeof entry === "object" && entry.S ? entry.S : entry)) || [];

        if (ids.length === 0) return setWishlist([]);

        //Fetch full property details for each ID
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
  }, []);

  //  Remove accommodation from wishlist
  const handleUnlike = async (e, accommodationId) => {
    e.stopPropagation();

    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accommodationId }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove from wishlist");
      }

      // Update UI after removal
      setWishlist((prev) => prev.filter((item) => item.property.id !== accommodationId));
    } catch (err) {
      console.error(" Error removing from wishlist:", err.message);
    }
  };

  if (loading) return <p>Loading your wishlist...</p>;
  if (wishlist.length === 0) return <p>You have not saved any favorites yet.</p>;

  return (
    <div className="pageContainer">
     
      <div className="wishlistTopBar">
        <div className="wishlistActionsRow">
          <GuestActions
            selectedList="my-trip"
            onListChange={(list) => console.log("Switched to:", list)}
            onShare={() => console.log("Share clicked")}
            onCreate={() => console.log("Create new list")}
          />
        </div>

        {/* Header with wishlist count and selector */}
        <div className="wishlistHeader">
          <h2>My Wishlist</h2>
          <div className="wishlistSubRow">
            <p className="wishlistCount">❤️ {wishlist.length} saved accommodations</p>
            <GuestSelector onClose={(data) => console.log("Selected:", data)} />
          </div>
        </div>
      </div>

      {/*  Wishlist Cards */}
      <div className="cardList">
        {wishlist.map((item) => {
          const { property, propertyImages, propertyGeneralDetails, propertyPricing } = item;
          const imageUrl = `https://accommodation.s3.eu-north-1.amazonaws.com/${propertyImages?.[0]?.key}`;
          const beds = propertyGeneralDetails.find((d) => d.detail === "Beds")?.value || 0;
          const baths = propertyGeneralDetails.find((d) => d.detail === "Bathrooms")?.value || 0;
          const guests = propertyGeneralDetails.find((d) => d.detail === "Guests")?.value || 0;
          const price = propertyPricing?.roomRate || 0;

          return (
            <div key={property.id} className="card">
              <img src={imageUrl} alt={property.title} className="cardImage" />

              {/* ❤️ Unlike button */}
              <button className="cardLikeButton" onClick={(e) => handleUnlike(e, property.id)}>
                <FavoriteIcon sx={{ color: "#ec5050" }} />
              </button>

              <div className="cardContent">
                <h3>{property.title}</h3>
                <p className="cardSubtitle">{property.subtitle}</p>
                <p className="cardDetails">
                  {guests} guests • {beds} beds • {baths} baths
                </p>
                <p className="cardPrice">€{price} / night</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuestWishlistPage;
