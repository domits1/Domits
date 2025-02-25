import React, { useState } from "react";
import "../styles/guestWishlist.css";
import WishlistList from "../components/WishlistList";
import GuestRoomSelector from "../components/GuestRoomSelector"; 
import { FaPencilAlt, FaTimes } from "react-icons/fa";

import greeceYacht from '../../../images/Greece-Yacht.jpeg';
import cabinWinter from '../../../images/cabin-in-the-winter-at.jpg';
import villasSpain from '../../../images/villas-for-sale-spain.jpg';
import konaHomes from '../../../images/4-Bed-Kona-Homes.jpeg';

const accommodationsData = [
  { id: 1, name: "Ohana Nook", location: "Hawaii", category: "Hotels", price: 420, image: greeceYacht },
  { id: 2, name: "Snowy Cabin", location: "Canada", category: "My Next Trip", price: 600, image: cabinWinter},
  { id: 3, name: "Casa del Sol", location: "Spain", category: "Hotels", price: 530, image: villasSpain },
  { id: 4, name: "Greece Yacht", location: "Greece", category: "My Next Trip", price: 1440, image: konaHomes },
];

const GuestWishlistPage = () => {
  const [likedAccommodations, setLikedAccommodations] = useState(accommodationsData);
  const [selectedCategory, setSelectedCategory] = useState("My Next Trip"); // Set default category
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [shareListOpen, setShareListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [categories, setCategories] = useState([
    { name: "Hotels", count: 2 },
    { name: "My Next Trip", count: 2 }
  ]);

  const removeLike = (id) => {
    setLikedAccommodations(likedAccommodations.filter((acc) => acc.id !== id));
  };

  const filteredAccommodations = likedAccommodations.filter((acc) =>
    selectedCategory === "" || acc.category === selectedCategory
  );

  const handleCreateList = () => {
    if (newListName.trim() !== "" && !categories.find((cat) => cat.name === newListName)) {
      setCategories([...categories, { name: newListName, count: 0 }]);
      setSelectedCategory(newListName); // Update button text to new list name
      setNewListName("");
      setCreateListOpen(false);
    }
  };

  return (
    <div className="guest-dashboard">
      {/* Wishlist Navigation Bar */}
      <div className="wishlist-navbar">
        <span className="favorites-label">Favorites</span>
        
        {/* Dropdown Button */}
        <div className="dropdown">
          <button className="dropdown-select" onClick={() => setDropdownOpen(!dropdownOpen)}>
            {selectedCategory} <span className="dropdown-arrow"></span>
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              {categories.map((category) => (
                <div 
                  key={category.name} 
                  className="dropdown-item" 
                  onClick={() => {
                    setSelectedCategory(category.name); // Update dropdown button text
                    setDropdownOpen(false);
                  }}
                >
                  <span>{category.name} <span className="list-count">{category.count}</span></span>
                  <div className="dropdown-icons">
                    <FaPencilAlt className="edit-icon" />
                    <FaTimes className="delete-icon" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Share List & Create List Buttons */}
        <button className="list-button" onClick={() => setShareListOpen(!shareListOpen)}>
          Share List
        </button>
        <button className="list-button" onClick={() => setCreateListOpen(!createListOpen)}>
          Create List
        </button>
      </div>

      {/* Wishlist Header */}
      <div className="wishlist-header">
        <h1>{selectedCategory}</h1>
        <div className="wishlist-info">
          <p>❤️ {filteredAccommodations.length} saved accommodations</p>
          <input type="date" className="date-picker" />
          
          {/* Add GuestRoomSelector here */}
          <GuestRoomSelector />
          
          <button className="map-button">Show on Map</button>
        </div>
      </div>

      {/* Wishlist Items */}
      <WishlistList accommodations={filteredAccommodations} removeLike={removeLike} />

      {/* Share List Pop-up */}
      {shareListOpen && (
        <div className="share-list-overlay">
          <div className="share-list-container">
            <p>Copy the link to share this list:</p>
            <input type="text" readOnly value={window.location.href} />
          </div>
        </div>
      )}

      {/* Create List Pop-up */}
      {createListOpen && (
        <div className="create-list-overlay">
          <div className="create-list-container">
            <h2>Create a New List</h2>
            <input
              type="text"
              placeholder="Enter a new list name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <div className="create-list-actions">
              <button onClick={handleCreateList} className="create-list-button">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestWishlistPage;
