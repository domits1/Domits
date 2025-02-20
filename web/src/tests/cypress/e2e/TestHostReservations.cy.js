import '../support/commands'

describe.skip('Web Host Reservations', () => {
  it('should go to reservations section', () => {
    cy.loginAsGuest()
    cy.get('.dashboardSection > :nth-child(3)').click()
  })
})
