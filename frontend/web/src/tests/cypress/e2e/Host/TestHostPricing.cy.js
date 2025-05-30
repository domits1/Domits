import '../../support/commands';

describe.skip('Web Host Pricing', () => {
  it('should go to pricing section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(11)').click();
  });
});