import '../support/commands';

describe('Web Host Promo codes', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to promo codes section', () => {
    cy.get('.dashboardSection > :nth-child(19)').click();
  });
});