describe('Homepage', () => {
  it.only('should display the correct hero title', () => {
    cy.visit('')
    cy.get('[data-test="domits-searchtText-test"]')
    .should('contain.text', 'Book holiday homes, boats and campers..')

      
  })
})
