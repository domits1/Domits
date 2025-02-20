/// <reference types="Cypress" />
import '../support/commands'

// describe("Header logo button test", () => {
//   it("should go to home page if clicked on logo", () => {
//     cy.visit("https://domits.com/");
//     cy.get(".header-nav > .logo").click();
//   });
// });

// describe("Header search bar test", () => {
//   it("should be able to type and search", () => {
//     cy.visit("https://domits.com/");
//     cy.get(".searchBar_inputfield").click().type("Stockholm");
//     cy.get(".searchbar-button").click("");
//     cy.get("#card-visibility > .accocard").should("have.length", "1");
//   });
// });

// describe("Header accommodation test", () => {
//   it("Accommodation button/function works", () => {
//     cy.visit("https://domits.com/");
//     //selecting Apartment in accomodations
//     cy.get(".css-hlgwow").click();
//     cy.get("#react-select-2-option-0").click();
//     cy.get(".css-hlgwow").should("contain.text", "Apartment");
//     cy.get(".css-hlgwow").should("not.contain.text", "House");

//     //this should click on the x button to remove "Apartment"
//     cy.get(".css-1wy0on6").click();
//     cy.get(".css-hlgwow").should("not.contain.text", "Apartment");

//     //checking to see if it recommends houses
//     cy.get(".css-hlgwow").click();
//     cy.get("#react-select-2-option-1").click();
//     cy.get(".searchbar-button").click("");
//     //the Stockholm, sweden accocard should be visible. Calais, France should not be visible
//     cy.get("#card-visibility > .accocard").should("contain.text", "Stockholm").should("not.contain.text" , "Yacht").pause;
//     cy.get(".css-1wy0on6").click();
//   });
// });

describe.skip('Header Guest&Rooms test', () => {
  it('Guest&Rooms function should work', () => {
    cy.visit('https://domits.com/')
    cy.get('.searchTitleGuest').click()
    cy.get('.Search-guestCounter:first-child > button:').pause

    // cy.get("").pause;
  })
})
