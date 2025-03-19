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

    
    it('should navigate to How it works from footer links', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(2) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/how-it-works');
    });

    it('should navigate to Product Update page from footer links', () => {
        cy.get('.footer-lists > :nth-child(3) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/release');
    });

    it('should navigate to Travel Innovation page from footer links', () => {
        cy.get('.footer-lists > :nth-child(4) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/travelinnovation');
    });

    it('should navigate to About page from footer links', () => {
        cy.get('.footer-lists > :nth-child(5) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/about');
    });

    it('should navigate to Careers page from footer links', () => {
        cy.get('.footer-lists > :nth-child(6) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/career');
    });

    it('should navigate to Security page from footer links', () => {
        cy.get(':nth-child(8) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/security');
    });
    
    it('should navigate to Sustainability page from footer links', () => {
        cy.get(':nth-child(9) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/sustainability');
    });
    
    it('should navigate to Domits AI page from footer links', () => {
        cy.get(':nth-child(10) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/domitsai');
    });
    
    it('should navigate to Contact page from footer links', () => {
        cy.get(':nth-child(11) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/contact');
    });
    
    it('should navigate to Search and Book page from footer links', () => {
        cy.get(':nth-child(2) > .footer-lists > :nth-child(1) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/');
    });
    
    it('should navigate to Helpdesk for guests page from footer links', () => {
        cy.get(':nth-child(2) > .footer-lists > :nth-child(2) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/helpdesk-guest');
    });

    
    it('should navigate to Privacy policy page from footer links', () => {
        cy.get('.footer-terms > :nth-child(2) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/policy');
    });

    it('should navigate to Terms and Conditions page from footer links', () => {
        cy.get('.footer-terms > :nth-child(3) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/terms');
    });    

    it('should navigate to Disclaimer page from footer links', () => {
        cy.get('.footer-terms > :nth-child(4) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/disclaimers');
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