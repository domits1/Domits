import '../support/commands';

describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.loginAsGuest();
    });

    it('Should display the landing page and load key sections', () => {
        cy.get('.header-links > .headerHostButton').click();
        cy.wait(500);
        cy.get('.edit-icon-background').click();
        cy.get(':nth-child(2) > .guest-edit-input')
            .should('be.visible')
            .clear()
            .type('ffkdjrvrrrrv grrrrrrrbfdkg fdkgdb@gmail.com');

        cy.get(':nth-child(3) > .guest-edit-input')
            .clear()
            .type('adaswrrwdadadsa', { force: true });

        cy.wait(2000);

        cy.get('.edit-icon-background').click();

        cy.wait(2000);

        cy.intercept('GET', '**/currentUserInfo', { statusCode: 200 });
        cy.get('.edit-icon-background')
            .scrollIntoView()
            .should('be.visible');
    });
});
