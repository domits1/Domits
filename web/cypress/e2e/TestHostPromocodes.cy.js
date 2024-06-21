import '../support/commands';

describe('Web Host Promo codes', () => {
  it('should go to promo codes section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(19)').click();
  });
});