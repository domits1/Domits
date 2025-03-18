describe('Homepage Testing', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(2000);
    });

    it('should load the homepage successfully', () => {
        cy.url().should('include','domits.com');
        cy.title().should('not.be.empty');
    });

    it('should display the main elements', () => {
        cy.get('header').should('be.visible');
        cy.get('nav').should('be.visible');
        cy.get('.domits-searchContainer').should('be.visible');
        cy.get('.domits-homepage').should('be.visible');
        cy.get('.main-footer').scrollIntoView().should('be.visible');
    });

    it('should display the search text', () => {
        cy.get('.domits-searchText').should('be.visible');
    });
}); 

describe('Navigation Testing', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(2000);
    });

    it('should have a working navigation menu', () => {
        cy.get('.header-logo > a > img').first().click();
        cy.url().should('not.eq', 'https://www.domits.com');
    });

    it('should navigate to the Home page', () => {
        cy.get('.header-logo > a > img').first().click();
        cy.url().should('eq','https://www.domits.com/home/');
    });

    it('should navigate to the Become a Host page', () => {
        cy.get('.header-right > .headerHostButton').first().click();
        cy.url().should('eq','https://www.domits.com/landing');
    });

    it('should navigate to the Travel Innovation Labs page', () => {
        cy.get('.header-right > .nineDotsButton').first().click();
        cy.url().should('eq','https://www.domits.com/travelinnovation');
    });

    it('should have a working Authentication menu', () => {
        cy.get('.header-personal-menu').first().click();
        cy.get('.header-dropdown-login-button').should('be.visible');
        cy.get('.header-dropdown-register-button').should('be.visible');
    });
});

describe('Responsiveness Testing', () => {
    
    beforeEach(() => {
        cy.viewport('iphone-6');
        cy.visit('www.domits.com');
        cy.wait(2000);
    });

    it('should check responsiveness (viewport tests)', () => {
        cy.get('.domits-searchbarCon > .bar-container > .mobile-search-button').should('be.visible').click();        
        cy.get('.Search-bar').should('be.visible');
    });

});