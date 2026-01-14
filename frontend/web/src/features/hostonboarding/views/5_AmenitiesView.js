import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import AmenityCategory from "../components/AmenityCategory";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import amenities from "../../../store/amenities";
import "../styles/onboardingHost.scss";

const CATEGORIES_PER_PAGE = 8;

const AmenitiesView = () => {
  const builder = useBuilder();
  const { type: accommodationType } = useParams();

  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [page, setPage] = useState(1);

  const amenitiesByType = useMemo(() => {
    return amenities.reduce((categories, amenity) => {
      if (!categories[amenity.category]) categories[amenity.category] = [];
      categories[amenity.category].push(amenity);
      return categories;
    }, {});
  }, []);

  const categoryKeys = useMemo(() => {
    return Object.keys(amenitiesByType).sort((a, b) => a.localeCompare(b));
  }, [amenitiesByType]);

  const totalPages = Math.max(1, Math.ceil(categoryKeys.length / CATEGORIES_PER_PAGE));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedCategories = useMemo(() => {
    const start = (page - 1) * CATEGORIES_PER_PAGE;
    return categoryKeys.slice(start, start + CATEGORIES_PER_PAGE);
  }, [categoryKeys, page]);

  const handleAmenityChange = (amenity) => {
    setSelectedAmenities((prev) => (prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]));
  };

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="onboarding-host-div">
      <div className="page-body">
        <h2 className="onboardingSectionTitle">Select Amenities</h2>
        <p className="onboardingSectionSubtitle">
          Choose the amenities that your property offers. ({selectedAmenities.length} selected)
        </p>

        <div className="amenity-groups">
          {pagedCategories.map((category) => (
            <AmenityCategory
              key={category}
              category={category}
              amenities={amenitiesByType[category]}
              selectedAmenities={selectedAmenities}
              handleAmenityChange={handleAmenityChange}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="paginator">
            <button className="pager-btn" onClick={goPrev} disabled={page === 1}>
              Prev
            </button>

            <div className="pager-info">
              Page {page} / {totalPages}
            </div>

            <button className="pager-btn" onClick={goNext} disabled={page === totalPages}>
              Next
            </button>
          </div>
        )}

        <nav className="onboarding-button-box">
          <OnboardingButton routePath={`/hostonboarding/${accommodationType}/capacity`} btnText="Go back" />
          <OnboardingButton
            onClick={() => builder.addAmenities(selectedAmenities)}
            routePath={`/hostonboarding/${accommodationType}/rules`}
            btnText="Proceed"
          />
        </nav>
      </div>
    </div>
  );
};

export default AmenitiesView;
