import '../../support/commands'

describe.skip('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('TODO: Fix API issue before enabling this test', function() {
        this.skip(); // Prevent execution while keeping a reminder
    });

    it.skip('Should display the landing page and load key sections', () => {
        // TODO: Change the API to the correct one because even though the name is changed, it still shows 'kacper' in Cypress tests.
        cy.loginAsGuest();
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.edit-icon-background').click();
        cy.get(':nth-child(2) > .guest-edit-input').should('be.visible').clear().type(' testpersoondomits@gmail.com ' , { force: true });
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

    describe.skip('Guest Dashboard Initial Render', () => {
        it.skip('should fetch and display user data', () => {
            // TODO: Change the API to fetch the correct user information.
            cy.loginAsGuest();
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

            cy.contains('Email:').next().should('contain', 'testpersoondomits@gmail.com');
            cy.contains('Name:').next().should('contain', 'Test');
        });
    });

    describe.skip('Edit Button Toggle', () => {
        it.skip('should toggle edit mode for email and name', () => {
            // TODO: Investigate why edit mode is not toggling properly.
            cy.loginAsGuest();
            cy.get('.header-links > .headerHostButton').click();
            cy.wait(500);
            cy.get('.edit-icon-background').click();
        });
    });
});
