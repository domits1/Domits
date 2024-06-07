describe('Accommodation Type Dropdown Tests', () => {
    beforeEach(() => {
      cy.visit('https://acceptance.domits.com'); 
      cy.wait(500); 
    });
  
    it('Allows the user to open and select an accommodation type', () => {
      cy.get('.css-hlgwow').contains('Select Accommodation').click();
      cy.contains('Apartment').click(); 
  
      cy.get('.css-hlgwow').contains('Apartment').should('exist');
    });
  
  });