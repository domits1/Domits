import React, { useState } from "react";
import "../styles/guestWishlist.css";
import WishlistList from "../components/WishlistList"; 

const accommodationsData = [
    { id: 1, name: "Ohana Nook", location: "Kailua, Hawaii", distance: "1.8 km", price: "€420", image: "https://source.unsplash.com/250x150/?beach" },
    { id: 2, name: "Snowy Cabin", location: "Alberta, Canada", distance: "2 km", price: "€600", image: "https://source.unsplash.com/250x150/?cabin,snow" },
    { id: 3, name: "Casa del Sol", location: "Barcelona, Spain", distance: "1.8 km", price: "€530", image: "https://source.unsplash.com/250x150/?house,spain" },
    { id: 4, name: "Greece Yacht", location: "Athens, Greece", distance: "1.8 km", price: "€1440", image: "https://source.unsplash.com/250x150/?yacht" },
  ];

const GuestWishlistPage = () => {
  const [likedAccommodations, setLikedAccommodations] = useState(accommodationsData);

  const removeLike = (id) => {
    setLikedAccommodations(likedAccommodations.filter((acc) => acc.id !== id));
  };

  return (
    <div className="guest-dashboard">
      <h1>Mijn Wishlist</h1>
      <p>Hier komen alle opgeslagen accommodaties.</p>

      {/* Using WishlistList */}
      <WishlistList accommodations={likedAccommodations} removeLike={removeLike} />

      {likedAccommodations.length === 0 && <p className="no-accommodations">Your wishlist is empty.</p>}
    </div>
  );
};

export default GuestWishlistPage;
