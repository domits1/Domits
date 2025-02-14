describe('Landing Page Tests', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('Should login', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.wait(3000); 
        
        cy.get('[name="firstName"]').should('be.visible').type('Test');
        cy.get('[name="lastName"]').should('be.visible').type('Persoon');
        cy.get('[type="email"]').should('be.visible').type('testpersoon@scarden.com');
        cy.get('#password').should('be.visible').type('Test24680!');
        
        cy.get('.hostCheckbox > input').click();
        cy.get('.registerButton').click();
        cy.get('.errorText').should('exist');
    });

    it('should click on the Domits logo.', () => {
        cy.visit('https://acceptance.domits.com/home/', { failOnStatusCode: false });
        cy.wait(4000);
        
        cy.get('.logo > a > img').should('have.attr', 'alt', 'Logo');
        cy.get('.logo > a').click();
        cy.url().should('eq', 'https://acceptance.domits.com/home/');
    });

    it('should be able to choose a property and complete interactions', () => {
        cy.visit('https://acceptance.domits.com/home/', { failOnStatusCode: false });
        cy.wait(3000);

        cy.get(':nth-child(9) > .swiper > .swiper-wrapper > .swiper-slide-visible > img').click();
        cy.wait(2000); 
        
        cy.visit('https://acceptance.domits.com/listingdetails/?ID=ed1c0148-4dd7-44d7-80fd-88afa1183ba3', { failOnStatusCode: false });
        cy.wait(3000);

        cy.get('.dropdown-button').click();
        cy.get(':nth-child(1) > .button__box > :nth-child(1)').click();
        cy.get('.button__box > :nth-child(3)').click();
        cy.wait(1000);

        cy.get(':nth-child(2) > .button__box > :nth-child(1)').click();
        cy.get(':nth-child(2) > .button__box > :nth-child(2)').click();
        cy.wait(1000);

        cy.get(':nth-child(3) > .button__box > :nth-child(1)').click();
        cy.get(':nth-child(3) > .button__box > :nth-child(2)').click();
        cy.wait(1000);

        cy.get('.dropdown-button').click();
        cy.get('.reserve-button').click();
    });

    it('should be able to choose a property and complete interactions', () => {
        cy.visit('https://acceptance.domits.com/bookingoverview/?id=ed1c0148-4dd7-44d7-80fd-88afa1183ba3&checkIn=null&checkOut=null&adults=1&kids=1&pets=1&cleaningFee=0&amountOfGuest=3&taxes=0&serviceFee=0', { failOnStatusCode: false });
        cy.wait(3000);

        cy.get('[name="firstName"]').should('be.visible').type('Test');
        cy.get('[name="lastName"]').should('be.visible').type('Persoon');
        cy.get('[type="email"]').should('be.visible').type('testpersoon@scarden.com');

        cy.get('.countryCodeDropdown').should('be.visible').select('+31');
        cy.get('input[name="phone"]').should('be.visible').type('0612345678');

        cy.get('#password').should('be.visible').type('Test24680!');
        
        cy.get('.hostCheckbox > input').click();
        cy.get('.registerButton').click();
        cy.get('.errorText').should('exist');
    });

    it('should confirm email by entering the code', () => {
        cy.visit('https://acceptance.domits.com/confirm-email', { failOnStatusCode: false });
        cy.wait(3000);
        
        cy.get('[name="digit0"]').should('be.visible').type('1');
        cy.get('[name="digit1"]').should('be.visible').type('2');
        cy.get('[name="digit2"]').should('be.visible').type('3');
        cy.get('[name="digit3"]').should('be.visible').type('4');
        cy.get('[name="digit4"]').should('be.visible').type('5');
        cy.get('[name="digit5"]').should('be.visible').type('6');

        cy.get('.hostverification_publish-btn__TiDGZ').click();
    });

});
