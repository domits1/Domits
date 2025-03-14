import '../../support/commands';

describe('Booking Engine Test - Aventura Yachts A45', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);

        cy.session('loginSession', () => {
            cy.loginAsGuest();
            cy.get('.header-links').should('contain', 'Switch to Guest'); 
        });

        cy.visit('https://acceptance.domits.com/home', { failOnStatusCode: false });
        cy.wait(3000); 
    });

    it('Should log in as a guest', () => {
        cy.get('.header-links > .headerHostButton').click();
        cy.get('.edit-icon-background').click();
        
        cy.get(':nth-child(2) > .guest-edit-input')
            .should('be.visible')
            .clear()
            .type('testpersoondomits@gmail.com', { force: true });

        cy.get(':nth-child(3) > .guest-edit-input')
            .clear()
            .type('Test', { force: true });

        cy.wait(2000);
        cy.get('.edit-icon-background').click();
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
    });

    it('should select Aventura Yachts A45 and complete the booking process', () => {
       
       cy.wait(3000); 

       
       cy.get(':nth-child(3) > .swiper > .swiper-wrapper > .swiper-slide-visible > img')
           .should('be.visible')
           .click({ force: true });

       
       cy.url().should('include', '/listingdetails?ID=16426fb5-378d-420a-87a7-a1a509e91677');
       cy.wait(2000);

       
       cy.get('.dropdown-button').click();
       cy.wait(1000);
       
       
       cy.get('.button__box > :nth-child(3)').click();
       cy.wait(500);
      
       cy.get(':nth-child(2) > .button__box > :nth-child(2)').click();
       cy.wait(500);
      
       cy.get(':nth-child(3) > .button__box > :nth-child(2)').click();
       cy.wait(500);
       
       cy.get('.dropdown-button').click();
       cy.wait(1000);

       
       cy.get('.reserve-button').should('be.visible').click();
       cy.wait(3000);

       
       cy.url().should('include', '/bookingoverview');
       cy.wait(2000); 

       cy.visit('https://acceptance.domits.com/bookingoverview/?id=16426fb5-378d-420a-87a7-a1a509e91677&checkIn=null&checkOut=null&adults=1&kids=0&pets=0&cleaningFee=0&amountOfGuest=1&taxes=0&ServiceFee=0', { failOnStatusCode: false });
       cy.wait(3000);

       
       cy.get('.confirm-pay-button').should('be.visible');

       
        cy.get('.confirm-pay-button').should('be.visible').click();

   });
});
