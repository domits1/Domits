describe('Authentication spec', () => {

  // guest login/logout
  it('LoginGuest', () => {
    cy.visit('https://acceptance.domits.com/');
    cy.wait(1000); //1 second interval
    cy.get('.personalMenu').click(); // to login page

    cy.wait(1000); //1 second interval

    cy.get('input[name="email"]').type('giannivanlooij@outlook.com'); //email
    cy.wait(500); //0.5 second interval
    cy.get('input[name="password"]').type('123!Pizza'); //password
    cy.wait(500); //0.5 second interval
    cy.get('button[type="submit"]').click(); //login button

    cy.url().should('include', 'https://acceptance.domits.com/login');

    cy.wait(5000); //5 second interval


    cy.get('button').contains('Sign out').should('exist').then(($button) => {
      if ($button.length > 0) {
        cy.wrap($button).click();

        cy.url().should('include', 'https://acceptance.domits.com');

       cy.log('login and out successfull')
      }
    });
  });

});
