// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })


Cypress.Commands.add('loginAsGuest', () => {
  cy.visit('https://acceptance.domits.com/');
  cy.wait(500);
  cy.get('.personalMenuDropdown').click();
  cy.contains('button', 'Login').click();
  cy.get('input[name="email"]').type('kacperfl29@gmail.com');
  cy.get('input[name="password"]').type('Kacper2911');
  cy.get('.loginButton').click();
  cy.wait(1000);
  cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard');
  cy.reload();
});

Cypress.Commands.add('loginAsHost', () => {
  cy.visit('http://localhost:3000/');
  cy.wait(500);
  cy.get('.personalMenuDropdown').click();
  cy.contains('button', 'Login').click();
  cy.get('input[name="email"]').type('kacperfl29@gmail.com');
  cy.get('input[name="password"]').type('Kacper2911');
  cy.get('.loginButton').click();
  cy.wait(3000);
  cy.url().should('eq', 'http://localhost:3000/hostdashboard');
  cy.reload();
});