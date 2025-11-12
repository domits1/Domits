/**
 * @fileoverview
 * E2E test for Host user flow:
 * Logs in, switches to Host mode, navigates to Settings via sidebar,
 * edits the Name field, and verifies the update.
 *
 * @testDescription
 * This test ensures:
 *  - Host login works correctly
 *  - Sidebar navigation to Settings works
 *  - The name field can be edited and saved
 *
 * @testEnvironment
 * URL: https://acceptance.domits.com/
 * User: testpersoondomits@gmail.com
 */

describe('Host Login and Edit Settings via Sidebar', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('should log in, switch to host, go to settings tab, edit name, and verify update', () => {
    cy.visit('https://acceptance.domits.com/');

    // ----------------------------
    // LOGIN (same as Guest test)
    // ----------------------------
    cy.log('🔐 Logging in as test host user');
    cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('#email').type('testpersoondomits@gmail.com');
    cy.get('#password').type('Gmail.com1');
    cy.get('.loginButton').click();

    // ----------------------------
    // SWITCH TO HOST
    // ----------------------------
    cy.contains('button', 'Switch to Host', { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.get('h2', { timeout: 15000 }).should('contain', 'Dashboard');
    cy.log('✅ Logged in successfully and host dashboard loaded.');

    // ----------------------------
    // NAVIGATE TO SETTINGS TAB (via sidebar)
    // ----------------------------
    cy.log('⚙️ Navigating to Settings tab');
    cy.contains('button.menu-item .label', 'Settings', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('h2', { timeout: 15000 })
      .should('contain.text', 'Settings');
    cy.log('✅ Settings page loaded.');

    // ----------------------------
    // EDIT NAME
    // ----------------------------
    cy.log('✏️ Editing the host name');
    const newName = `Mark_${Math.floor(Math.random() * 1000)}`;

    cy.contains('.InfoBox', 'Name:')
      .within(() => {
        cy.get('img[alt="Edit Name"]').click({ force: true });
        cy.get('input[name="name"]', { timeout: 5000 })
          .clear()
          .type(newName);
        cy.get('img[alt="Save Name"]').click({ force: true });
      });

    // ----------------------------
    // VERIFY NAME UPDATED
    // ----------------------------
    cy.wait(2000);
    cy.contains('.InfoBox', 'Name:')
      .should('contain.text', newName);

    cy.log(`✅ Host name successfully updated to "${newName}"`);
  });
});
