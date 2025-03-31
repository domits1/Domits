describe('Testing Why Domits Page Visibility', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(2000);
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(1) > .footer-links')
        .click();
        cy.url().should('include', 'https://www.domits.com/why-domits');
    });

    it('should load the Why Domits page successfully', () => {
        cy.title().should('not.be.empty').then((pageTitle) => {
            cy.log("The page title is: " +pageTitle);            
        });

        cy.contains('Why Domits & how we win together').should('be.visible');
    });

    it('should display the main elemets', () => {        
        cy.get('header').should('be.visible');
        cy.get('nav').should('be.visible');
        cy.get('.searchBar_inputfield').should('be.visible');
        cy.get('.why-domits__title-text-container').should('be.visible');
        cy.get('#Guest > .why-domits__flex-container').should('be.visible');
        cy.get('#Host > .why-domits__flex-container').should('be.visible');
        cy.get('#Devs > .why-domits__flex-container').should('be.visible');
        cy.get('#Growth > .why-domits__flex-container').should('be.visible');
        cy.get('.main-footer').scrollIntoView().should('be.visible');
    });

    it('should display the main heading', () => {
        cy.get('.why-domits__title-text-container > .why-domits__h3')
        .should('contain.text', 'Why Domits & how we win together');
    });

    it('should have a description paragraph', () => {
        cy.get('.why-domits__title-text-container > :nth-child(3)')
        .should('exist').and('be.visible');
    });

    it('should display why domits for guest heading', () => {
        cy.get('#Guest > .why-domits__flex-container > :nth-child(1) > .why-domits__h3')
        .should('contain.text', 'Why Domits for guest');
    });

    it('should have a description paragraph under why domits for guest', () => {
        cy.get('#Guest > .why-domits__flex-container > :nth-child(2)')
        .should('exist').and('be.visible');

        cy.get('#Guest > .why-domits__flex-container > :nth-child(3)')
        .should('exist').and('be.visible');

        cy.get('#Guest > .why-domits__flex-container > :nth-child(4)')
        .should('exist').and('be.visible');

        cy.get('#Guest > .why-domits__flex-container > :nth-child(5)')
        .should('exist').and('be.visible');

        cy.get('#Guest > .why-domits__flex-container > :nth-child(6)')
        .should('exist').and('be.visible');

        cy.get('#Guest > .why-domits__flex-container > :nth-child(7)')
        .should('exist').and('be.visible');
    });

    it('should display why domits for host heading', () => {
        cy.get('#Host > .why-domits__flex-container > :nth-child(1) > .why-domits__h3')
        .should('contain.text', 'Why Domits for host');
    });

    it('should have description paragraph under the why domits for host', () => {
        cy.get('#Host > .why-domits__flex-container > :nth-child(2)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(3)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(4)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(5)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(6)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(7)')
        .should('exist').and('be.visible');

        cy.get('#Host > .why-domits__flex-container > :nth-child(8)')
        .should('exist').and('be.visible');
    });

    it('should display why domits for dev, data and sec experts heading', () => {
        cy.get('#Devs > .why-domits__flex-container > :nth-child(1) > .why-domits__h3')
        .should('contain.text', 'Why Domits for dev, data and sec experts');
    });

    it('should have description paragraph under the why domits for dev, data and sec experts', () => {
        cy.get('#Devs > .why-domits__flex-container > :nth-child(2)')
        .should('exist').and('be.visible');

        cy.get('#Devs > .why-domits__flex-container > :nth-child(3)')
        .should('exist').and('be.visible');

        cy.get('#Devs > .why-domits__flex-container > :nth-child(4)')
        .should('exist').and('be.visible');

        cy.get('#Devs > .why-domits__flex-container > :nth-child(5)')
        .should('exist').and('be.visible');
    });

    it('should display why domits for growth, rev and ops experts heading', () => {
        cy.get('#Growth > .why-domits__flex-container > :nth-child(1) > .why-domits__h3')
        .should('contain.text', 'Why Domits for growth, rev and ops experts');
    });

    it('should have description paragraph under the why domits for growth, rev and ops experts', () => {
        cy.get('#Growth > .why-domits__flex-container > :nth-child(2)')
        .should('exist').and('be.visible');

        cy.get('#Growth > .why-domits__flex-container > :nth-child(3)')
        .should('exist').and('be.visible');

        cy.get('#Growth > .why-domits__flex-container > :nth-child(4)')
        .should('exist').and('be.visible');

        cy.get('#Growth > .why-domits__flex-container > :nth-child(5)')
        .should('exist').and('be.visible');
    });
});

describe('Testing Why Domits Page Navigation', () => {
    
    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(2000);
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(1) > .footer-links')
        .click();
        cy.url().should('include', 'https://www.domits.com/why-domits');
    });

    it('should navigate to Landing page', () => {
        cy.get(':nth-child(4) > [href="/landing"]').click();
        cy.url().should('include', 'https://www.domits.com/landing/');
    });

    it('should navigate to How it works page', () => {
        cy.get(':nth-child(4) > [href="/how-it-works"]').click();
        cy.url().should('include','https://www.domits.com/how-it-works/');
    });

    it('should navigate to About page', () => {
        cy.get('.why-domits__title-text-container > :nth-child(4) > [href="/about"]').click();
        cy.url().should('include', 'https://www.domits.com/about/');
    });

    it('should navigate to How it works from footer links', () => {
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(2) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/how-it-works');
    });

    it('should navigate to Product Update page from footer links', () => {
        cy.get('.footer-lists > :nth-child(3) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/release');
    });

    it('should navigate to About page from footer links', () => {
        cy.get('.footer-lists > :nth-child(4) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/about');
    });

    it('should navigate to Security page from footer links', () => {
        cy.get(':nth-child(5) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/security');
    });

    it('should navigate to Careers page from footer links', () => {
        cy.get('.footer-lists > :nth-child(6) > .footer-links').click();
        cy.url().should('include','https://www.domits.com/career');
    });

    it('should navigate to Contact page from footer links', () => {
        cy.get(':nth-child(7) > .footer-links').click();
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