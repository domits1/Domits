describe('Authentication spec', () => {
  it('Login', () => {
    // Visit the login page
    cy.visit('https://develop.domits.com/');
    cy.get('//*[@id="root"]/div/div[1]/header/nav/button[3]');

    // Fill in the login form and submit
    cy.get('input[name="email"]').type('quintenschaap12@gmail.com');
    cy.get('input[name="password"]').type('123!Pizza');
    cy.get('button[type="submit"]').click();

    // Assert the user is redirected to the admin dashboard after successful login
    cy.url().should('include', '/admin');
  });
});
