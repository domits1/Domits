import '../support/commands';

describe('Web Host Revenue', () => {
  it('should go to revenue section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(5)').click();
  });
});