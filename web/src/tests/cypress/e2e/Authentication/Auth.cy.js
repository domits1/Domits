// it('LoginGuest', () => {
//   console.log('Auth spec');
//   cy.visit('https://acceptance.domits.com/');
//   cy.wait(1000); //1 second interval
//   cy.get('.personalMenu:visible').click(); // to login page

//   cy.wait(1000); //1 second interval

//   cy.get('.dropdownLoginButton:visible').click(); // Click the login button with class name

//   cy.get('input[name="email"]').type('quintenschaap12@gmail.com'); //email
//   cy.wait(500); //0.5 second interval
//   cy.get('input[name="password"]').type('123!Pizza'); //password
//   cy.wait(500); //0.5 second interval
//   cy.get('button[type="submit"]').click(); //login button

//   cy.wait(5000); //5 second interval

//   cy.get('.personalMenu').eq(0).scrollIntoView().click();
//   cy.get('.dropdownLogoutButton').eq(0).click();
// });

