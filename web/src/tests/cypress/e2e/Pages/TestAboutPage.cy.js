describe('Testing the About page of Domits', () => {

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(100);
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(4) > .footer-links')
        .click();
        cy.get('.main-footer').scrollIntoView();
    });

    it('should load the About page successfully', () => {
        cy.url().should('eq','https://www.domits.com/about');
        cy.title().should('not.be.empty').then((pageTitle) => {
            cy.log('The page title is: ' + pageTitle);
        });

        cy.contains('About Domits').should('be.visible');
    });

    it('should load the footer copyright', () => {
        cy.get('.footer-copyright').should('be.visible');
    });
});


describe('Testing About Page Navigation', () => {
    
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(100);
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(4) > .footer-links')
        .click();
        cy.get('.main-footer').scrollIntoView();
    });

    it('should navigate to Why Domits page', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(1) > .footer-links').click();
        cy.url().should('include', 'https://www.domits.com/why-domits');
    });

    it('should navigate to Product Updates page', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(3) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/release');
    });
 
    it('should navigate to About page', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(4) > .footer-links').click();
        cy.url().should('include', 'https://www.domits.com/about');
    });    

    it('should navigate to Security page from footer links', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(5) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/security');
    });

    it('should navigate to Careers page from footer links', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(6) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/career');
    });
    
    it('should navigate to Contact page from footer links', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(7) > .footer-links').click();
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
    
    it('should navigate to Become a Host page from footer links', () => {
        cy.get(':nth-child(3) > .footer-lists > :nth-child(1) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/landing');
    });
    
    it('should navigate to Become a Host page from footer links', () => {
        cy.get(':nth-child(3) > .footer-lists > :nth-child(2) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/helpdesk-host');
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