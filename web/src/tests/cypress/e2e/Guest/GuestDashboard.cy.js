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

    cy.get(".headerHostButton").should("be.visible").click();

    cy.get(".dashboardSections > :nth-child(2)").should("be.visible").click();
    cy.get(".dashboardSections > :nth-child(3)").should("be.visible").click();
    cy.get(".headerHostButton").should("be.visible").click();
    cy.get(".headerHostButton").should("be.visible").click();
    cy.get(".dashboardSections > :nth-child(4)").should("be.visible").click();
    
  });
});
