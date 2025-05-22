import '../../support/commands';

describe.skip('Web Host Set Up Payments', () => {
  it('should go to Set Up Payments section', () => {
    cy.loginAsGuest(); 
    cy.get('.stripe-btn').click();
  });
});