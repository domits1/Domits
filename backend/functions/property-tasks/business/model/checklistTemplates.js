// Per-type predefined checklist items, applied when a task's Type has a template.
// A type with no entry here keeps today's behavior: the host adds items manually.
export const CHECKLIST_TEMPLATES = {
    Cleaning: [
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
    ],
    Maintenance: [
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
    ],
    Administration: [
        { title: "Document collection", isRequired: true },
        { title: "Data verification", isRequired: true },
        { title: "Property onboarding", isRequired: true },
        { title: "Vendor onboarding", isRequired: true },
        { title: "Compliance task", isRequired: true },
        { title: "Internal administration", isRequired: true },
    ],
};
