describe('Testing Header Component', () => {
    
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(100);
    });

    it('should navigate to Domits Home page', () => {
        cy.get('.header-logo > a > img').click();
        cy.url().should('include', 'https://www.domits.com/home/');
    });

    it('should navigate to Domits Landing page', () => {
        cy.get('.header-right > .headerHostButton').click();
        cy.url().should('include', 'https://www.domits.com/landing');
    });

    it('should navigate to Domits Travel in Innovation page', () => {
        cy.get('.header-right > .nineDotsButton > img').click();
        cy.url().should('include', 'https://www.domits.com/travelinnovation');
    });

    it('should navigate to Domits Login page', () => {
        cy.get('.header-personal-menu').click();
        cy.get('.header-dropdown-login-button').click();        
        cy.url().should('include', 'https://www.domits.com/login');
    });

    it('should navigate to Domits Registration page', () => {
        cy.get('.header-personal-menu').click();
        cy.get('.header-dropdown-register-button').click();        
        cy.url().should('include', 'https://www.domits.com/register');
    });
}); 