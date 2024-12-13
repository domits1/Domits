describe('Guest Reviews', () => {
    beforeEach(() => {
      cy.viewport(1920, 1080);
      cy.loginAsGuest(); 
  
      cy.fixture('reviews.json').then((reviewsData) => {
        cy.intercept('POST', 'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReviews', {
          body: reviewsData.reviews
        }).as('fetchReviews');
  
      cy.intercept('POST', 'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/FetchReceivedReviews', {
        body: reviewsData.receivedReviews
      }).as('fetchReceivedReviews');
    });
  });
  
    it('Should display reviews correctly', () => {
      cy.get('.header-links > .headerHostButton').click();
      cy.wait(500); 

      cy.get('.dashboardSections > :nth-child(5)').click(); 
  
      cy.wait('@fetchReviews');
      cy.wait('@fetchReceivedReviews');
  
      cy.contains('My reviews(2)').should('exist');
      cy.contains('Great service').should('exist');
      cy.contains('Good experience').should('exist');
  
      cy.contains('Received reviews(1)').should('exist');
      cy.contains('Awesome customer').should('exist');
    });
  
    it('Allows deleting a review', () => {
      cy.get('.header-links > .headerHostButton').click();
      cy.wait(500); 
  
      cy.get('.dashboardSections > :nth-child(5)').click(); 
  
      cy.wait('@fetchReviews');
 
      cy.intercept('DELETE', 'https://arj6ixha2m.execute-api.eu-north-1.amazonaws.com/default/DeleteReview', {
        statusCode: 200
      }).as('deleteReview');
  
      cy.get('button')
      cy.get(':nth-child(2) > .HostReviews_reviewDelete__5f2tq > .cross').click();

      cy.wait('@deleteReview');
  
      cy.contains('Great service').should('not.exist');
    });
  });
  