import '../support/commands'

describe('Chat Functionaliteit Tests', () => {
    beforeEach(() => {
        cy.loginAsGuest();  
        cy.get('.personalMenu').first().click();
        cy.contains('button', 'Profile').click();
        cy.get('.dashboardSections > :nth-child(2)').click();  
    });

    it('stuurt een eenvoudig bericht', () => {
        cy.get('.chat__input').type('Hallo, hoe kan ik u helpen?{enter}');
        // cy.get('.chat__message').should('contain', 'Hallo, hoe kan ik u helpen?');  
    });

    it('stuurt een bericht in een andere taal', () => {
        cy.get('.chat__input').type('¿Cómo puedo ayudarte hoy?{enter}');
        // cy.get('.chat__message').should('contain', '¿Cómo puedo ayudarte hoy?');
    });

    it('test speciale karakters', () => {
        const specialChars = '♕ ♛ ♜ ♝ ♞ ♟ !@#$%^&*()_+';
        cy.get('.chat__input').type(`${specialChars}{enter}`);
        // cy.get('.chat__message').should('contain', specialChars);
    });

    it('test zeer lange tekst', () => {
        const longMessage = 'a'.repeat(1000);  
        cy.get('.chat__input').type(`${longMessage}{enter}`);
        // cy.get('.chat__message').should('contain', longMessage);
    });

    it('test invoer van niet-standaard tekens en scripts', () => {
        const unicodeMessage = '中文, 日本語, 한국어, 🚀🌟';
        cy.get('.chat__input').type(`${unicodeMessage}{enter}`);
        // cy.get('.chat__message').should('contain', unicodeMessage);
    });

    afterEach(() => {
        cy.wait(1000);
        cy.get('.personalMenu').click();
        cy.get('.dropdownLogoutButton').click();  
    });
});
