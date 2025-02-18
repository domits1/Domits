import React from "react";
import PropTypes from "prop-types";

const WishlistItem = ({ accommodation, removeLike }) => {
  return (
    <div className="wishlist-item">
      <img src={accommodation.image} alt={accommodation.name} />
      <button className="remove-button" onClick={() => removeLike(accommodation.id)}>X</button>

      <div className="wishlist-info">
        <h3>{accommodation.name}</h3>
        <p>{accommodation.location}</p>
        <p className="price">€{accommodation.price}</p>
        <button className="book-button">Book Now</button>
      </div>
    </div>
  );
};

WishlistItem.propTypes = {
  accommodation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
  }).isRequired,
  removeLike: PropTypes.func.isRequired,
};

export default WishlistItem;
