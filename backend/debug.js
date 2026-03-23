import { validateTaskPayload } from "./functions/property-tasks/business/model/taskValidator.js";

const mockData = {
    title: "Toilet fix",
    property: {
        propertyId: "prop-123",
        propertyLabel: "Apartament 4A" 
    }
};

try {
    validateTaskPayload(mockData);
    console.log("✅");
} catch (e) {
    console.error("❌", e.message);
}