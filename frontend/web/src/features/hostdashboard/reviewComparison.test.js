import { buildPropertyRatingComparison } from "./reviewComparison";

// Review: Verifies per-property review averages and comparison filtering.
describe("buildPropertyRatingComparison", () => {
  it("compares published property reviews with separate denominators per category", () => {
    const rows = buildPropertyRatingComparison(
      [
        {
          propertyId: "property-a", status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
          overallRating: 5, categoryRatings: { cleanliness: 5, accuracy: 4 },
        },
        {
          propertyId: "property-a", status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
          overallRating: 3, categoryRatings: { cleanliness: 3 },
        },
        {
          propertyId: "property-b", status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
          overallRating: 4, categoryRatings: { cleanliness: 2, accuracy: 5 },
        },
        {
          propertyId: "property-a", status: "DRAFT", overallRating: 1,
          categoryRatings: { cleanliness: 1 },
        },
        {
          propertyId: "property-a", status: "PUBLISHED", reviewType: "HOST_TO_GUEST",
          overallRating: 1, categoryRatings: { cleanliness: 1 },
        },
      ],
      [
        { value: "property-a", title: "Canal Suite" },
        { value: "property-b", title: "Garden Apartment" },
        { value: "property-c", title: "Riverside Loft" },
      ]
    );

    expect(rows).toEqual([
      expect.objectContaining({
        propertyId: "property-a", title: "Canal Suite", reviewCount: 2, overallRating: 4,
        categoryRatings: expect.objectContaining({ cleanliness: 4, accuracy: 4, communication: null }),
      }),
      expect.objectContaining({
        propertyId: "property-b", reviewCount: 1, overallRating: 4,
        categoryRatings: expect.objectContaining({ cleanliness: 2, accuracy: 5 }),
      }),
      expect.objectContaining({
        propertyId: "property-c", reviewCount: 0, overallRating: null,
        categoryRatings: expect.objectContaining({ cleanliness: null }),
      }),
    ]);
  });

  it("uses review property details when the listings lookup is unavailable", () => {
    const rows = buildPropertyRatingComparison(
      [{ propertyId: "property-a", propertyTitle: "Canal Suite", status: "PUBLISHED", overallRating: 5 }],
      []
    );

    expect(rows).toEqual([expect.objectContaining({ title: "Canal Suite", reviewCount: 1, overallRating: 5 })]);
  });

  it("ignores missing and invalid ratings instead of lowering averages", () => {
    const rows = buildPropertyRatingComparison([
      { propertyId: "property-a", status: "PUBLISHED", overallRating: 0,
        categoryRatings: { cleanliness: null, accuracy: "bad" } },
      { propertyId: "property-a", status: "PUBLISHED", overallRating: 4,
        categoryRatings: { cleanliness: 5, accuracy: 3 } },
    ], []);

    expect(rows[0].overallRating).toBe(4);
    expect(rows[0].categoryRatings.cleanliness).toBe(5);
    expect(rows[0].categoryRatings.accuracy).toBe(3);
  });
});
