describe('User Registration', () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.visit('https://www.domits.com');
        cy.wait(500);
        cy.get('.header-personal-menu').click();
        cy.get('.header-dropdown-register-button').click();
    });

    it('should load the registration page successfully', () => {
        cy.url().should('include', 'domits.com/register');
        cy.title().should('not.be.empty');
    });

    it('should successfully register a new user', () => {
        cy.get('[name="firstName"]').type('testUserFirstName');
        cy.get('[name="lastName"]').type('testUserLastName');
        cy.get('[type="email"]').type('testUserEmail@example.com')
        cy.get('.form-control').type('6 7894 7894');
        cy.get('.passwordContainer').type('testUserPassword@1234');
    });

    it('should show validation errors for invalid input', () => {
        cy.get('[name="firstName"]').type('tu');
        cy.get('[name="lastName"]').type('tu');
        cy.get('[type="email"]').type('invalid-email')
        cy.get('.form-control').type('6 4');
        cy.get('.passwordContainer').type('1234');
        cy.get('.registerButton').click();

        cy.contains('Please include an \'@\' in the email address.').should('be.visible');
    });

    it('should prevent duplicate registrations', () => {
        cy.get('[name="firstName"]').type('existingUserFirstname');
        cy.get('[name="lastName"]').type('existingUserLastname');
        cy.get('[type="email"]').type('existinguser@example.com');
        cy.get('.form-control').type('6 7894 7894');
        cy.get('.passwordContainer').type('testExisitingUserPassword@1234');

        // cy.get('.registerButton').click(); //disable to prevent creation of user
        cy.contains('User already exists').should('be.visible');
    });

    it('should handle server-side email validation error', () => {        
        cy.intercept('POST', '/api/register', {
            statusCode: 400,
            body: { error: 'Invalid email address'},
        }).as('registerRequest');

        
        cy.get('[name="firstName"]').type('tu');
        cy.get('[name="lastName"]').type('tu');
        cy.get('[type="email"]').type('invalid-email')
        cy.get('.form-control').type('6 4');
        cy.get('.passwordContainer').type('1234');
        cy.get('.registerButton').click();

        cy.wait('@registerRequest');

        cy.contains('Invalid email address').should('be.visible');
    });
});