/**
 * @fileoverview
 * E2E test for Guest user flow:
 * Logs in, navigates to the Messages tab, creates a new contact,
 * opens the chat, sends a message, and verifies that it appears in the chat.
 *
 * @testDescription
 * This test ensures:
 *  - Guest login works correctly
 *  - The Messages tab is accessible
 *  - Contact creation works via the "Create test contact" modal
 *  - The new contact appears in the contact list
 *  - A message can be sent to that contact and is rendered in the chat feed
 *
 * @testEnvironment
 * URL: https://acceptance.domits.com/
 * User: testpersoondomits@gmail.com
 */

describe('Guest Login, Add Contact, Open Chat and Send Message', () => {
  /**
   * Sets viewport for consistent test execution across environments.
   * This ensures desktop layout is used (1920x1080).
   */
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  /**
   * Main test case:
   * Logs in as a guest, adds a new contact, opens that chat, and sends a message.
   */
  it('should log in, go to Messages tab, add a new contact, open it, send a message, and verify it', () => {
    cy.visit('https://acceptance.domits.com/');

    // ----------------------------
    // LOGIN
    // ----------------------------
    cy.log('🔐 Logging in as test guest user');
    cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();
    cy.get('.dropdownLoginButton').click();
    cy.get('#email').type('testpersoondomits@gmail.com');
    cy.get('#password').type('Gmail.com1');
    cy.get('.loginButton').click();

    cy.contains('button', 'Switch to Guest', { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.get('h2', { timeout: 15000 }).should('contain', 'Dashboard');
    cy.log(' Logged in successfully and dashboard loaded.');

    // ----------------------------
    // NAVIGATE TO MESSAGES TAB
    // ----------------------------
    cy.log('Navigating to Messages tab');
    cy.contains('button.menu-item .label', 'Messages', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    cy.get('.guest-chat-components', { timeout: 15000 }).should('be.visible');
    cy.log(' Messages tab loaded.');

    // ----------------------------
    // ADD NEW CONTACT
    // ----------------------------
    cy.log('➕ Opening Add Contact modal');
    cy.get('button.contact-list-side-button[title="Create test contact"]', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });

    const contactName = `TestContact_${Date.now()}`;
    cy.get('#new-contact-name', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(contactName);

    cy.get('#save-add-contact', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.log(`Created new contact: ${contactName}`);

    // ----------------------------
    // VERIFY CONTACT APPEARS & OPEN IT
    // ----------------------------
    cy.wait(800); // Allow UI update after contact creation
    cy.log(' Verifying contact appears in list and opening it');

    cy.get('.contact-list-list', { timeout: 15000 })
      .contains(contactName, { timeout: 15000 })
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.log(` Opened chat with contact: ${contactName}`);

    // ----------------------------
    // VERIFY CHAT OPENED
    // ----------------------------
    cy.get('.chat-header', { timeout: 15000 })
      .should('contain', contactName);
    cy.log(' Chat screen loaded successfully.');

    // ----------------------------
    // SEND MESSAGE
    // ----------------------------
    const testMessage = `Hello this is a test message ${Date.now()}`;
    cy.log(' Sending message...');

    cy.get('textarea.message-input-textarea', { timeout: 15000 })
      .should('be.visible')
      .type(testMessage);

    cy.get('button.message-input-send-button', { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

    cy.log(` Sent message: ${testMessage}`);

    // ----------------------------
    // VERIFY MESSAGE SENT
    // ----------------------------
    cy.contains(testMessage, { timeout: 15000 }).should('be.visible');
    cy.log(` Message verified in chat: ${testMessage}`);
  });
});
