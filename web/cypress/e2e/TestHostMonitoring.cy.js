import '../support/commands';

describe('Web Host Monitoring', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to monitoring section', () => {
    cy.get('.dashboardSection > :nth-child(13)').click();
  });
});