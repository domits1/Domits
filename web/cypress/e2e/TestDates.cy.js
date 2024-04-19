describe('Date Picker Tests', () => {
    beforeEach(() => {
      cy.visit('https://acceptance.domits.com'); // Gebruikt de verstrekte URL
      cy.wait(5000); // Geeft de pagina tijd om volledig te laden
    });
  
    it('Allows the user to select check-in and check-out dates', () => {
      cy.get('#checkInPicker').click();
  
      cy.get('div.react-datepicker__day--015').first().click(); // Adjust class name if necessary
      cy.get('div.react-datepicker__day--020').first().click(); // Adjust class name if necessary
  
      cy.get('#checkInPicker').invoke('val').should('contain', '15'); // Adjust format if necessary
      cy.get('#checkInPicker').invoke('val').should('contain', '20'); // Adjust format if necessary
    });
  
  });