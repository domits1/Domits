import '../support/commands';

describe('Web Host Calendar', () => {
  it('should go to calendar section', () => {
    cy.loginAsHost(); 
    cy.get('.dashboardSection > :nth-child(2)').click();
  });
});