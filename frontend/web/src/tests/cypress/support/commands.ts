// ///<reference types="cypress" />

// declare namespace Cypress {
//     interface Chainable {
//         setDesktopViewport(): void;
//         testinlog(): void;
//         inlogmenu():void;
//         nextinlog():void;
//         uitloggen():void;
//         performInputCheck2(value1, value2):void;
//     }
// }

// Cypress.Commands.add('setDesktopViewport', () => {
//     cy.viewport(1250, 695);
// });

// Cypress.Commands.add('testinlog', () => {
//     cy.setDesktopViewport();
//     cy.visit("https://localhost:3000/login") 
// });

// Cypress.Commands.add('performInputCheck2', (value1, value2) => {
//     cy.get('input[type="email"]').eq(0).type(value1);
//     cy.get('input[type="password"]').type(value2);
//     cy.nextinlog();
//     cy.wait(2000);

//     cy.inlogmenu();
//     cy.uitloggen();
//     cy.visit('https://localhost:3000/login');
  
    
// });

// Cypress.Commands.add('inlogmenu', () => {
//     cy.get('[class="dropdown-container"]').click();
//     //cy.get('#308AE4').click();
// });

// Cypress.Commands.add('uitloggen', () => {
//     cy.get('[class="logoutButton"]').click();
//     //cy.get('#308AE4').click();
// });

// Cypress.Commands.add('nextinlog', () => {
//     cy.get('[class="Button-login"]').click();
//     //cy.get('#308AE4').click();
// });