import '../support/commands';

describe('Web Host Set Up Payments', () => {
  beforeEach(() => {
    cy.loginAsHost();
    cy.wait(500); 
  });

  it('should go to Set Up Payments section', () => {
    cy.get('.stripe-btn').click();
  });
});