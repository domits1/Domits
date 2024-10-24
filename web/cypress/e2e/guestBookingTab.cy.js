describe('Landing Page Tests', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();

        cy.fixture('booking.json').then((bookings) => {
            cy.intercept('POST', 'https://j1ids2iygi.execute-api.eu-north-1.amazonaws.com/default/FetchGuestPayments', {
                statusCode: 200,
                body: bookings,
                headers: {
                    'cache-control': 'no-store'
                }
            }).as('fetchBookings');
        });

        cy.window().then((win) => {
            win.Auth = {
                currentUserInfo: cy.stub().resolves({
                    attributes: {
                        sub: '12345',
                    },
                }),
            };
        });

        cy.viewport(1920, 1080);
        cy.loginAsGuest();
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.dashboardSections > :nth-child(2)').click();
        cy.wait(500);
    });

    it('Should display the landing page and load key sections', () => {
        cy.contains('Booking').should('be.visible');
    });

    it('Should display bookings after data is fetched', () => {
        cy.wait('@fetchBookings').then((interception) => {
            cy.log(JSON.stringify(interception.response.body, null, 2));
        });

        cy.get('.bookings-table').should('be.visible');
        cy.get('.bookings-table tbody tr').should('have.length.at.least', 2);
    });

    it('Should redirect to listing details on booking click', () => {
        cy.wait('@fetchBookings');
        cy.get('.bookings-table tbody tr').first().click();
        cy.url().should('include', '/listingdetails?ID=');
    });
});
