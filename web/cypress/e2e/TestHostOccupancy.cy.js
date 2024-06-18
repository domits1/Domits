import '../support/commands';

describe('Web Host Occupancy/ADR', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to occupancy/ADR section', () => {
    cy.get('.dashboardSection > :nth-child(7)').click();
  });
});