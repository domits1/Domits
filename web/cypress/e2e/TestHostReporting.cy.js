import '../support/commands';

describe('Web Host Reporting', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to reporting section', () => {
    cy.get('.dashboardSection > :nth-child(6)').click();
    cy.get('h2').should('be.visible');
    cy.get('.box').should('be.visible');
  });
});