import React from "react";
import WishlistItem from "./WishlistItem";
import PropTypes from "prop-types";

const WishlistList = ({ accommodations, removeLike }) => {
  return (
    <div className="wishlist-list">
      {accommodations.map((acc) => (
        <WishlistItem key={acc.id} accommodation={acc} removeLike={removeLike} />
      ))}
    </div>
  );
};

WishlistList.propTypes = {
  accommodations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      location: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      image: PropTypes.string.isRequired,
    })
  ).isRequired,
  removeLike: PropTypes.func.isRequired,
};

export default WishlistList;
