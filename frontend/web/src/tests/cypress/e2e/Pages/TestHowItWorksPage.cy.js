describe('Testing the How It Works Page', () => {
    beforeEach(() => {  
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(2) > .footer-links')
        .click();
    });

    it('should load the How it Works page successfully', () => {
        cy.url().should('eq', 'https://www.domits.com/how-it-works');
        cy.title().should('not.be.empty').then((pageTitle) => {
            cy.log('The page title is: ' + pageTitle);
        });

        cy.contains('How Domits Works').should('be.visible');
    });

    it('should display the main elemets', () => {
        cy.get('header').should('be.visible');
        cy.get('nav').should('be.visible');
        cy.get('.howitworks__main').should('be.visible');
        cy.get('.howitworks__info-block--guests').should('be.visible');
        cy.get('.howitworks__info-block--hosts').should('be.visible');
        cy.get('.howitworks__main > :nth-child(6)').should('be.visible');
        cy.get('.main-footer').scrollIntoView().should('be.visible');
    });

    it('should display header title', () => {
        cy.get(':nth-child(1) > .howitworks__title').should('contain.text','How Domits Works');
    });

    it('should display subtitle', () => {
        cy.get('.howitworks__subtitle').should('contain.text','Discover how Domits makes it easy for both guests and hosts.');
    });

    it('should display Guest section title', () => {
        cy.get(':nth-child(2) > .howitworks__section-title').should('contain.text', 'Guests');
    });

    it('should display Search your destination', () => {
        cy.get('.howitworks__info-block--guests > .borderright > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display Search your destination info text', () => {
        cy.get('.howitworks__info-block--guests > .borderright > .howitworks__info-text')
        .should('be.visible');
    });

    it('should display Book your next holiday', () => {
        cy.get('.howitworks__info-block--guests > :nth-child(2) > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display Book your next holiday info text', () => {
        cy.get('.howitworks__info-block--guests > :nth-child(2) > .howitworks__info-text')
        .should('be.visible');
    });

    it('should display Experience Domits', () => {
        cy.get('.howitworks__info-block--guests > .borderleft > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display Experience Domits info text', () => {
        cy.get('.howitworks__info-block--guests > .borderleft > .howitworks__info-text')
        .should('be.visible');
    });

    it('should display Host section title', () => {
        cy.get(':nth-child(4) > .howitworks__section-title').should('contain.text', 'Hosts');
    });    

    it('should display List your property for rental', () => {
        cy.get('.howitworks__info-block--hosts > .borderright > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display List your property for rental info text', () => {
        cy.get('.howitworks__info-block--hosts > .borderright > .howitworks__info-text')
        .should('be.visible');
    });

    it('should display Get paid easy, fast and safe', () => {
        cy.get('.howitworks__info-block--hosts > :nth-child(2) > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display Get paid easy, fast and safe info text', () => {
        cy.get('.howitworks__info-block--hosts > :nth-child(2) > .howitworks__info-text')
        .should('be.visible');
    });

    it('should display Welcome your guests', () => {
        cy.get('.howitworks__info-block--hosts > .borderleft > .howitworks__info-header > .howitworks__info-title')
        .should('be.visible');
    });

    it('should display  Welcome your guests info text', () => {
        cy.get('.howitworks__info-block--hosts > .borderleft > .howitworks__info-text')
        .should('be.visible');
    });
});


describe('Testing How Domits Works Page Navigation', () => {
    
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();      
        cy.viewport(1920, 1080);
        cy.visit('www.domits.com');
        cy.wait(2000);
        cy.get('.footer-content > :nth-child(1) > .footer-lists > :nth-child(2) > .footer-links')
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