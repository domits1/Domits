import '../support/commands'
// import 'cypress-file-upload';
describe('House accomadation test', () => {
    it('should be able to add a listing', () => {
        cy.loginAsHost();
        cy.contains('button', 'Add accommodation').click();
        cy.url().should('include', '/enlist');
        //test apartment
        cy.get('.option').eq(0).click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > div:nth-child(3)').click(); // 4 ,3 ,2
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#country > div').click(); 
        cy.get('#react-select-3-option-0').click();
        cy.get('#city').type('Amsterdam');
        cy.get('#street').type('Bosstraat 19');
        cy.get('#postal').type('1231AD');
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').then(($button) => {
            for (let i = 0; i < 1; i++) {
              cy.wrap($button).click();
            }
          });
          cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(2)').then(($button) => {
            for (let i = 0; i < 5; i++) {
              cy.wrap($button).click();
            }
          });
          cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(2)').then(($button) => {
            for (let i = 0; i < 3; i++) {
              cy.wrap($button).click();
            }
          });
          cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(2)').then(($button) => {
            for (let i = 0; i < 2; i++) {
              cy.wrap($button).click();
            }
          });
          cy.get('#root > div > main > nav > button:nth-child(2)').click();

        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(2)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(3)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(4)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(5)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(6)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(7)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(8)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(9)').click();
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(10)').click();
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(2) > section > label:nth-child(1) > input[type=checkbox]').click();

        cy.get('#root > div > main > div > div:nth-child(2) > section > label:nth-child(5)').click();
        cy.get(' #root > div > main > div > div:nth-child(3) > section > label:nth-child(1)').click();
        cy.get(' #root > div > main > div > div:nth-child(4) > section > label:nth-child(4)').click();
        cy.get(' #root > div > main > div > div:nth-child(5) > section > label:nth-child(1)').click();
        cy.get(' #root > div > main > div > div:nth-child(5) > section > label:nth-child(2)').click();
        cy.get(' #root > div > main > div > div:nth-child(6) > section > label:nth-child(1)').click();
        cy.get(' #root > div > main > div > div:nth-child(7) > section > label:nth-child(1)').click();
        cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(5) >').click();
        cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(6) >').click();
        cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(2) >').click();
        cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(3) >').click();
        cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(5) >').click();
        cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(6) >').click();
        cy.get(' #root > div > main > div > div:nth-child(11) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(11) > section > label:nth-child(5) >').click();
        cy.get(' #root > div > main > div > div:nth-child(12) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(12) > section > label:nth-child(5) >').click();
        cy.get(' #root > div > main > div > div:nth-child(13) > section > label:nth-child(1) >').click();
        cy.get(' #root > div > main > div > div:nth-child(14) > section > label:nth-child(4) >').click();
        cy.get(' #root > div > main > div > div:nth-child(14) > section > label:nth-child(8) >').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.wait(500);
   
        cy.get('input.Check-checkbox').eq(0).clear().type('14:00', { force: true });
        cy.get('input.Check-checkbox').eq(1).clear().type('16:00', { force: true });
        
        cy.get('input.Check-checkbox').eq(2).clear().type('12:00', { force: true });
        cy.get('input.Check-checkbox').eq(3).clear().type('17:00', { force: true });
        
    
        // Verify that the inputs have the correct values
        cy.get('input.Check-checkbox').eq(0).should('have.value', '14:00');
        cy.get('input.Check-checkbox').eq(1).should('have.value', '16:00');
        cy.get('input.Check-checkbox').eq(2).should('have.value', '12:00');
        cy.get('input.Check-checkbox').eq(3).should('have.value', '17:00');


        cy.get('#root > div > main > nav > button:nth-child(2)').click();
                // add image test
              cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
              cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
              cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
              cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
              cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
              cy.wait(500);
              // cy.get('#root > div > main > section > section > section:nth-child(2) > img')
              // .should('have.attr', 'alt', 'Image-2');
              // cy.get('#root > div > main > section > section > section:nth-child(3) > img')
              //   .should('have.attr', 'alt', 'Image-3');
              // cy.get('#root > div > main > section > section > section:nth-child(4) > img')
              //   .should('have.attr', 'alt', 'Image-4');
              // cy.get('#root > div > main > section > section > section:nth-child(5) > img')
              //   .should('have.attr', 'alt', 'Image-5');

                
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              cy.get('#title').type('a ');
              cy.get('#Subtitle').type('b');
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              cy.get('#description').type('a');

              cy.get('#root > div > main > nav > button:nth-child(2)').click();
              

              cy.get(':nth-child(3) > :nth-child(1) > .pricing-input').type('10000');
              // cy.get(':nth-child(2) > .pricing-input').type('100000000000');
              cy.get(':nth-child(2) > .pricing-input').type('1000')
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              // cy.get(':nth-child(2) > input').click();
              // cy.get(':nth-child(10) > input').click();
              // cy.get('.dates').click(); 

              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div').should('have.text', '01/11/2024 - 01/11/2024x'); // one day

              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(15)').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(23)').click()
              cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(2)').should('have.text', '10/11/2024 - 23/12/2024x');// To see if theres a second one and check if u can select differnt months

              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();// month before current month

              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
              cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(3)').should('not.exist');// To see if theres a second one and check if u can select differnt months

              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              cy.get('.verifyCheck > :nth-child(1) > input').click();
              cy.get(':nth-child(2) > input').click();
              // deze test bevat nog paar error voordat ik ze uncomment
              //   cy.get('#root > div > main > section > section > section:nth-child(1) > button').click();
              //   cy.get('#root > div > main > section > section > section:nth-child(2) > button').click();
              //   cy.get('#root > div > main > section > section > section:nth-child(3) > button').click();
              //   cy.get('#root > div > main > section > section > section:nth-child(4) > button').click();
              //   cy.get('#root > div > main > section > section > section:nth-child(5) > button').click(); // delete all images 
        
              //   cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.visible'); 
    }); 
});


