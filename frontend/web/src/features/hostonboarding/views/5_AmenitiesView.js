import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import AmenityCategory from "../components/AmenityCategory";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import amenities from "../../../store/amenities";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import OnboardingProgress from "../components/OnboardingProgress";
import "../styles/onboardingHost.scss";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

function useCategoriesPerPage() {
  const getValue = () => {
    return 4;
  };

  const [value, setValue] = useState(getValue);

  useEffect(() => {
    const onResize = () => setValue(getValue());

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return value;
}

const AmenitiesView = () => {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();

  const selectedAmenitiesByCategory = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.selectedAmenities
  );
  const setAmenities = useFormStoreHostOnboarding((state) => state.setAmenities);
  const [page, setPage] = useState(1);

  const categoriesPerPage = useCategoriesPerPage();

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

  const totalPages = Math.max(1, Math.ceil(categoryKeys.length / categoriesPerPage));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedCategories = useMemo(() => {
    const start = (page - 1) * categoriesPerPage;
    return categoryKeys.slice(start, start + categoriesPerPage);
  }, [categoryKeys, page, categoriesPerPage]);

  const selectedAmenities = useMemo(() => {
    const selectedNames = new Set();
    Object.values(selectedAmenitiesByCategory || {}).forEach((names) => {
      names.forEach((name) => selectedNames.add(name));
    });
    return amenities.filter((amenity) => selectedNames.has(amenity.amenity));
  }, [selectedAmenitiesByCategory]);

  const handleAmenityChange = (amenity) => {
    const category = amenity.category;
    const current = selectedAmenitiesByCategory?.[category] || [];
    const next = current.includes(amenity.amenity)
      ? current.filter((name) => name !== amenity.amenity)
      : [...current, amenity.amenity];
    setAmenities(category, next);
  };

  return (
    <div className="onboarding-host-div">
      <div className="page-body">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Select Amenities</h2>
        <p className="onboardingSectionSubtitle">Select amenities that guests will have access to.</p>

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

        <p className="amenity-note">You can change this later.</p>

        {totalPages > 1 && (
          <div className="amenity-pager" role="tablist" aria-label="Amenity pages">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              const isActive = pageNumber === page;
              return (
                <button
                  key={pageNumber}
                  type="button"
                  className={`amenity-pager-btn${isActive ? " active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        )}

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/capacity`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => builder.addAmenities(selectedAmenities)}
            routePath={nextPath || `/hostonboarding/${accommodationType}/rules`}
            btnText="Proceed"
          />
        </nav>
      </div>
    </div>
  );
};

export default AmenitiesView;
