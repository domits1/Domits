import '../support/commands';
import 'cypress-file-upload';

describe('Web Host dashboard Enlist', () => {
    it('should be able to add a listing', () => {
        cy.loginAsHostWithStripe(); 
        cy.wait(500); 

        cy.get('.dashboard-head > :nth-child(3)').click();
        cy.get('.boxColumns > .wijzer').click();
        cy.get('.accommodation-types').contains('House').click();
        cy.contains('button', 'Confirm and proceed').click();
        cy.get('.guest-access-item').contains('Entire house').click();
        cy.contains('button', 'Confirm and proceed').click();
        cy.get('div[id="country"] input[type="text"]').type('Netherlands');
        cy.get('div[id="country"] input[type="text"]').type('{enter}');

        cy.get('input[id="city"]').type('Amsterdam');
        cy.get('input[id="street"]').type('Maanstraat 2');
        cy.get('input[id="postal"]').type('1243WS');

        cy.contains('button', 'Confirm and proceed').click();

        cy.increaseAmountToTwoForAllOptions('Guests');
        cy.increaseAmountToTwoForAllOptions('Guests');
        cy.increaseAmountToTwoForAllOptions('Bedrooms');
        cy.increaseAmountToTwoForAllOptions('Beds');
        cy.increaseAmountToTwoForAllOptions('Bathrooms');

        cy.contains('button', 'Confirm and proceed').click();
        cy.contains('button', 'Confirm and proceed').click();
        
        cy.get(':nth-child(1) > .file-input').attachFile('image1.jpg');
        cy.get(':nth-child(2) > .file-input').attachFile('image2.jpg');
        cy.get(':nth-child(3) > .file-input').attachFile('image3.jpg');
        cy.get(':nth-child(4) > .file-input').attachFile('image4.jpg');
        cy.get(':nth-child(5) > .file-input').attachFile('image5.jpg');
        cy.get(':nth-child(5) > .delete-button').click();
        cy.get(':nth-child(5) > .file-input').attachFile('image5.jpg');

        cy.wait(1000); 
        cy.contains('button', 'Confirm and proceed').click();

        cy.get('#title').type('Amsterdam Dream House').should('be.visible');
        cy.get('#Subtitle').type('Amsterdam').should('be.visible');

        cy.contains('button', 'Confirm and proceed').click();

        cy.get('#description').type('A beautiful house in the center of Amsterdam').should('be.visible');

        cy.contains('button', 'Confirm and proceed').click();

        cy.get('input[name="Rent"]').clear().type('100');
        cy.contains('button', 'Confirm and proceed').click();

        cy.selectDatesFromTomorrowUntilEndOfMonth();
        cy.contains('button', 'Confirm and proceed').click();

        cy.get('.radioInput').click();
        cy.contains('button', 'Confirm').click();
    });
});