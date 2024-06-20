import '../support/commands';

describe('Web Host Monitoring', () => {
  it('should go to monitoring section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(13)').click();
  });
});