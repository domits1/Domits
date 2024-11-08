import '../support/commands';

describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.loginAsGuest();
    });

    it('Should display the landing page and load key sections', () => {
        cy.get('.header-links > .headerHostButton').click();
        cy.wait(500);

        cy.get('.dashboardSections > :nth-child(6)').click();

        cy.get(':nth-child(2) > .edit-icon-background').click();
        cy.get('.guest-edit-input')
            .should('be.visible')
            .clear()
            .type('ffkdjrvrrrrv grrrrrrrbfdkg fdkgdb@gmail.com');

        cy.get(':nth-child(3) > .edit-icon-background').click();
        cy.get(':nth-child(3) > [style="display: flex;"] > .guest-edit-input')
            .clear()
            .type('adaswrrwdadadsa', { force: true });

        cy.wait(2000);


        cy.get('#root > div > div.page-body > div > div.content > div > div:nth-child(3) > div:nth-child(2) > div > img').click();

        cy.wait(2000);

        cy.intercept('GET', '**/currentUserInfo', { statusCode: 200 });

        cy.get('#root > div > div.page-body > div > div.content > div > div:nth-child(2) > div:nth-child(2) > input')
            .scrollIntoView()
            .should('be.visible');
    });
});
