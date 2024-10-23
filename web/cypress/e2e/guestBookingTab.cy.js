import '../support/commands'

describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });
  
    it('Should display the landing page and load key sections', () => {
        cy.loginAsGuest();
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.dashboardSections > :nth-child(2)').click();
        cy.wait(500); 

            cy.intercept('POST', 'https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments', {
                fixture: 'bookings.json' 
            }).as('fetchBookings');

            cy.window().then((win) => {
                win.Auth = {
                currentUserInfo: cy.stub().resolves({
                    attributes: {
                    sub: '12345'
                    }
                })
                };
            });
    });
});


