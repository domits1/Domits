import "../../support/commands";

describe("Booking Engine Test - Beekse Bergen, Netherlands", () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);

    cy.session("loginSession", () => {
      cy.loginAsGuest();
      cy.get(".header-links").should("contain", "Switch to Guest");
    });

    cy.visit("https://acceptance.domits.com/home", { failOnStatusCode: false });

    cy.get(".header-links")
      .should("be.visible")
      .then(($header) => {
        cy.wrap($header).should("contain", "Switch to Guest");
      });
  });

  it("Should log in as a guest", () => {
    cy.get(".header-links > .headerHostButton")
      .should("be.visible")
      .click();

    cy.get(".edit-icon-background").should("be.visible").click();

    cy.get(":nth-child(2) > .guest-edit-input")
      .should("be.visible")
      .clear()
      .type("testpersoondomits@gmail.com", { force: true });

    cy.get(":nth-child(3) > .guest-edit-input")
      .should("be.visible")
      .clear()
      .type("Test", { force: true });

    cy.get(".edit-icon-background").should("be.visible").click();
  });

  it("should select Beekse Bergen, Netherlands and complete the booking process", () => {
    cy.visit("https://acceptance.domits.com/listingdetails?ID=19472a39-f873-4fb2-aac5-89fa509ecc37", { failOnStatusCode: false });

    cy.url()
      .should("include", "listingdetails")
      .and("include", "19472a39-f873-4fb2-aac5-89fa509ecc37");

    cy.get(".dropdown-button").should("be.visible").click();
    cy.get(".button__box > :nth-child(3)").should("be.visible").click();
    cy.get(":nth-child(2) > .button__box > :nth-child(2)").should("be.visible").click();
    cy.get(":nth-child(3) > .button__box > :nth-child(2)").should("be.visible").click();

    cy.get(".closeButton").should("exist").and("be.visible").click();
    
    cy.get(".reserve-button")
      .should("exist")
      .and("be.visible")
      .click();

    cy.location("pathname").should("include", "/bookingoverview");
  });

});
