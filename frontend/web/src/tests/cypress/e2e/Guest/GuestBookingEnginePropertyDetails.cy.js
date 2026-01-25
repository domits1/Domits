describe('Property Details', () => {
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
        
        // cy.get('.hostchatbot-close-button').click();
        
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

        cy.get('.rc-cell.rc-cell--day:not(.is-out)').then($days => {
        const total = $days.length;
        // const startIndex = Math.floor(Math.random() * (total - 3)); // avoid picking near end
        // const endIndex = startIndex + Math.floor(Math.random() * 3) + 1; // 1–3 days later

        cy.wrap($days.eq(startIndex)).click({ force: true });
        cy.wrap($days.eq(endIndex)).click({ force: true });
        cy.get('.rc-footer .rc-cta').click();
        cy.get('.rc-footer .rc-range strong').first().invoke('text').should('match', /\d{1,2}-\d{1,2}-\d{4}/);
        cy.get('.rc-footer .rc-range strong').eq(1).invoke('text').should('match', /\d{1,2}-\d{1,2}-\d{4}/);

        cy.get('.details').should('contain.text', 'Bathrooms')
                        .and('contain.text', 'Bedrooms')
                        .and('contain.text', 'Beds')
                        .and('contain.text', 'Guests');

        });
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