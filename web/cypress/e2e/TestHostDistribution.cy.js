import '../support/commands';

describe('Web Host Distribution', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to distribution section', () => {
    cy.get('.dashboardSection > :nth-child(12)').click();
  });
});