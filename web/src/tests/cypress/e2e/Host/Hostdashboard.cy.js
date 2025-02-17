import '../../support/commands'

describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('Should display the landing page and load key sections', () => {
        cy.loginAsGuest();
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.edit-icon-background').click();
        cy.get(':nth-child(2) > .guest-edit-input').should('be.visible').clear().type(' testpersoondomits@gmail.com ' , { force: true });
        cy.wait(1000);
        cy.get(':nth-child(3) > .guest-edit-input').clear().type('Test', { force: true });
        cy.wait(2000);
        cy.get('.edit-icon-background').click();
        cy.wait(2000);
        
        cy.intercept('GET', '**/currentUserInfo', {
            statusCode: 200,
            body: {
                attributes: {
                    email: 'testpersoondomits@gmail.com',
                    given_name: '...long name...',
                },
            },
        });
    });

    describe('Guest Dashboard Initial Render', () => {
        it('should fetch and display user data', () => {
            cy.loginAsGuest();
            cy.wait(2000);
            cy.intercept('GET', '**/currentUserInfo', {
                statusCode: 200,
                body: {
                    attributes: {
                        email: 'testpersoondomits@gmail.com',
                        given_name: 'Test',
                    },
                },
            });
            cy.get('.header-links > .headerHostButton').click();
            cy.wait(5000);

            cy.contains('Email:').next().should('contain', 'testpersoondomits@gmail.com');
            cy.contains('Name:').next().should('contain', 'Test');
        });
    });

    describe('Edit Button Toggle', () => {
        it('should toggle edit mode for email and name', () => {
            cy.loginAsGuest();
            cy.wait(2000);
            cy.get('.header-links > .headerHostButton').click();
            cy.wait(2000);
            cy.get('.edit-icon-background').click();
        });
    });
});
