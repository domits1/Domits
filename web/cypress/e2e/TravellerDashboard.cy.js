// it('LoginGuest dashboard testing', () => {
//     cy.visit('https://acceptance.domits.com/');
//     cy.wait(1000);
//     cy.get('.personalMenu').click();

//     cy.wait(1000);

//     cy.get('.dropdownLoginButton').click();

//     cy.get('input[name="email"]').type('kacperfl29@gmail.com');
//     cy.wait(500);
//     cy.get('input[name="password"]').type('Kacper2911');a
//     cy.wait(500);
//     cy.get('button[type="submit"]').click();

//     cy.wait(3000);

//     // cy.url().should('eq', 'https://acceptance.domits.com/login');
//     cy.reload();
//     cy.get('.personalMenu').first().click();
//     cy.contains('button', 'Profile').click({ force: true });
//     cy.get('.dashboardSections > :nth-child(2)').click();

//     // cy.get('.chat__input').type('Is er nog iets anders waarmee ik u kan helpen?{enter}');

//     cy.wait(1000);
//     cy.get('.personalMenu').click();
//     cy.get('.dropdownLogoutButton').click();
// });