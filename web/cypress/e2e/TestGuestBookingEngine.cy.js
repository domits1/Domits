import '../support/commands';

describe('Web Guest Booking Engine', () => {
  before(() => {
    cy.loginAsGuest(); 
    cy.wait(500); 
  });

  it('should search for accommodations with valid details', () => {
    cy.get('.searchBar').type('Athens'); 
  });

    // Select the type of accommodation
    it('Allows the user to open and select an accommodation type', () => {
      cy.get('.css-hlgwow').click();
      cy.get('.css-hlgwow').contains('Accommodation').click();
    });

});