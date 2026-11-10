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

    it("has a Guest Experience template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES["Guest Experience"]).toEqual([
            { title: "Guest request", isRequired: true },
            { title: "Concierge request", isRequired: true },
            { title: "Complaint", isRequired: true },
            { title: "Special occasion", isRequired: true },
            { title: "Arrival preparation", isRequired: true },
            { title: "Check-in assistance", isRequired: true },
            { title: "During-stay service", isRequired: true },
            { title: "Checkout assistance", isRequired: true },
            { title: "Service recovery", isRequired: true },
        ]);
    });

    it("has a Finance template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Finance).toEqual([
            { title: "Payment investigation", isRequired: true },
            { title: "Reconciliation", isRequired: true },
            { title: "Invoice review", isRequired: true },
            { title: "Owner payout issue", isRequired: true },
            { title: "Financial exception", isRequired: true },
        ]);
    });

    it("has a Revenue template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Revenue).toEqual([
            { title: "Pricing review", isRequired: true },
            { title: "Rate-plan update", isRequired: true },
            { title: "Availability review", isRequired: true },
            { title: "Revenue exception", isRequired: true },
        ]);
    });

    it("has no template for a type that has not been defined yet", () => {
        expect(CHECKLIST_TEMPLATES.Inspection).toBeUndefined();
    });
});
