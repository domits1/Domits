// describe('Date Picker Tests', () => {
//   beforeEach(() => {
//       cy.visit('https://acceptance.domits.com');
//       cy.wait(500);
//   });

//   it('Allows the user to select check-in and check-out dates', () => {
//       cy.get('.DatePicker').click();

//       // Selecteer de check-in datum
//       cy.contains('.react-modern-calendar-datepicker__day', '15').click();

//       // Selecteer de check-out datum
//       cy.contains('.react-modern-calendar-datepicker__day', '20').click();

//       // Controleer of de juiste data zijn geselecteerd
//       cy.get('#checkInPicker').invoke('val').should('contain', '15');
//       cy.get('#checkOutPicker').invoke('val').should('contain', '20');
//   });
// });
