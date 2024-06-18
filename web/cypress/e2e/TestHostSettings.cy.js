import '../support/commands';

describe('Web Host Settings', () => {
  beforeEach(() => {
    cy.loginAsHost();
    cy.wait(500); 
  });

  it('should go to settings section', () => {
    cy.get('.dashboardSection > :nth-child(17)').click();
  });
});