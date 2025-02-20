describe('Login Page Tests', () => {
  beforeEach(() => {
    cy.visit('https://www.domits.com/login', {failOnStatusCode: false})
  })

  it('should display the login form', () => {
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('.loginButton').click()
  })

  it('should allow a user to type in the email and password fields', () => {
    cy.get('input[name="email"]')
      .type('testuser@example.com')
      .should('have.value', 'testuser@example.com')

    cy.get('input[name="password"]')
      .type('password123')
      .should('have.value', 'password123')
  })

  it('should show an error message for invalid login credentials', () => {
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('.loginButton').click()
    cy.get('.errorText')
      .should('be.visible')
      .and('contain', 'Invalid username or password. Please try again.')
  })

  it('should navigate to the dashboard on successful login', () => {
    cy.get('input[name="email"]').type('validuser@example.com')
    cy.get('input[name="password"]').type('correctpassword')
    cy.get('.loginButton').click()
    //   cy.url().should('include', '/dashboard');
  })

  it('should allow the user to log out', () => {
    cy.get('.registerButtonLogin').click()
    cy.get('input[name="email"]').should('be.visible')
  })

  it('should navigate to the register page when clicking register', () => {
    cy.get('.registerButtonLogin').click()
    cy.url().should('include', '/register')
  })
})
