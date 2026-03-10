describe('Property Details', () => {
    beforeEach(() => {
        cy.viewport(1920, 1080);
    });

    it('should load the homepage and allow a guest to log in', () => {
        
      
        cy.visit('https://acceptance.domits.com/');

        
        cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();
        
        
        cy.get('.dropdownLoginButton').click();
        
        cy.get('.loginButton').click();
        
        cy.get('.logo > a > img').should('be.visible').click();
        cy.get(':nth-child(3) > .domits-accommodationGroup > :nth-child(2) > .swiper > .swiper-wrapper > .swiper-slide-visible > img').click();

            
            
        cy.get('.property-container').should('be.visible');
        cy.get('.property-container .image-gallery').should('be.visible');
        cy.get('.small-images-container .small-image').first().click();
        cy.get('.property-container .image-gallery .main-image').should('be.visible').click();
        cy.get('.property-container .image-overlay').should('be.visible');
        cy.get('.property-container .image-overlay .overlay-thumbnail').should('be.visible');
        cy.get('.property-container .image-overlay .close-overlay-button').should('be.visible').click();
        
        cy.get('.property-container .price').should('be.visible');
        cy.get('.property-container .details').should('be.visible');
        cy.get('.property-container .description-container').should('be.visible');
        cy.get('.property-container .amenities-container').should('be.visible');
        cy.get('.property-container .rc-con').should('be.visible');
        cy.get('.property-container .rules-container').should('be.visible');
        cy.get('.property-container .rules').should('be.visible');
        
        cy.get('.property-container .rc-nav__btn').first().click();
        
        cy.get('body').then($body => {
        if ($body.find('.description-container .toggle-button').length > 0) {
            cy.get('.description-container .toggle-button').click();
            cy.get('.description').should('not.have.class', 'collapsed');
            cy.get('.description-container .toggle-button').click();
            cy.get('.description').should('have.class', 'collapsed');
        } else {
            cy.log('No toggle button found — skipping Show More test');
        }
        });


    });
    
});
