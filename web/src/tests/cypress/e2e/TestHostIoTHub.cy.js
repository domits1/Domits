import '../support/commands'

describe.skip('Web Host IoT Hub', () => {
  it('should go to IoT Hub section', () => {
    cy.loginAsGuest()
    cy.get('.dashboardSection > :nth-child(10)').click()
  })
})
