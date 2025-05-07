// File: 12_SummarySubmitView.js (Corrected Import Path)

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import FetchUserId from "../utils/FetchUserId";
import { submitAccommodation } from "../services/SubmitAccommodation.js";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";
import { toast } from "react-toastify";
import OnboardingButton from "../components/OnboardingButton";
// *** CORRECTED IMPORT PATH FOR AMENITIES DATA ***
import allAmenitiesData from "../../../store/amenities";

// Helper function to convert HH:MM string to minutes from midnight
const timeToMinutes = (timeString) => {
  // Handle potential number type from old state or direct number input
  if (typeof timeString === 'number') {
    return timeString; // Assume it's already minutes if number
  }
  if (!timeString || typeof timeString !== "string" || !timeString.includes(":")) {
    console.warn(`Invalid time format for conversion: ${timeString}. Defaulting to 0.`);
    return 0; // Return 0 or null based on how backend handles missing times
  }
  const parts = timeString.split(":");
  if (parts.length !== 2) {
    console.warn(`Invalid time format for conversion: ${timeString}. Defaulting to 0.`);
    return 0;
  }
  const [hours, minutes] = parts.map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid time format for conversion: ${timeString}. Defaulting to 0.`);
    return 0;
  }
  return hours * 60 + minutes;
};


function SummaryViewAndSubmit() {
  const builder = useBuilder();
  const navigate = useNavigate();

  const amenityNameToIdMap = useMemo(() => {
    const map = {};
    if (Array.isArray(allAmenitiesData)) {
      allAmenitiesData.forEach(item => {
        map[item.amenity] = item.id;
      });
    } else {
      console.error("[SummaryViewAndSubmit] allAmenitiesData from ../../../store/amenities.js is not an array or is undefined. Check import and file content.", allAmenitiesData);
    }
    return map;
  }, []);

  const fullZustandState = useFormStoreHostOnboarding((state) => state);
  const { accommodationDetails, technicalDetails } = fullZustandState;

  const ownerId = accommodationDetails.OwnerId;
  const isDraft = accommodationDetails.isDraft ?? false;
  const accommodationType = accommodationDetails.type;

  const updateAccommodationDetail = useFormStoreHostOnboarding(
    (state) => state.updateAccommodationDetail
  );

  const handleDraftChange = useCallback((event) => {
    updateAccommodationDetail('isDraft', event.target.checked);
  }, [updateAccommodationDetail]);

  const [isLoading, setIsLoading] = useState(!ownerId);
  const [error, setError] = useState(null);

  const detailKeyMapping = {
    GuestAmount: "Guests",
    Cabins: "Cabins",
    Bedrooms: "Bedrooms",
    Bathrooms: "Bathrooms",
    Beds: "Beds",
  };

  useEffect(() => {
    if (ownerId) {
      setIsLoading(false);
      console.log("[SummaryViewAndSubmit useEffect] OwnerId found:", ownerId);
    } else {
      setIsLoading(true);
      console.log("[SummaryViewAndSubmit useEffect] Waiting for OwnerId...");
    }
  }, [ownerId]);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!ownerId) {
      toast.error("Cannot submit: User information is missing.");
      setError("User information missing.");
      return;
    }
    if (!builder) {
      toast.error("Cannot submit: Data builder is not available.");
      setError("Data builder error.");
      return;
    }

    console.log("[SummaryViewAndSubmit handleSubmit] Populating builder from Zustand state...");
    let buildSuccessful = false;

    try {
      console.log("Subtitle from store:", accommodationDetails.subtitle);
      builder.addProperty({
        hostId: ownerId,
        title: accommodationDetails.title || "Untitled Accommodation",
        subtitle: accommodationDetails.subtitle || "No subtitle provided.",
        description: accommodationDetails.description || "No description provided.",
        guestCapacity: accommodationDetails.accommodationCapacity?.GuestAmount || 0,
        registrationNumber: accommodationDetails.registrationNumber || "",
        status: isDraft ? "DRAFT" : "PENDING",
        propertyType: accommodationType || "Unknown",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      builder.addPropertyType({
        type: accommodationType || "Unknown",
        spaceType: accommodationDetails.guestAccessType || (['Boat', 'Camper'].includes(accommodationType) ? 'Entire vehicle' : 'Unknown Space')
      });

      let locationData = {};
      let houseNum = NaN;
      if (accommodationType === 'Boat') {
        locationData = {
          country: accommodationDetails.boatDetails?.country || "",
          city: accommodationDetails.boatDetails?.city || "",
          street: accommodationDetails.boatDetails?.harbor || "",
          houseNumber: undefined,
          houseNumberExtension: "",
          postalCode: "",
        };
      } else if (accommodationType === 'Camper') {
        houseNum = parseInt(accommodationDetails.camperDetails?.houseNumber, 10);
        locationData = {
          country: accommodationDetails.camperDetails?.country || "",
          city: accommodationDetails.camperDetails?.city || "",
          street: accommodationDetails.camperDetails?.street || "",
          houseNumber: !isNaN(houseNum) ? houseNum : undefined,
          houseNumberExtension: accommodationDetails.camperDetails?.houseNumberExtension || "",
          postalCode: accommodationDetails.camperDetails?.zipCode || "",
        };
      } else {
        houseNum = parseInt(accommodationDetails.address?.houseNumber, 10);
        locationData = {
          country: accommodationDetails.address?.country || "",
          city: accommodationDetails.address?.city || "",
          street: accommodationDetails.address?.street || "",
          houseNumber: !isNaN(houseNum) ? houseNum : undefined,
          houseNumberExtension: accommodationDetails.address?.houseNumberExtension || "",
          postalCode: accommodationDetails.address?.zipCode || "",
        };
      }
      if ('houseNumber' in locationData && typeof locationData.houseNumber !== 'number' && locationData.houseNumber !== undefined) {
        console.warn(`House number '${locationData.houseNumber}' is not a valid number. Setting to undefined for builder.`);
        locationData.houseNumber = undefined;
      }
      builder.addLocation(locationData);

      const flatAmenityNames = Object.values(accommodationDetails.selectedAmenities || {}).flat();
      if (flatAmenityNames.length > 0) {
        const amenitiesForBuilder = flatAmenityNames.map(name => {
          const amenityId = amenityNameToIdMap[name];
          if (!amenityId) {
            console.warn(`[SummaryViewAndSubmit] Amenity ID not found for name: "${name}". This amenity will be skipped.`);
            toast.warn(`Amenity "${name}" could not be processed. Check configuration.`);
            return null;
          }
          return { id: amenityId };
        }).filter(Boolean);

        if (amenitiesForBuilder.length > 0) {
          builder.addAmenities(amenitiesForBuilder);
        }
      }

      const capacityDetails = Object.entries(accommodationDetails.accommodationCapacity || {})
        .filter(([key, value]) => typeof value === 'number' && value > 0)
        .map(([key, value]) => ({
          id: "", // Backend will likely generate this; empty string is a placeholder
          property_id: "", // Backend will link this; empty string is a placeholder
          detail: detailKeyMapping[key] || key, // Use mapped key, e.g., "Guests" instead of "GuestAmount"
          value: value
        }));

      if (capacityDetails.length > 0) {
        builder.addGeneralDetails(capacityDetails);
      }

      const checkInData = {
        checkIn: {
          from: timeToMinutes(accommodationDetails.checkIn?.CheckIn?.from),
          till: timeToMinutes(accommodationDetails.checkIn?.CheckIn?.till),
        },
        checkOut: {
          from: timeToMinutes(accommodationDetails.checkIn?.CheckOut?.from),
          till: timeToMinutes(accommodationDetails.checkIn?.CheckOut?.till),
        }
      };
      builder.addCheckIn(checkInData);

      const imagesForBuilder = Object.entries(accommodationDetails.images || {}).map(([key, image]) => ({ key, image }));
      if (imagesForBuilder.length > 0) {
        builder.addImages(imagesForBuilder); // Pass array of {key: "imageN", image: "base64..."}
      }

      const pricingData = {
        roomRate: parseFloat(accommodationDetails.Rent) || 0,
        cleaning: parseFloat(accommodationDetails.CleaningFee) || 0,
        service: parseFloat(accommodationDetails.ServiceFee) || 0,
      };
      builder.addPricing(pricingData);

      const { startDate, endDate } = accommodationDetails.availability?.selectedDates || {};
      if (startDate && endDate) {
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime();
        if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
          builder.addAvailability([{
            availableStartDate: startTimestamp,
            availableEndDate: endTimestamp,
          }]);
        } else {
          console.warn("Invalid availability dates found in store, skipping builder.addAvailability.");
        }
      }

      const av = accommodationDetails.availability;
      const restrictions = [];
      const restrictionMapping = {
        MinimumStay: 'MinimumStay', MaximumStay: 'MaximumStay',
        MinimumBookingPeriod: 'MinimumBookingPeriod',
        MinimumAdvancedReservation: 'MinimumAdvancedReservation', MaximumAdvancedReservation: 'MaximumAdvancedReservation',
        PaymentDeadlineAfterBooking: 'PaymentDeadlineAfterBooking', PaymentDeadlineBeforeCheckIn: 'PaymentDeadlineBeforeCheckIn',
      };
      for (const [key, builderKey] of Object.entries(restrictionMapping)) {
        const value = av?.[key];
        if (value !== undefined && value !== null && value !== '') {
          const numValue = parseInt(String(value), 10);
          if (!isNaN(numValue)) {
            restrictions.push({ restriction: builderKey, value: numValue });
          } else {
            console.warn(`Could not parse availability restriction ${key} ('${value}') to number.`);
          }
        }
      }
      if (restrictions.length > 0) {
        builder.addAvailabilityRestrictions(restrictions);
      }

      if (['Boat', 'Camper'].includes(accommodationType)) {
        const specificSpecs = accommodationType === 'Boat'
          ? accommodationDetails.boatSpecifications
          : accommodationDetails.camperSpecifications;

        const combinedTechDetails = {
          length: technicalDetails?.length,
          height: technicalDetails?.height,
          fuelConsumption: technicalDetails?.fuelConsumption,
          speed: technicalDetails?.speed,
          renovationYear: technicalDetails?.renovationYear,
          transmission: technicalDetails?.transmission,
          generalPeriodicInspection: technicalDetails?.generalPeriodicInspection,
          fourWheelDrive: technicalDetails?.fourWheelDrive,
          ...specificSpecs,
        };

        const finalTechDetails = {};
        const numericFields = ['length', 'height', 'fuelConsumption', 'speed', 'renovationYear', 'generalPeriodicInspection'];

        numericFields.forEach(key => {
          const value = combinedTechDetails[key];
          if (value !== null && value !== undefined) {
            const numValue = (key === 'renovationYear' || key === 'generalPeriodicInspection')
              ? parseInt(String(value), 10)
              : parseFloat(String(value));
            if (!isNaN(numValue)) {
              finalTechDetails[key] = numValue;
            } else {
              console.warn(`Technical detail ${key} ('${value}') could not be parsed to a number. Skipping for builder.`);
            }
          }
        });

        finalTechDetails.fourWheelDrive = !!combinedTechDetails.fourWheelDrive;
        finalTechDetails.transmission = String(combinedTechDetails.transmission || 'Unknown');

        if (Object.keys(finalTechDetails).length > 0) {
          builder.addTechnicalDetails(finalTechDetails);
        } else {
          console.warn("No valid technical details found to add to builder.");
        }
      }
      console.log("[SummaryViewAndSubmit handleSubmit] Builder populated successfully.");
      buildSuccessful = true;

    } catch (buildError) {
      console.error("[SummaryViewAndSubmit handleSubmit] Error populating builder:", buildError);
      toast.error(`Error preparing data: ${buildError.message || "Check console for details."}`);
      setError(`Error preparing data: ${buildError.message}`);
    }

    if (!buildSuccessful) {
      console.error("[SummaryViewAndSubmit handleSubmit] Submission aborted due to builder population error.");
      return;
    }

    if (!builder.property || !builder.propertyType) {
      console.error("[SummaryViewAndSubmit handleSubmit] Submission aborted: Builder missing essential properties (property or propertyType) even after successful population block.", builder);
      toast.error("Submission failed: Core property data missing.");
      setError("Core property data missing.");
      return;
    }

    console.log("[SummaryViewAndSubmit handleSubmit] Builder seems valid. Calling submitAccommodation...");
    submitAccommodation(navigate, builder);

  }, [
    builder,
    fullZustandState,
    ownerId,
    navigate,
    isDraft,
    accommodationType,
    amenityNameToIdMap,
  ]);

  const createTableData = useCallback(() => {
    const ad = accommodationDetails;
    const td = technicalDetails;
    const tableData = {
      title: ad.title, description: ad.description,
      rent: ad.Rent, cleaningFee: ad.CleaningFee, serviceFee: ad.ServiceFee,
      accommodationType: ad.type,
      guestAmount: ad.accommodationCapacity?.GuestAmount,
      bedrooms: ad.accommodationCapacity?.Bedrooms,
      bathrooms: ad.accommodationCapacity?.Bathrooms,
      beds: ad.accommodationCapacity?.Beds,
      cabins: ad.accommodationCapacity?.Cabins,
      country: ad.address?.country || ad.boatDetails?.country || ad.camperDetails?.country,
      city: ad.address?.city || ad.boatDetails?.city || ad.camperDetails?.city,
      street: ad.address?.street || ad.camperDetails?.street,
      houseNumber: ad.address?.houseNumber || ad.camperDetails?.houseNumber,
      houseNumberExtension: ad.address?.houseNumberExtension || ad.camperDetails?.houseNumberExtension,
      postalCode: ad.address?.zipCode || ad.camperDetails?.zipCode,
      harbor: ad.boatDetails?.harbor,
      smokingAllowed: ad.houseRules?.SmokingAllowed,
      petsAllowed: ad.houseRules?.PetsAllowed,
      partiesEventsAllowed: ad.houseRules?.['Parties/EventsAllowed'],
      checkInFrom: ad.checkIn?.CheckIn?.from, checkInTill: ad.checkIn?.CheckIn?.till,
      checkOutFrom: ad.checkIn?.CheckOut?.from, checkOutTill: ad.checkIn?.CheckOut?.till,
      amenities: Object.values(ad.selectedAmenities || {}).flat().join(', ') || null,
      availabilityStartDate: ad.availability?.selectedDates?.startDate,
      availabilityEndDate: ad.availability?.selectedDates?.endDate,
      length: td.length, height: td.height, fuelConsumption: td.fuelConsumption,
      speed: td.speed, renovationYear: td.renovationYear, transmission: td.transmission,
      generalPeriodicInspection: td.generalPeriodicInspection,
      fourWheelDrive: td.fourWheelDrive,
      manufacturer: ad.boatSpecifications?.Manufacturer,
      boatModel: ad.boatSpecifications?.Model,
      licensePlate: ad.camperSpecifications?.LicensePlate,
      camperBrand: ad.camperSpecifications?.CamperBrand,
      camperModel: ad.camperSpecifications?.Model,
    };

    console.log("[createTableData] Data prepared for display tables:", tableData);
    return tableData;
  }, [accommodationDetails, technicalDetails]);

  if (isLoading) {
    return <div className="onboarding-host-div"><p>Loading user information...</p></div>;
  }

  const summaryDataForTables = !isLoading && !error ? createTableData() : {};

  return (
    <div className="onboarding-host-div">
      <FetchUserId />
      <main className="summary page-body">
        <h2 className="onboardingSectionTitle">Confirm Your Details</h2>
        <p className="onboardingSectionSubtitle">Please review your accommodation details before submitting.</p>

        {error && <p className="error-message">{error}</p>}

        <SummaryTable
          data={summaryDataForTables}
          type={accommodationType}
        />
        <SpecificationsTable
          data={summaryDataForTables}
          type={accommodationType}
        />

        <DeclarationSection
          drafted={isDraft}
          toggleDrafted={handleDraftChange}
        />

        <nav className="onboarding-button-box">
          <OnboardingButton onClick={() => navigate(-1)} btnText="Go back to change" />
          <OnboardingButton onClick={handleSubmit} btnText="Confirm and Submit" />
        </nav>
      </main>
    </div>
  );
}

export default SummaryViewAndSubmit;