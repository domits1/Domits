import React from 'react';
import PropTypes from 'prop-types';

const slugify = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// Expect the prop named 'onChange'
function AmenityItem({ category, amenity, checked, onChange }) {
    const itemId = `${slugify(category)}-${slugify(amenity)}`;

    return (
        // Use standard class names and 'selected'
        <label
            htmlFor={itemId}
            className={`amenity-item ${checked ? 'selected' : ''}`}
        >
            <input
                type="checkbox"
                id={itemId}
                name={amenity}
                checked={checked}
                // Call the received 'onChange' function
                onChange={(e) => onChange(category, amenity, e.target.checked)}
            />
            {amenity}
        </label>
    );
}

// Ensure PropTypes match the received prop name
AmenityItem.propTypes = {
    category: PropTypes.string.isRequired,
    amenity: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired, // Correct prop type name
};

export default AmenityItem;