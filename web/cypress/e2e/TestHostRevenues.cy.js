import '../support/commands';

describe.skip('Web Host Revenue', () => {
  it('should go to revenue section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(5)').click();
  });
});