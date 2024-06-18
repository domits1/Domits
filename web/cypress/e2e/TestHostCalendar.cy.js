import '../support/commands';

describe('Web Host Calendar', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to calendar section', () => {
    cy.get('.dashboardSection > :nth-child(2)').click();
  });
});