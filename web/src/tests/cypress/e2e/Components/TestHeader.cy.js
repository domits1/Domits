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

describe('Testing Header Component while authenticated', () => {
    
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(100);
        cy.loginAsHost();
    });
    
    it('should navigate to Domits Host dashboard page', () => {
        cy.get('.personalMenu').click();
        cy.get('.personalMenuDropdownContent > :nth-child(2)').click();
        cy.url().should('include', 'https://acceptance.domits.com/hostdashboard');
    });

    it('should navigate to Domits Host dashboard - Calendar', () => {
        cy.get('.personalMenu').click();
        cy.get('.personalMenuDropdownContent > :nth-child(3)').click();
        cy.url().should('include', 'https://acceptance.domits.com/hostdashboard/calendar');
    });

    it('should navigate to Domits Host dashboard - Reservations', () => {
        cy.get('.personalMenu').click();
        cy.get('.personalMenuDropdownContent > :nth-child(4)').click();
        cy.url().should('include', 'https://acceptance.domits.com/hostdashboard/reservations');
    });

    it('should navigate to Domits Host dashboard - Messages', () => {
        cy.get('.personalMenu').click();
        cy.get('.personalMenuDropdownContent > :nth-child(5)').click();
        cy.url().should('include', 'https://acceptance.domits.com/hostdashboard/chat');
    });

    it('should navigate to Logout', () => {
        cy.get('.personalMenu').click();
        cy.get('.personalMenuDropdownContent > .dropdownLogoutButton').click();
        cy.url().should('include', 'https://acceptance.domits.com/');
    });

    
});