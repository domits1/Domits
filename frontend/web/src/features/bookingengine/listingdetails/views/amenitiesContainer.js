import { useState } from "react";
import Amenities from "../../../../store/amenities";
import Amenity from "../components/amenity";
import { ALLOWED_AMENITY_CATEGORIES } from "../store/amenityCategories";

const AmenitiesContainer = ({ amenityIds }) => {
  const [showModal, setShowModal] = useState(false);

  const amenityObjects = amenityIds.map((a) => Amenities.find((entry) => entry.id === a.amenityId));

  const featured = amenityObjects.filter((a) => ALLOWED_AMENITY_CATEGORIES.includes(a?.category));

  const grouped = {};
  amenityObjects.forEach((item) => {
    if (!item) return;
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  return (
    <div className="amenities-container">
      <p className="amenities-title">This place offers the following:</p>

      <div className="amenities-featured">
        {featured.slice(0, 6).map((amenity) => (
          <Amenity key={amenity.id} amenity={amenity} />
        ))}
      </div>

      <button className="show-all-amenities-btn" onClick={() => setShowModal(true)}>
        Toon alle voorzieningen
      </button>

      {showModal && (
        <div className="amenities-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="amenities-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowModal(false)}>
              ×
            </button>

            <h2 className="modal-title">Voorzieningen</h2>

            <div className="modal-groups">
              {Object.keys(grouped).map((category) => (
                <div key={category} className="modal-group">
                  <h3 className="category-title">{category}</h3>

                  <div className="modal-items">
                    {grouped[category].map((amenity) => (
                      <Amenity key={amenity.id} amenity={amenity} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AmenitiesContainer;
