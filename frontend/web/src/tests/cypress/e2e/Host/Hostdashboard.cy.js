describe('Guest Login Flow', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('should load the homepage and allow a guest to log in', () => {
        
      
        cy.visit('https://acceptance.domits.com/');

        
        cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();

        
        cy.get('.dropdownLoginButton').click();

        
        cy.get('#email').type('testpersoondomits@gmail.com');
        cy.get('#password').type('Gmail.com1');

        cy.get('.loginButton').click();

        cy.get('.hostchatbot-close-button').click();
        
        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(4)').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get(':nth-child(5) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(6) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(7) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(8) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(9) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(10)').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get(':nth-child(11) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();
        


    });
});
