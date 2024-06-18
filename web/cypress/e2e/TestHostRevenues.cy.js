import '../support/commands';

describe('Web Host Revenue', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to revenue section', () => {
    cy.get('.dashboardSection > :nth-child(5)').click();
  });
});