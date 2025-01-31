import '../support/commands';

describe.skip('Web Host Monitoring', () => {
  it('should go to monitoring section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(13)').click();
  });
});