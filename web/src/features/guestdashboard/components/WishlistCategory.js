import React from "react";
import PropTypes from "prop-types";

const WishlistCategory = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="wishlist-categories">
      {categories.map((category) => (
        <button
          key={category.name}
          className={`category-button ${selectedCategory === category.name ? "active" : ""}`}
          onClick={() => onSelectCategory(category.name)}
        >
          {category.name} ({category.count})
        </button>
      ))}
    </div>
  );
};

WishlistCategory.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
  selectedCategory: PropTypes.string.isRequired,
  onSelectCategory: PropTypes.func.isRequired,
};

export default WishlistCategory;
