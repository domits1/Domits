describe('Login Page Tests', () => {
    beforeEach(() => {
        cy.visit('https://www.domits.com/login', { failOnStatusCode: false });
    });
  
    it('should display the login form', () => {
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('.loginButton').click();
    });
  
    it('should allow a user to type in the email and password fields', () => {
      cy.get('input[name="email"]')
        .type('testuser@example.com')
        .should('have.value', 'testuser@example.com');
        
      cy.get('input[name="password"]')
        .type('password123')
        .should('have.value', 'password123');
    });
  
    it('should show an error message for invalid login credentials', () => {
      cy.get('input[name="email"]').type('invalid@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('.loginButton').click();
      cy.get('.errorText')
      .should('be.visible')
      .and('contain', 'Invalid username or password. Please try again.');
  });
  
  it('should navigate to the dashboard on successful login', () => {
    cy.get('input[name="email"]').type('testpersoondomits@gmail.com');
    cy.get('input[name="password"]').type('Gmail.com1');
    cy.get('.loginButton').click();
  
    cy.url().should('include', '/hostdashboard'); 
    cy.contains('button', 'Go to listing').should('be.visible');
  });
  
  
    it('should show register form after clicking register button', () => {
      cy.get('.registerButtonLogin').click();
      cy.url().should('include', '/register');
  
      cy.get('input[name="email"]').should('exist').and(($el) => {
        expect($el[0].offsetParent).to.not.be.null;
      });
    });

    it('should navigate to the register page when clicking register', () => {
      cy.get('.registerButtonLogin').click();
      cy.url().should('include', '/register');
    });
  });
