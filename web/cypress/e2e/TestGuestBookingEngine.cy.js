import '../support/commands';

describe('Web Guest Booking Engine', () => {
  it('should search for accommodations with valid details', () => {
    cy.loginAsGuest(); 
    cy.get('.searchBar').type('Athens'); 

    // Select the type of accommodation
      cy.get('.css-hlgwow').click();
      cy.get('.css-hlgwow').contains('Accommodation').click();
    });
});