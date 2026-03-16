import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import { FaListUl } from "react-icons/fa";
import Amenities from "../../../../store/amenities";
import Amenity from "../components/amenity";

const FEATURED_SECTION_CONFIG = [
  {
    title: "Essentials",
    category: "Essentials",
    preferredAmenities: ["Wi-Fi", "TV with cable/satellite", "Hot water"],
  },
  {
    title: "Kitchen",
    category: "Kitchen",
    preferredAmenities: ["Dishes and silverware", "Kettle", "Coffee maker"],
  },
  {
    title: "Heating & Cooling",
    category: null,
    preferredAmenities: ["Air conditioning", "Heating", "Fire pit", "Hot tub", "Hot water"],
  },
];

const CATEGORY_LABELS = {
  EcoFriendly: "Eco Friendly",
  ExtraServices: "Extra Services",
  FamilyFriendly: "Family Friendly",
  LivingArea: "Living Area",
};

const formatCategoryTitle = (value) => CATEGORY_LABELS[value] || value;

const pickAmenities = (items, preferredAmenities, takenIds, limit = 3) => {
  const selected = [];

  preferredAmenities.forEach((name) => {
    const match = items.find((item) => item.amenity === name && !takenIds.has(item.id));
    if (match && selected.length < limit) {
      selected.push(match);
      takenIds.add(match.id);
    }
  });

  items.forEach((item) => {
    if (selected.length < limit && !takenIds.has(item.id)) {
      selected.push(item);
      takenIds.add(item.id);
    }
  });

  return selected;
};

const AmenitiesContainer = ({ amenityIds = [] }) => {
  const [showModal, setShowModal] = useState(false);

  const amenityObjects = useMemo(() => {
    if (!Array.isArray(amenityIds)) {
      return [];
    }

    return amenityIds
      .map((item) => Amenities.find((entry) => entry.id === item?.amenityId))
      .filter(Boolean);
  }, [amenityIds]);

  const groupedAmenities = useMemo(() => {
    const grouped = {};

    amenityObjects.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    return grouped;
  }, [amenityObjects]);

  const featuredSections = useMemo(() => {
    const takenIds = new Set();
    const allAmenities = Object.values(groupedAmenities).flat();

    const sections = FEATURED_SECTION_CONFIG.map((config) => {
      const sourceItems = config.category
        ? groupedAmenities[config.category] || []
        : allAmenities.filter((item) => {
            return ["Essentials", "Outdoor"].includes(item.category);
          });

      return {
        title: config.title,
        items: pickAmenities(sourceItems, config.preferredAmenities, takenIds),
      };
    }).filter((section) => section.items.length > 0);

    if (sections.length < 3) {
      Object.entries(groupedAmenities).forEach(([category, items]) => {
        if (sections.length >= 3) {
          return;
        }

        const nextItems = items.filter((item) => !takenIds.has(item.id)).slice(0, 3);
        if (nextItems.length === 0) {
          return;
        }

        nextItems.forEach((item) => takenIds.add(item.id));
        sections.push({ title: formatCategoryTitle(category), items: nextItems });
      });
    }

    return sections;
  }, [groupedAmenities]);

  const modalCategories = useMemo(() => {
    return Object.entries(groupedAmenities).sort(([first], [second]) => first.localeCompare(second));
  }, [groupedAmenities]);

  if (amenityObjects.length === 0) {
    return null;
  }

  return (
    <>
      <div className="amenities-container">
        <div className="amenities-header">
          <span className="amenities-header__icon" aria-hidden="true">
            <FaListUl />
          </span>
          <h3 className="amenities-header__title">What this place offers</h3>
        </div>

        <div className={`amenities-featured amenities-featured--${Math.max(featuredSections.length, 1)}`}>
          {featuredSections.map((section) => (
            <div key={section.title} className="amenities-column">
              <h4 className="amenities-column__title">{section.title}</h4>
              <div className="amenities-column__items">
                {section.items.map((amenity) => (
                  <Amenity key={amenity.id} amenity={amenity} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="amenities-divider" />

        <button type="button" className="show-all-amenities-btn" onClick={() => setShowModal(true)}>
          Show all {amenityObjects.length} amenities
        </button>
      </div>

      {showModal && (
        <div className="amenities-modal-overlay">
          <button
            type="button"
            className="amenities-modal-dismiss"
            aria-label="Close amenities"
            onClick={() => setShowModal(false)}
          />
          <div className="amenities-modal-shell">
            <div className="amenities-modal">
              <button type="button" className="close-modal-btn" onClick={() => setShowModal(false)}>
                x
              </button>

              <h2 className="modal-title">Amenities</h2>

              <div className="modal-groups">
                {modalCategories.map(([category, items]) => (
                  <div key={category} className="modal-group">
                    <h3 className="category-title">{formatCategoryTitle(category)}</h3>

                    <div className="modal-items">
                      {items.map((amenity) => (
                        <Amenity key={amenity.id} amenity={amenity} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

AmenitiesContainer.propTypes = {
  amenityIds: PropTypes.arrayOf(
    PropTypes.shape({
      amenityId: PropTypes.string,
    }),
  ),
};

export default AmenitiesContainer;
