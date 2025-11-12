/**
 * @fileoverview
 * E2E test for Host user flow:
 * Logs in, navigates to the Host Dashboard, clicks "Add accommodation",
 * selects random property and room types, fills in address details,
 * and proceeds through onboarding successfully.
 *
 * @testDescription
 * This test ensures:
 *  - Host login works correctly
 *  - The "Add accommodation" button navigates to onboarding
 *  - Property type and room type selections work
 *  - Address form accepts input and submits properly
 *
 * @testEnvironment
 * URL: https://acceptance.domits.com/
 * User: testpersoondomits@gmail.com
 */

describe('Host Login and Add Accommodation', () => {
  /**
   * Ensures consistent desktop viewport for host dashboard layout.
   */
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  /**
   * Main test case:
   * Logs in as a host, adds an accommodation, and completes onboarding steps.
   */
  it('should log in as host, add accommodation, fill address, and submit successfully', () => {
    cy.visit('https://acceptance.domits.com/');

    // ----------------------------
    // LOGIN (Reused Guest Login Structure)
    // ----------------------------
    cy.log('🔐 Logging in as host user');
    cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('#email').type('testpersoondomits@gmail.com');
    cy.get('#password').type('Gmail.com1');
    cy.get('.loginButton').click();

    // ----------------------------
    // VERIFY DASHBOARD LOADED
    // ----------------------------
    cy.get('h3', { timeout: 20000 })
      .should('contain.text', 'Welcome'); // flexible for any host name
    cy.log('✅ Logged in successfully and host dashboard loaded.');

    // ----------------------------
    // ADD ACCOMMODATION
    // ----------------------------
    cy.log('🏠 Navigating to Add Accommodation');
    cy.contains('button', 'Add accommodation', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.log('✅ Clicked on Add Accommodation button');

    // ----------------------------
    // SELECT ACCOMMODATION TYPE
    // ----------------------------
    cy.log('🏡 Selecting accommodation type');
    const accommodationTypes = ['Villa', 'House', 'Apartment', 'Boat', 'Camper', 'Cottage'];
    const randomType = accommodationTypes[Math.floor(Math.random() * accommodationTypes.length)];

    cy.contains(randomType, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', 'Proceed', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // ----------------------------
    // SELECT ROOM TYPE
    // ----------------------------
    cy.log('🛏️ Selecting room type');
    const roomTypes = ['Entire house', 'Private room', 'Shared room'];
    const randomRoom = roomTypes[Math.floor(Math.random() * roomTypes.length)];

    cy.contains(randomRoom, { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.contains('button', 'Proceed', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // ----------------------------
    // FILL ADDRESS FORM
    // ----------------------------
    cy.log('📍 Filling address form');

    cy.get('input[placeholder="Enter your street"]', { timeout: 10000 })
      .should('be.visible')
      .type(`TestStreet ${Math.floor(Math.random() * 1000)}`);

    cy.get('input[placeholder="Enter your house number + house number extension"]')
      .type(`12${String.fromCharCode(97 + Math.floor(Math.random() * 3))}`);

    cy.get('input[placeholder="Enter your postal code"]')
      .type(`${1000 + Math.floor(Math.random() * 9000)}`);

    // Select city (works for input or dropdown)
    cy.get('input[placeholder="Select your city"], select').then(($el) => {
      if ($el.is('select')) {
        cy.wrap($el).select(1);
      } else {
        cy.wrap($el).type('Amsterdam{enter}');
      }
    });

    // Select country (works for input or dropdown)
    cy.get('input[placeholder*="Country"], select[name*="country"]').then(($el) => {
      if ($el.is('select')) {
        cy.wrap($el).select(1);
      } else {
        cy.wrap($el).type('Netherlands{enter}');
      }
    });

    cy.contains('button', 'Proceed', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    // ----------------------------
    // VERIFY SUCCESS
    // ----------------------------
    cy.url({ timeout: 15000 }).should('include', '/hostonboarding');
    cy.log('✅ Accommodation onboarding completed successfully.');
  });
});
