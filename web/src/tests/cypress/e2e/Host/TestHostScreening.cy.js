import '../../support/commands';

describe.skip('Web Host Screening', () => {
  it('should go to screening section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(14)').click();
  });
});