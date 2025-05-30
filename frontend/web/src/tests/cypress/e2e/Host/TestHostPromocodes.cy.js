import '../../support/commands';

describe.skip('Web Host Promo codes', () => {
  it('should go to promo codes section', () => {
    cy.loginAsGuest(); 
    cy.get('.dashboardSection > :nth-child(19)').click();
  });
});