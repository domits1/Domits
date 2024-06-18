import '../support/commands';

describe('Web Host property care', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to property care section and verify that the content is visible', () => {
    cy.get('.dashboardSection > :nth-child(9)').click();

    cy.get('.content').should('be.visible');
  });
});
