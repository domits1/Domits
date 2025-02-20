// describe('Homepage', () => {
//     beforeEach(() => {
//     cy.visit('acceptance.domits.com');
//   });

//   it("should display trending accommodations", () => {
//     cy.get(".domits-accommodationGroup").first().within(() => {
//       cy.get(".accocard").should("have.length.at.least", 1);
//       cy.wait(500);
//     });
//   });

//   it("should display boats accommodations", () => {
//     cy.get(".domits-boatContainer").eq(1).within(() => {
//       cy.get(".accocard").should("have.length.at.least", 1);
//       cy.wait(1000);
//     });
//   });

//   it("should display campers accommodations", () => {
//     cy.get(".domits-boatContainer").eq(2).within(() => {
//       cy.get(".accocard").should("have.length.at.least", 1);
//       cy.wait(1000);
//     });
//   });

//   it("should navigate to accommodation details on click", () => {
//     cy.get(".accocard").first().click();
//     cy.url().should("include", "/listingdetails?ID=");
//     cy.wait(1000);
//   });
// });
