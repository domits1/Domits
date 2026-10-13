// Per-type predefined checklist items, applied when a task's Type has a template.
// A type with no entry here keeps today's behavior: the host adds items manually.
export const CHECKLIST_TEMPLATES = {
    Cleaning: [
        { title: "Deep cleaning", isRequired: true },
        { title: "Turnover preparation", isRequired: true },
        { title: "Linen replacement", isRequired: true },
        { title: "Laundry", isRequired: true },
        { title: "Restocking", isRequired: true },
        { title: "Amenity preparation", isRequired: true },
        { title: "Quality inspection", isRequired: true },
        { title: "Property readiness", isRequired: true },
    ],
};
