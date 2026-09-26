// Review: Verifies public listing reviews remain readable on desktop and mobile viewports.

describe("Listing details reviews", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/reviews?propertyId=property-1*", {
      statusCode: 200,
      body: {
        reviews: [
          {
            id: "review-1",
            overallRating: 5,
            title: "Wonderful stay",
            publicReview: "Clean, calm, and close to everything we needed.",
            verificationStatus: "VERIFIED_STAY",
            status: "PUBLISHED",
            createdAt: 1788266400000,
            categoryRatings: {
              cleanliness: 5,
              communication: 5,
            },
          },
        ],
        totalReviews: 1,
        overallRating: 5,
        categoryRatings: {
          cleanliness: 5,
          communication: 5,
        },
      },
    }).as("reviewsByProperty");
  });

  it("renders review summary, categories, public reviews, and verified labels on desktop", () => {
    cy.viewport(1280, 900);
    cy.visit("/listingdetails?ID=property-1");

    cy.wait("@reviewsByProperty");

    cy.contains("Guest reviews").should("be.visible");
    cy.contains("5.0").should("be.visible");
    cy.contains("1 review").should("be.visible");
    cy.contains("Cleanliness").should("be.visible");
    cy.contains("Communication").should("be.visible");
    cy.contains("Clean, calm, and close to everything we needed.").should("be.visible");
    cy.contains("Verified stay").should("be.visible");
  });

  it("keeps reviews readable on mobile", () => {
    cy.viewport(390, 844);
    cy.visit("/listingdetails?ID=property-1");

    cy.wait("@reviewsByProperty");

    cy.get("#listing-reviews").should("be.visible");
    cy.get("#listing-reviews").should("not.have.css", "overflow-x", "scroll");
    cy.contains("Guest reviews").should("be.visible");
    cy.contains("Verified stay").should("be.visible");
  });
});
