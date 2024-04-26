describe('LoginGuest dashboard testing', () => {
    beforeEach(() => {
        cy.visit('https://acceptance.domits.com/');
        cy.get('.personalMenu').should('be.visible').click();
        cy.get('.dropdownLoginButton').should('be.visible').click();
        cy.get('input[name="email"]').type('kacperfl29@gmail.com');
        cy.get('input[name="password"]').type('Kacper2911');
        cy.get('button[type="submit"]').click();

        cy.wait(1500);
        cy.reload();

        cy.get('.headerHostButton').should('be.visible').click();
        cy.get('.dashboardSection > :nth-child(4)').should('be.visible').click();
        cy.get('.boxColumns > .wijzer').should('be.visible').click();
    });

    it('validates correct input for guests', () => {
        cy.get('#guests').clear().type('214').should('have.value', '214');
        cy.get('#guests').should('have.value', '214');
    });

    it('validates input rejection for invalid bedroom count', () => {
        cy.get('#bedrooms').clear().type('abc').should('not.have.value', 'abc');
        cy.get('#bedrooms').type('1').should('have.value', '1');
    });

    it('ensures bathroom input functionality', () => {
        cy.get('#bathrooms').clear().type('1').should('have.value', '1');
        cy.get('#bathrooms').clear().type('0').should('have.value', '0');
        cy.get('#bathrooms').clear().type('10000').should('have.value', '10000');
    });

    it('checks beds input for invalid inputs', () => {
        cy.get('#beds').type('1').should('have.value', '1');
    });

    it('manages selection in dropdown for country selection', () => {
        cy.get('.css-19bb58m').should('be.visible').click();
        cy.focused().type('Netherlands{enter}');
    
        cy.get('.css-19bb58m').should('be.visible').click();
        cy.focused().clear();
    
        cy.get('.css-19bb58m').should('be.visible').click();
        cy.focused().type('Poland{enter}');
    });
});
