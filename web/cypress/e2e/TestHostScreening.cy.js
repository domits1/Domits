import '../support/commands';

describe('Web Host Screening', () => {
  beforeEach(() => {
    cy.loginAsHost();
    cy.wait(500); 
  });

  it('should go to screening section', () => {
    cy.get('.dashboardSection > :nth-child(14)').click();
  });
});