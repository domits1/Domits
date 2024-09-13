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
    cy.get('.personalMenu').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('input[name="email"]').type('kacperfl29@gmail.com');
    cy.get('input[name="password"]').type('Kacper2911');
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard');
    cy.reload();
  });

  Cypress.Commands.add('loginAsHost', () => {
    cy.visit('https://acceptance.domits.com/');
    cy.wait(500);
    cy.get('.personalMenu').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('input[name="email"]').type('kacperfl29@gmail.com');
    cy.get('input[name="password"]').type('Kacper2911');
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard');
    cy.reload();
  });
  
  Cypress.Commands.add('loginAsHostWithStripe', () => {
    cy.visit('https://acceptance.domits.com/');
    cy.wait(500);
    cy.get('.personalMenu').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('input[name="email"]').type('mdinle9@gmail.com');
    cy.get('input[name="password"]').type('Heemskerk123');
    cy.get('button[type="submit"]').click();
    cy.wait(1000);
    cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard');
    cy.reload();
  });

  Cypress.Commands.add('selectDatesFromTomorrowUntilEndOfMonth', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
  
    const tomorrowDay = tomorrow.getDate();
    const endOfMonthDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth() + 1, 0).getDate();
  
    cy.get('.Calendar_calendarContent__-Oc8E .dates')
      .contains(tomorrowDay)
      .click();

    cy.get('.Calendar_calendarContent__-Oc8E .dates')
        .contains(endOfMonthDay)
        .click();
  
    cy.get('.Calendar_dateRanges__IGJzK')
      .should('contain', tomorrowDay)
      .and('contain', endOfMonthDay);
  });

  Cypress.Commands.add('increaseAmountToTwoForAllOptions', (label) => {
    cy.get('.guest-amount-item')
      .contains(label)
      .parent()
      .find('.round-button')
      .eq(1)
      .click()
      .click();
  });