describe('Testing searchbar functionality', () => {
    it('type in input', () => {
        cy.visit("https://main.d2j290dx5bs7ht.amplifyapp.com/")

        cy.get('input').type('oh yes ')

    })
})