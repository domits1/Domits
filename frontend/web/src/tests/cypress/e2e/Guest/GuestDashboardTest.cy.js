import '../../support/commands';


describe('Guest Dashboard Navigation Test - Fix 2', () => {
  beforeEach(() => {
    cy.visit('https://www.domits.com/');


    cy.get('.header-personal-menu')
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true });


    cy.get('.header-dropdown-login-button')
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true });


    cy.url().should('include', '/login');


    cy.get('#email', { timeout: 5000 }).type('testpersoondomits@gmail.com');
    cy.get('#password', { timeout: 5000 }).type('Gmail.com1', { log: false });


    cy.get('.loginButton').should('be.visible').click();
    cy.url({ timeout: 10000 }).should('include', '/hostdashboard');


    cy.wait(2000);


 
    cy.get('body').then(($body) => {
        if ($body.find('.hostchatbot-header').length > 0) {
            cy.get('.hostchatbot-header').then(($chatbot) => {
                if ($chatbot.is(':visible')) {
                    cy.get('.hostchatbot-close-button').click();
                    cy.wait(1000);
                }
            });
        }
    });
        cy.contains('Switch to Guest', { timeout: 5000 })
            .should('be.visible')
            .click();


        cy.url({ timeout: 10000 }).should('include', '/guestdashboard');
    });


    it('Navigates through Guest Dashboard sections', () => {
      cy.get('.dashboardSections > :nth-child(2)').scrollIntoView().click();
      cy.url().should('include', '/guestdashboard/bookings');
      cy.wait(5000);
 
      cy.get('.dashboardSections > :nth-child(3)').scrollIntoView().click();
      cy.url().should('include', '/guestdashboard/chat');
      cy.wait(5000);
 
      cy.get('.dashboardSections > :nth-child(4)').scrollIntoView().click();
      cy.url().should('include', '/guestdashboard/reviews');
      cy.wait(5000);
 
      cy.get('.dashboardSections > :nth-child(5)').scrollIntoView().click();
      cy.url().should('include', '/guestdashboard/settings');
  });
 
});

