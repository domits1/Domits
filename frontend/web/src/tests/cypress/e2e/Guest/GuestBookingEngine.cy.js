describe('Guest Login Flow', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('should load the homepage and allow a guest to log in', () => {
        
      
        cy.visit('https://acceptance.domits.com/');

        
        cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();

        
        cy.get('.dropdownLoginButton').click();

        
        cy.get('#email').type('testpersoondomits@gmail.com');
        cy.get('#password').type('Gmail.com1');

        cy.get('.loginButton').click();

        cy.get('.hostchatbot-close-button').click();

        cy.get('.logo > a > img').should('be.visible').click();

        cy.get(':nth-child(3) > .domits-accommodationGroup > :nth-child(2) > .swiper > .swiper-wrapper > .swiper-slide-visible > img').click();

        cy.get('.reserve-btn').should('be.visible').click();

        cy.get('#login').click();

        cy.get('.confirm-pay-button').should('be.visible').click();
        
    });
});
