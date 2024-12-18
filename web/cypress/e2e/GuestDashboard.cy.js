import '../support/commands'

describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });
  
    it('Should display the landing page and load key sections', () => {
        cy.loginAsGuest();
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.edit-icon-background').click();
        cy.get(':nth-child(2) > .guest-edit-input').should('be.visible').clear().type('ffkdjrvrrrrv grrrrrrrbfdkg fdkgdb@gmail.com ' , { force: true });
        cy.get(':nth-child(3) > .guest-edit-input').clear().type('adaswrrwdadadsa', { force: true });
        cy.wait(2000);
        cy.get('.edit-icon-background').click();
        cy.wait(2000);
        cy.intercept('GET', '**/currentUserInfo', {
            statusCode: 200,
            body: {
                attributes: {
                    email: 'kacperfl29@gmail.com',
                    given_name: '...long name...',
                },
            },
        });
    });

    describe('Guest Dashboard Initial Render', () => {
        it('should fetch and display user data', () => {
            cy.loginAsGuest();
            cy.intercept('GET', '**/currentUserInfo', {
                statusCode: 200,
                body: {
                    attributes: {
                        email: 'kacperfl29@gmail.com',
                        given_name: 'adaswrrwdadadsa',
                    },
                },
            });
            cy.get('.header-links > .headerHostButton').click();

            cy.contains('Email:').next().should('contain', 'kacperfl29@gmail.com');
            cy.contains('Name:').next().should('contain', 'adaswrrwdadadsa');
        });
    });

    describe('Edit Button Toggle', () => {
        it('should toggle edit mode for email and name', () => {
            cy.loginAsGuest();
            cy.get('.header-links > .headerHostButton').click();
            cy.wait(500);
            cy.get('.edit-icon-background').click();
        });
    });
});
