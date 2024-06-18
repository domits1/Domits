import '../support/commands';

describe('Web Host Reviews', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to review section', () => {
    cy.get('.dashboardSection > :nth-child(8)').click();
  });

  it('should check if the content is visible', () => {
    cy.get('h2').should('be.visible');
    cy.get('.contentContainer').should('be.visible');
  });
});