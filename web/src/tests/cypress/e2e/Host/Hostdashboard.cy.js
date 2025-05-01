describe("Guest Booking Engine - Login Flow", () => {
  beforeEach(() => {
    cy.visit("https://acceptance.domits.com/", {
      failOnStatusCode: false,
      pageLoadTimeout: 0,
    });
  });

  it("should allow user to login quickly and reliably", () => {
    cy.get('[src="/static/media/profile-icon.0cd455f54ee6076e94d35d8e3bb148c8.svg"]').should("be.visible").click();

    cy.get(".dropdownLoginButton").should("be.visible").click();

    cy.url().should("include", "/login");

    cy.get("#email").should("be.visible").type("testpersoondomits@gmail.com");

    cy.get('.passwordContainer input[type="password"]').should("be.visible").type("Gmail.com1");

    cy.get(".loginButton").should("be.visible").click();

    cy.url().should("not.include", "/login");

    cy.get(".hostchatbot-close-button").should("be.visible").click();

    cy.get('.dashboardSection > :nth-child(3) > p').should("be.visible").click();
    
    cy.get('.dashboardSection > :nth-child(3) > p').should("be.visible").click();

    cy.get(':nth-child(4) > p').should("be.visible").click();

    cy.get(':nth-child(5) > p').should("be.visible").click();

    cy.get(':nth-child(6) > p').should("be.visible").click();

    cy.get(':nth-child(7) > p').should("be.visible").click();

    cy.get(':nth-child(8) > p').should("be.visible").click();

    cy.get(':nth-child(9) > p').should("be.visible").click();

    cy.get(':nth-child(10) > p').should("be.visible").click();

    cy.get(':nth-child(11) > p').should("be.visible").click();
    
  });
});
