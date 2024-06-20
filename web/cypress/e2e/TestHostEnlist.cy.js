import '../support/commands';
import 'cypress-file-upload';

describe('Web Host dashboard Enlist', () => {
    it('should be able to add a listing', () => {
        cy.loginAsHost(); 
        cy.wait(500); 

        cy.get('.dashboard-head > :nth-child(3)').click();
        cy.get('.boxColumns > .wijzer').click();
        cy.get('#title').type('Amsterdam Dream House').should('be.visible');
        cy.get('#Subtitle').type('Amsterdam').should('be.visible');
        
        cy.get('#description').type('A beautiful house in the center of Amsterdam').should('be.visible');
        cy.get('select.textInput').select('Apartment').should('be.visible');
        cy.get(':nth-child(1) > .file-input').attachFile('image1.jpg');
        cy.get(':nth-child(2) > .file-input').attachFile('image2.jpg');
        cy.get(':nth-child(3) > .file-input').attachFile('image3.jpg');
        cy.get(':nth-child(4) > .file-input').attachFile('image4.jpg');
        cy.get(':nth-child(5) > .file-input').attachFile('image5.jpg');
        //cy.get(':nth-child(4) > .delete-button').click();
        //cy.get(':nth-child(4) > .file-input').attachFile('image5.jpg');

        cy.wait(1000); 
        cy.get('.formContainer > :nth-child(2)').should('not.be.disabled');
    
        cy.get('.formContainer > :nth-child(2)').click();

        cy.get('.container').should('be.visible');
        cy.get('#guests').type('5').should('be.visible');
        cy.get('#bedrooms').type('3').should('be.visible');
        cy.get('#bathrooms').type('3').should('be.visible');
        cy.get('#beds').type('3').should('be.visible');
        cy.get(':nth-child(2) > .check-box > :nth-child(1) > .radioInput').click();
        cy.get(':nth-child(2) > .check-box > :nth-child(2) > .radioInput').click();
        cy.get(':nth-child(2) > .check-box > :nth-child(3) > .radioInput').click();
        cy.get(':nth-child(3) > .check-box > :nth-child(1) > .radioInput').click();
        cy.get(':nth-child(3) > .check-box > :nth-child(3) > .radioInput').click();
        cy.get(':nth-child(8) > .radioInput').click();
        cy.get(':nth-child(9) > .textInput').type('40').should('be.visible');
        cy.get('.formContainer > :nth-child(2)').click();

        cy.get('.container').should('be.visible');
        // Open the dropdown
        cy.get('.css-19bb58m', { timeout: 50000 }).click();
        cy.get('#react-select-3-listbox', { timeout: 10000 }).should('be.visible');
        cy.get('#react-select-3-listbox').contains('Netherlands').click();

        cy.get('#city').type('Amsterdam').should('be.visible');
        cy.get('#street').type('Maanstraat 2').should('be.visible');
        cy.get('#postal').type('1243WS').should('be.visible');
        cy.get('.formContainer > :nth-child(2)').click();

        cy.get('.container').should('be.visible');    //it doesn t change the price
        cy.get('.priceSlider')
          .invoke('val', 68)
          .trigger('change');

        cy.get('.rdrMonthPicker > select').select('August').should('be.visible');
        cy.get(':nth-child(1) > .rdrDays > :nth-child(9) > .rdrDayNumber').click().should('be.visible');
        cy.get(':nth-child(2) > .rdrDays > .rdrDayEndOfMonth > .rdrDayNumber').click().should('be.visible');
        cy.get('[style="background-color: green; width: 7vw; cursor: pointer; opacity: 1;"]').click();

        cy.wait(1000);
        cy.get('.buttonHolder > :nth-child(2)').click();
    });
});