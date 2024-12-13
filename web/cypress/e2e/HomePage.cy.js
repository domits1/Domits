/**
 * @author Jiaming Yan
 */

describe('homepage spec', () => {
  it('should render the homepage', () => {
    cy.visit('https://acceptance.domits.com');
    cy.get('header').should('exist')
    cy.get('#card-visibility').should('exist')
    cy.get('footer').should('exist')
    cy.get('.personalMenu').should('exist')
  })
})