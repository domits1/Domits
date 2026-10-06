import { describe, expect, it } from "@jest/globals";
import { toPublicWebsitePropertySnapshotView } from "../../functions/PropertyHandler/util/websitePropertySnapshotView.js";

const STORED_SNAPSHOT = {
  property: {
    id: "property-1",
    hostId: "host-secret-1",
    host_id: "host-secret-1",
    title: "Villa Sensual",
    subtitle: "Sea view",
    description: "A villa.",
    registrationNumber: "REG-1",
    status: "ACTIVE",
    bookingType: "direct",
    createdAt: 1,
    updatedAt: 2,
  },
  amenities: [{ id: "wifi" }],
  availability: { from: 1 },
  availabilityRestrictions: [{ restriction: "MinimumStay", value: 2 }],
  checkIn: { checkIn: { from: "15:00" }, checkOut: { till: "11:00" } },
  cancellationPolicy: { policy: "flexible" },
  lateCheckin: { allowed: true },
  houseRules: [{ rule: "No parties" }],
  customRules: [],
  generalDetails: [{ detail: "Guests", value: 4 }],
  images: [{ key: "images/property-1/a.jpg" }],
  location: { city: "Ubud", country: "Indonesia" },
  pricing: { roomRate: 120 },
  rules: { smoking: false },
  propertyType: { property_type: "Villa" },
  technicalDetails: null,
  propertyTestStatus: { status: "LIVE" },
  calendarAvailability: [{ date: "2026-10-10" }],
  hostProfile: { userId: "host-secret-1", givenName: "Karim" },
  futureSection: { hostId: "host-secret-1" },
};

describe("the public property snapshot view", () => {
  it("keeps every section the templates read and drops the host identifiers", () => {
    const view = toPublicWebsitePropertySnapshotView(STORED_SNAPSHOT);

    expect(view.property).toEqual({
      id: "property-1",
      title: "Villa Sensual",
      subtitle: "Sea view",
      description: "A villa.",
      registrationNumber: "REG-1",
      status: "ACTIVE",
      bookingType: "direct",
      createdAt: 1,
      updatedAt: 2,
    });
    expect(Object.keys(view).sort()).toEqual(
      [
        "amenities",
        "availability",
        "availabilityRestrictions",
        "calendarAvailability",
        "cancellationPolicy",
        "checkIn",
        "customRules",
        "generalDetails",
        "houseRules",
        "images",
        "lateCheckin",
        "location",
        "pricing",
        "property",
        "propertyTestStatus",
        "propertyType",
        "rules",
        "technicalDetails",
      ].sort()
    );
    expect(JSON.stringify(view)).not.toContain("host-secret-1");
    expect(JSON.stringify(view)).not.toContain("hostId");
    expect(JSON.stringify(view)).not.toContain("host_id");
  });

  it("answers an empty object for a missing or malformed snapshot", () => {
    expect(toPublicWebsitePropertySnapshotView(null)).toEqual({});
    expect(toPublicWebsitePropertySnapshotView("snapshot")).toEqual({});
    expect(toPublicWebsitePropertySnapshotView([{ property: {} }])).toEqual({});
  });

  it("leaves out the property section when it is not an object", () => {
    expect(toPublicWebsitePropertySnapshotView({ property: "property-1", images: [] })).toEqual({ images: [] });
  });
});
