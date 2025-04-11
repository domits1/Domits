describe("Guest Dashboard full flow test (live)", () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it("logs in as guest and navigates through the dashboard sections", () => {

    cy.visit("https://www.domits.com/");

 
    cy.get(
      '.header-personal-menu > [src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]'
    ).click();
    cy.get(".header-dropdown-login-button").click();

    cy.get('input[type="email"]').type("testpersoondomits@gmail.com");
    cy.get('input[type="password"]').type("Gmail.com1");
    cy.get('button[type="submit"]').click();

    cy.url().should("include", "/hostdashboard");

    cy.get(".header-links > .headerHostButton").click();

    cy.url().should("include", "/guestdashboard");

 
    cy.get(".dashboardSections > :nth-child(2)").should("be.visible").click();
    cy.url().should("include", "/guestdashboard/bookings");

    cy.get(".dashboardSections > .active").should("be.visible").click();
    cy.get(".dashboardSections > .active").should("be.visible").click(); 

    
    cy.get(".dashboardSections > :nth-child(4)").should("be.visible").click();
    cy.url().should("include", "/guestdashboard/settings");
    cy.contains("Phone:").should("be.visible");
  });
});
