describe('Authentication spec', () => {

  it('Login', () => {
    cy.visit('https://develop.d34jwd0sihmsus.amplifyapp.com/');

    // click login button
    cy.get('#root > div:nth-child(1) > div.App > header > nav > div.login-container > button').click();
    cy.get('#amplify-id-\\:ra\\:').type('quintenschaap12@gmail.com');
    cy.get('#amplify-id-\\:rg\\:').type('123!Pizza');

    cy.get('#radix-\\:r1\\:-content-0 > div > div > form > div > button').click();
    cy.visit('http://localhost:3000/admin')





  })
})

