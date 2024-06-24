import '../support/commands';

describe('Web Host Distribution', () => {
  it('should go to distribution section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(12)').click();
  });
});