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

    it.only('should load the About page successfully', () => {
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

}); 