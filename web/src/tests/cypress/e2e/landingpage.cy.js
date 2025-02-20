describe('Landing Page Tests', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080)
  })

  it('First Section should exist', () => {
    cy.visit('https://acceptance.domits.com/landing/', {
      failOnStatusCode: false,
    })
    cy.get('.landing_MainText__-tmAI > h1').should('exist')
    cy.get('span').contains('Boat').should('exist')
    cy.get('span').contains('House').should('exist')
    cy.get('span').contains('Camper').should('exist')
    cy.get('button').contains('Start hosting').should('exist')
    cy.get('img[alt="House"]').should('exist')
    cy.get('img[alt="personalAdvice"]').should('exist')
  })

  it('Should login', () => {
    cy.visit('https://acceptance.domits.com/landing/', {
      failOnStatusCode: false,
    })
    cy.get('[name="firstName"]').type('Messi')
    cy.get('[name="lastName"]').type('AAA')
    cy.get('[type="email"]').type('nilasov268@scarden.com')
    cy.get('#password').type('Test123400!')
    cy.get('.hostCheckbox > input').click()
    cy.get('.registerButton').click()
    cy.get('.errorText').should('exist')
  })

  it('Hosting on Domits has never been easier.', () => {
    cy.visit('https://acceptance.domits.com/landing/', {
      failOnStatusCode: false,
    })
    cy.get('h1')
      .contains('Hosting with Domits has never been easier.')
      .should('exist')
    cy.get('h3').contains('It only takes 3 steps').should('exist')
  })

  it('Why should i host on Domits?', () => {
    cy.visit('https://acceptance.domits.com/landing/', {
      failOnStatusCode: false,
    })
    cy.get('.landing_SecPicture__2aYQm > img').should('exist')
    cy.get('h1').contains('Why should I host on Domits').should('exist')
    cy.get('p').contains('At Domits,').should('exist')
  })
})
