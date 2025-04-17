import React, { useEffect, useState } from "react";
import { getAccessToken } from "../utils/authUtils";


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
        const ids = data?.AccommodationIDs?.map((entry) =>
          typeof entry === "object" && entry.S ? entry.S : entry
        ) || [];


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


  if (loading) return <p>Loading your wishlist...</p>;
  if (wishlist.length === 0) return <p>You have not saved any favorites yet.</p>;


  return (
    <div style={{ padding: "20px" }}>
      <h2>My Wishlist</h2>
      <p>❤️ {wishlist.length} saved accommodations</p>


      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
        {wishlist.map((item) => {
          const { property, propertyImages, propertyGeneralDetails, propertyPricing } = item;
          const imageUrl = `https://accommodation.s3.eu-north-1.amazonaws.com/${propertyImages?.[0]?.key}`;
          const beds = propertyGeneralDetails.find(d => d.detail === "Beds")?.value || 0;
          const baths = propertyGeneralDetails.find(d => d.detail === "Bathrooms")?.value || 0;
          const guests = propertyGeneralDetails.find(d => d.detail === "Guests")?.value || 0;
          const price = propertyPricing?.roomRate || 0;


          return (
            <div
              key={property.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                width: "300px",
                overflow: "hidden",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <img
                src={imageUrl}
                alt={property.title}
                style={{ width: "100%", height: "200px", objectFit: "cover" }}
              />
              <div style={{ padding: "15px" }}>
                <h3>{property.title}</h3>
                <p style={{ fontStyle: "italic", color: "#666" }}>{property.subtitle}</p>
                <p style={{ fontSize: "14px", color: "#444" }}>
                  {guests} guests • {beds} beds • {baths} baths
                </p>
                <p style={{ fontWeight: "bold", marginTop: "10px" }}>€{price} / night</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default GuestWishlistPage;



