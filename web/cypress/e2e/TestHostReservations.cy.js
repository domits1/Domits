import '../support/commands';

describe('Web Host Reservations', () => {
  beforeEach(() => {
    cy.loginAsHost(); 
    cy.wait(500); 
  });

  it('should go to reservations section', () => {
    cy.get('.dashboardSection > :nth-child(3)').click();
  });
});