import '../support/commands';

describe('Web Host Pricing', () => {
  it('should go to pricing section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(11)').click();
  });
});