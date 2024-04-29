describe('Date Picker Tests', () => {
    beforeEach(() => {
      cy.visit('https://acceptance.domits.com'); 
      cy.wait(5000); 
    });
  
    it('Allows the user to select check-in and check-out dates', () => {
      cy.get('.check-in').click();
  
      cy.get('div.react-datepicker__day--015').first().click(); 
      cy.get('div.react-datepicker__day--020').first().click(); 
  
      cy.get('#checkInPicker').invoke('val').should('contain', '15'); 
      cy.get('#checkInPicker').invoke('val').should('contain', '20');
    });
  
  });