import React from "react";
import PropTypes from "prop-types";

const WishlistItem = ({ accommodation, removeLike }) => {
  return (
    <div className="Wishlist-item">
        <imge src={accommodation.image} alt={accommodation.name} />
        <button className="remove-button" onClick={() => removeLike(accommodation.id)}>✖</button>
        <div className="wishlist-info">
            <h3>{accommodation.name}</h3>
            <p>{accommodation.location}</p>
            <p>{accommodation.distance}</p>
            <p className="price">{accommodation.price}</p>
        </div>
        </div>

  );
};

WishlistItem.propTypes = {
  accommodation: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    distance: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired

  }).isRequired,
  removeLike: PropTypes.func.isRequired,
};

export default WishlistItem;
