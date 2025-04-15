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

    it('should display the about container', () => {
        cy.get('.about').should('be.visible');
    });  

    it('should display the sub-header', () => {
        cy.get('h3.about__title').should('be.visible')
        .and('contain.text', 'Tailor-made travel partnerships');
    });

    it('should display the footer copyright', () => {
        cy.get('.footer-copyright').should('be.visible');
    });

    it('should display the vision factbox', () => {
        cy.get('.about__factsbox > :nth-child(1)').should('be.visible')
        .and('contain.text', 'Vision');
    });
    
    it('should display the vision logo', () => {
        cy.get(':nth-child(1) > .about__fact-header > .about__fact-image').should('be.visible');
    });

    it('should display the vision subtitle', () => {
        cy.get(':nth-child(1) > .about__fact-subtitle').should('be.visible')
        .and('contain.text', 'A healthy, safe and future-proof travel world');
    });

    it('should display the vision text', () => {
        cy.get(':nth-child(1) > .about__fact-text').should('be.visible')
        .and('contain.text', 'Our vision');
    });    

    it('should display the about factbox', () => {
        cy.get('.about__factsbox > :nth-child(2)').should('be.visible')
        .and('contain.text', 'What we do');
    });
    
    it('should display the about logo', () => {
        cy.get(':nth-child(2) > .about__fact-header > .about__fact-image').should('be.visible');
    });

    it('should display the about subtitle', () => {
        cy.get(':nth-child(2) > .about__fact-subtitle').should('be.visible')
        .and('contain.text', 'Together with partners we provide travel solutions');
    });

    it('should display the about text', () => {
        cy.get(':nth-child(2) > .about__fact-text').should('be.visible')
        .and('contain.text', 'We build');
    });

    it('should display the about crew container', () => {
        cy.get('.about__crew').should('be.visible');
    });

    it('should display the about crew title', () => {
        cy.get('.about__who-we-are-title').should('be.visible');
    });

    it('should display the about crew sub-title', () => {
        cy.get('.about__who-we-are-subtitle').should('be.visible');
    });
    
    it('should display the about crew founder', () => {
        cy.contains('Stefan').should('be.visible');
    });

    it('should display the about crew founder title', () => {
        cy.contains('Founder').should('be.visible');
    });
    
    it('should display the about footer container', () => {
        cy.get('.about__footer').should('be.visible');
    });

    it('should display the about footer content', () => {
        cy.get('.about__footer-text').should('be.visible')
        .and('contain.text', 'We believe that every employee can be a conscious founder.');
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

    it('should navigate to how it works page', () => {
        cy.get('.about__text-container > :nth-child(2) > [href="/how-it-works"]').click();
        cy.url().should('include', 'https://www.domits.com/how-it-works/');
    });

    it('should navigate to Why domits page', () => {
        cy.get(':nth-child(2) > [href="/why-domits"]').click();
        cy.url().should('include', 'https://www.domits.com/why-domits/');
    });    
}); 