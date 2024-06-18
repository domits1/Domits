import '../support/commands';

describe('Web Host Pricing', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to pricing section', () => {
    cy.get('.dashboardSection > :nth-child(11)').click();
  });
});