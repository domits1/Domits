const { CHECKLIST_TEMPLATES } = require("../../functions/property-tasks/business/model/checklistTemplates.js");

describe("CHECKLIST_TEMPLATES", () => {
    it("has a Cleaning template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Cleaning).toEqual([
            { title: "Checkout cleaning", isRequired: true },
            { title: "Stayover cleaning", isRequired: true },
            { title: "Deep cleaning", isRequired: true },
            { title: "Turnover preparation", isRequired: true },
            { title: "Linen replacement", isRequired: true },
            { title: "Laundry", isRequired: true },
            { title: "Restocking", isRequired: true },
            { title: "Amenity preparation", isRequired: true },
            { title: "Quality inspection", isRequired: true },
            { title: "Property readiness", isRequired: true },
        ]);
    });

    it("has a Maintenance template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Maintenance).toEqual([
            { title: "Repair", isRequired: true },
            { title: "Preventive maintenance", isRequired: true },
            { title: "Inspection", isRequired: true },
            { title: "Emergency maintenance", isRequired: true },
            { title: "Appliance issue", isRequired: true },
            { title: "Plumbing issue", isRequired: true },
            { title: "Electrical issue", isRequired: true },
            { title: "HVAC issue", isRequired: true },
            { title: "Pool maintenance", isRequired: true },
            { title: "Garden maintenance", isRequired: true },
            { title: "Safety inspection", isRequired: true },
        ]);
    });

    it("has an Administration template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Administration).toEqual([
            { title: "Document collection", isRequired: true },
            { title: "Data verification", isRequired: true },
            { title: "Property onboarding", isRequired: true },
            { title: "Vendor onboarding", isRequired: true },
            { title: "Compliance task", isRequired: true },
            { title: "Internal administration", isRequired: true },
        ]);
    });

    it("has no template for a type that has not been defined yet", () => {
        expect(CHECKLIST_TEMPLATES.Inspection).toBeUndefined();
    });
});
