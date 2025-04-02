import React from "react";
import AmenityItem from "./AmenityItem";
import PropTypes from 'prop-types';
import "../styles/AmenityStyles.css";

/**
 * Component voor het weergeven van een categorie van voorzieningen.
 *
 * @param {Object} props - De eigenschappen van de component.
 * @param {string} props.category - De naam van de categorie.
 * @param {string[]} props.amenities - De lijst met voorzieningen in deze categorie.
 * @param {string[]} props.selectedAmenities - De lijst met geselecteerde voorzieningen.
 * @param {function} props.handleAmenityChange - Functie om wijzigingen in de selectie af te handelen.
 */

function AmenityCategory({ category, amenities, selectedAmenities, handleAmenityChange }) {
    return (
        <div style={{ marginBottom: "20px" }}>
            <h2 className="amenity-header">{category}</h2>
            <section className="check-box">
                {amenities.map((amenity) => (
                    <AmenityItem
                        key={amenity}
                        category={category}
                        amenity={amenity}
                        checked={selectedAmenities.includes(amenity)}
                        onChange={handleAmenityChange}
                        className="amenity-item"
                    />
                ))}
            </section>
        </div>
    );
}

export default AmenityCategory;