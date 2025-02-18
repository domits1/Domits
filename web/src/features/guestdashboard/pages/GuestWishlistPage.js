import React, { useState } from "react";
import "../styles/guestWishlist.css";
import WishlistList from "../components/WishlistList";

const accommodationsData = [
  { id: 1, name: "Ohana Nook", location: "Hawaii", category: "Hotels", price: 420, image: "https://source.unsplash.com/300x200/?beach" },
  { id: 2, name: "Snowy Cabin", location: "Canada", category: "My Next Trip", price: 600, image: "https://source.unsplash.com/300x200/?snow,cabin" },
  { id: 3, name: "Casa del Sol", location: "Spain", category: "Hotels", price: 530, image: "https://source.unsplash.com/300x200/?villa" },
  { id: 4, name: "Greece Yacht", location: "Greece", category: "My Next Trip", price: 1440, image: "https://source.unsplash.com/300x200/?yacht" },
];

const GuestWishlistPage = () => {
  const [likedAccommodations, setLikedAccommodations] = useState(accommodationsData);
  const [selectedCategory, setSelectedCategory] = useState("Hotels");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const removeLike = (id) => {
    setLikedAccommodations(likedAccommodations.filter((acc) => acc.id !== id));
  };

  const filteredAccommodations = likedAccommodations.filter((acc) => acc.category === selectedCategory);

  const categories = [
    { name: "Hotels", count: likedAccommodations.filter((acc) => acc.category === "Hotels").length },
    { name: "My Next Trip", count: likedAccommodations.filter((acc) => acc.category === "My Next Trip").length },
  ];

  return (
    <div className="guest-dashboard">
      {/* Wishlist Navigation Bar */}
      <div className="wishlist-navbar">
        <span className="favorites-label">Favorites</span>
        <div className="dropdown">
          <button className="dropdown-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
            {selectedCategory} ({filteredAccommodations.length}) ▼
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              {categories.map((category) => (
                <button key={category.name} className="dropdown-item" onClick={() => { setSelectedCategory(category.name); setDropdownOpen(false); }}>
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="list-button">Share List</button>
        <button className="list-button">Create List</button>
      </div>

      {/* Wishlist Header */}
      <div className="wishlist-header">
        <h1>{selectedCategory}</h1>
        <div className="wishlist-info">
          <p>❤️ {filteredAccommodations.length} saved accommodations</p>
          <input type="date" className="date-picker" />

          <button className="map-button">Show on Map</button>
        </div>
      </div>

      {/* Wishlist Items */}
      <WishlistList accommodations={filteredAccommodations} removeLike={removeLike} />
    </div>
  );
};

export default GuestWishlistPage;
