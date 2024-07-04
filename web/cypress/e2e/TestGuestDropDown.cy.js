// describe('Guest Dropdown Tests', () => {
//     beforeEach(() => {
//       cy.visit('https://acceptance.domits.com');
//       cy.wait(5000); 
//     });
  
//     it('Allows the user to select number of guests', () => {
//       cy.get('.button-section').click(); 
//       cy.get('.guest-dropdown').contains('Adults').parents('.guestCounter').find('button').contains('+').click();
//       cy.get('.guest-dropdown').contains('Children').parents('.guestCounter').find('button').contains('+').click();
//       cy.get('.guest-dropdown').contains('Infants').parents('.guestCounter').find('button').contains('+').click();
//       cy.get('.guest-dropdown').contains('Pets').parents('.guestCounter').find('button').contains('+').click();
     
//       cy.get('.guestP').invoke('text').then((text) => {
//         const guestNumbers = text.match(/\d+/g); // Vind alle nummers in de string
//         const totalGuests = guestNumbers.reduce((total, num) => total + parseInt(num), 0);
//         expect(totalGuests).to.eq(4); 
//       });
//     });
//   });