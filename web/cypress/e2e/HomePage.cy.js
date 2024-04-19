/**
 * @author Jiaming Yan
 */

describe('homepage spec', () => {
  // Be sure to run npm start before you run the test with localhost, set the port manually if needed
  it('should render the homepage', () => {
    //   cy.visit('https://www.domits.com') Use this if you want to test on the live environment
    cy.visit('http://localhost:3000')
    cy.get('header').should('exist')
    cy.get('.assortment').should('exist')
    cy.get('footer').should('exist')
    cy.get('.personalMenu').should('exist')
  })
})