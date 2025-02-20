// describe('SearchBar Input Field Tests', () => {
//     beforeEach(() => {
//         cy.visit('https://acceptance.domits.com');
//     });

//     it('Allows user to type in the search input', () => {
//       const testAddress = 'Amsterdam';
//       cy.get('.searchBar')
//         .type(testAddress)
//         .should('have.value', testAddress);
//     });

//     it('Clears the search input when clear button is clicked', () => {
//       const testAddress = 'Amsterdam';
//       cy.get('.searchBar')
//         .type(testAddress)
//         .should('have.value', testAddress);

//       cy.get('.ClearButton').click();
//       cy.get('.searchBar').should('have.value', '');
//     });
//   });
