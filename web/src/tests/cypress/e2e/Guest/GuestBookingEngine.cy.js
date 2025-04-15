import "../../support/commands";

describe("Booking Engine Test - Beekse Bergen, Netherlands", () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);

    cy.session("loginSession", () => {
      cy.loginAsGuest();
      cy.get('.header-links > .headerHostButton');
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
    cy.get('.logo > a > img').click();
    cy.get(':nth-child(1) > .swiper > .swiper-wrapper > .swiper-slide-visible > img').click();
    cy.get('.reserve-btn').click();
    
  });

 

});
