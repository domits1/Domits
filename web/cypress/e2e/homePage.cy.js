describe('Homepage', () => {
    beforeEach(() => {
    cy.visit('acceptance.domits.com');
  });
  
  it("should display trending accommodations", () => {
    cy.get(".domits-accommodationGroup").first().within(() => {
      cy.get(".domits-accocard").should("have.length.at.least", 1); 
    });
  });

  it("should display boats accommodations", () => {
    cy.get(".domits-boatContainer").eq(1).within(() => {
      cy.get(".domits-accocard").should("have.length.at.least", 1); 
    });
  });

  it("should display campers accommodations", () => {
    cy.get(".domits-boatContainer").eq(2).within(() => {
      cy.get(".domits-accocard").should("have.length.at.least", 1);
    });
  });

  it("should navigate to accommodation details on click", () => {
    cy.get(".domits-accocard").first().click();
    cy.url().should("include", "/listingdetails?ID=");
  });

  it("should show accommodation images in the Swiper", () => {
    cy.get(".domits-accocard").first().within(() => {
      cy.get(".domits-mySwiper .swiper-slide img").should("exist");
    });
});
});
  