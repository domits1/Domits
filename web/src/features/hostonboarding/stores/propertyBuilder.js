// --- START OF FILE propertyBuilder.js ---
import { PropertyModel } from "./models/propertyModel";
// ... other imports ...

export class PropertyBuilder {
  constructor() {
    // Initialize property as an object to allow merging
    this.property = {}; // <-- Initialize as empty object
    // ... other initializations ...
    this.propertyAmenities = [];
    this.propertyAvailability = [];
    this.propertyAvailabilityRestrictions = [];
    this.propertyCheckIn = undefined;
    this.propertyGeneralDetails = [];
    this.propertyLocation = undefined;
    this.propertyPricing = undefined;
    this.propertyRules = [];
    this.propertyType = undefined;
    this.propertyImages = [];
    this.propertyTechnicalDetails = undefined;
  }

  // --- MODIFIED addProperty Method ---
  addProperty(propertyUpdate) {
    // Ensure this.property exists (it should due to constructor)
    if (!this.property) {
      this.property = {};
    }
    // Merge the update into the existing property object
    // This adds/overwrites fields from propertyUpdate onto this.property
    Object.assign(this.property, propertyUpdate);

    console.log("[Builder] Updated this.property:", this.property);
    return this;
  }
  // --- End Modified addProperty Method ---

  // --- Keep other add... methods as they were ---
  addAmenities(amenities) { /* ... existing code ... */ }
  addAvailability(availabilities) { /* ... existing code ... */ }
  addAvailabilityRestrictions(restrictions) { /* ... existing code ... */ }
  addCheckIn(checkIn) { /* ... existing code ... */ }
  addGeneralDetails(details) { /* ... existing code ... */ }
  addLocation(location) { /* ... existing code ... */ }
  addPricing(pricing) { /* ... existing code ... */ }
  addRules(rules) { /* ... existing code ... */ }
  addPropertyType(type) { /* ... existing code ... */ }
  addImages(images) { /* ... existing code ... */ }
  addTechnicalDetails(details) { /* ... existing code ... */ }


  // --- BUILD METHOD (Important: Update to use the merged 'this.property') ---
  build() {
    // *** Change this line in build() ***
    // BEFORE: if (!this.property || !this.propertyLocation || ...)
    // AFTER: Check specific *required* fields within this.property
    if (!this.property?.title || !this.propertyLocation || !this.propertyType || !this.propertyPricing) {
      console.error("Cannot build property data: Missing essential information (e.g., title, location, type, or pricing).");
      console.log("Current property data:", this.property); // Log what's missing
      return null;
    }

    // Ensure the main 'property' object passed to the API matches the model structure
    // We need to create a new PropertyModel instance *here* from the merged data
    // OR ensure the API accepts the plain object structure.
    // Assuming the API expects the structure from mockData.json, which includes
    // a 'property' key holding an object matching PropertyModel fields:

    const finalPropertyData = new PropertyModel({
      id: "", // Let backend handle ID
      hostId: "", // Let backend handle hostId
      title: this.property.title || "",
      subtitle: this.property.subtitle || "",
      description: this.property.description || "", // Use data accumulated in this.property
      guestCapacity: typeof this.property.guestCapacity === 'number' ? this.property.guestCapacity : 0, // Ensure number
      registrationNumber: this.property.registrationNumber || "",
      status: this.property.status || "ACTIVE", // Default status?
      propertyType: this.propertyType?.property_type || "", // Get from propertyType object
      createdAt: this.property.createdAt || Date.now(), // Add defaults if needed
      updatedAt: Date.now()
    });


    const builtObject = {
      // Use the finalPropertyData object created above
      property: finalPropertyData,
      propertyAmenities: this.propertyAmenities,
      propertyAvailability: this.propertyAvailability,
      propertyAvailabilityRestrictions: this.propertyAvailabilityRestrictions,
      propertyCheckIn: this.propertyCheckIn,
      propertyGeneralDetails: this.propertyGeneralDetails,
      propertyLocation: this.propertyLocation,
      propertyPricing: this.propertyPricing,
      propertyRules: this.propertyRules,
      propertyType: this.propertyType,
      propertyImages: this.propertyImages,
      propertyTechnicalDetails: this.propertyTechnicalDetails,
    };

    if (builtObject.propertyTechnicalDetails === undefined) {
      delete builtObject.propertyTechnicalDetails;
    }

    return builtObject;
  }
}
// --- END OF FILE propertyBuilder.js ---