import '../support/commands';

describe('Web Host Screening', () => {
  it('should go to screening section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(14)').click();
  });
});