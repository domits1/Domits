describe("Guest Booking Engine - Login Flow", () => {
  beforeEach(() => {
    cy.visit("https://acceptance.domits.com/", {
      failOnStatusCode: false,
      pageLoadTimeout: 0,
    });
  });

  it("should allow user to login and make a reservation", () => {
    cy.get('[src="/static/media/profile-icon.0cd455f54ee6076e94d35d8e3bb148c8.svg"]').should("be.visible").click();

    cy.get(".dropdownLoginButton").should("be.visible").click();

    cy.url().should("include", "/login");

    cy.get("#email").should("be.visible").type("testpersoondomits@gmail.com");

    cy.get('.passwordContainer input[type="password"]').should("be.visible").type("Gmail.com1");

    cy.get(".loginButton").should("be.visible").click();

    cy.url().should("not.include", "/login");

    cy.get(".logo > a > img").should("be.visible").click();

    cy.get(":nth-child(1) > .accocard-content > .accocard-detail").should("be.visible").click();

    cy.get('[style="width: auto;"] > input').should("be.visible").type("2025-06-01");

    cy.get('[style="width: auto; margin-left: 10px;"] > input').should("be.visible").type("2025-06-03");

    cy.get(".reserve-btn").should("be.visible").click();
    
  });
});
