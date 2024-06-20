import '../support/commands';

describe('Web Host Settings', () => {
  it('should go to settings section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(17)').click();
  });
});