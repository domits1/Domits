import '../support/commands';

describe('Web Host IoT Hub', () => {
  beforeEach(() => {
    cy.loginAsHost();
    cy.wait(500); 
  });

  it('should go to IoT Hub section', () => {
    cy.get('.dashboardSection > :nth-child(10)').click();
  });
});