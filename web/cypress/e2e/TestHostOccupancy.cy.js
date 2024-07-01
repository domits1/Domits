import '../support/commands';

describe('Web Host Occupancy/ADR', () => {
  it('should go to occupancy/ADR section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(7)').click();
  });
});