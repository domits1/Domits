describe('Accommodation Type Dropdown Tests', () => {
    beforeEach(() => {
      cy.visit('https://acceptance.domits.com'); 
      cy.wait(5000); 
    });
  
    it('Allows the user to open and select an accommodation type', () => {
      cy.get('.accommodation').contains('Type of Accommodation').click();
      cy.contains('Apartment').click(); 
  
      cy.get('.accommodation').contains('Apartment').should('exist');
    });
  
  });