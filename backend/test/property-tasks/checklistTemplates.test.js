const { CHECKLIST_TEMPLATES } = require("../../functions/property-tasks/business/model/checklistTemplates.js");

describe("CHECKLIST_TEMPLATES", () => {
    it("has a Cleaning template with the expected items", () => {
        expect(CHECKLIST_TEMPLATES.Cleaning).toEqual([
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

    it("has no template for a type that has not been defined yet", () => {
        expect(CHECKLIST_TEMPLATES.Maintenance).toBeUndefined();
    });
});
