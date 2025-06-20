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
        cy.get('.headerHostButton').click();

        cy.get('.hamburger-btn').click();

        cy.get('.dashboard-sections > :nth-child(2)').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get('.dashboard-sections > :nth-child(3)').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

        cy.get('.hamburger-btn').click();
        cy.get(':nth-child(5) > p').should('be.visible').click();
        cy.get('.close-sidebar-btn').should('be.visible').click();

    });
});
