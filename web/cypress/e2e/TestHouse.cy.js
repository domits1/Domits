import '../support/commands'

const labelsToClick = [
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(2)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(3)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(4)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(6)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(7)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(8)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(9)',
  '#root > div > main > div > div:nth-child(1) > section > label:nth-child(10)',
  '#root > div > main > div > div:nth-child(2) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(3) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(4) > section > label:nth-child(4)',
  '#root > div > main > div > div:nth-child(5) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(5) > section > label:nth-child(2)',
  '#root > div > main > div > div:nth-child(6) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(7) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(8) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(8) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(8) > section > label:nth-child(6)',
  '#root > div > main > div > div:nth-child(9) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(9) > section > label:nth-child(2)',
  '#root > div > main > div > div:nth-child(9) > section > label:nth-child(3)',
  '#root > div > main > div > div:nth-child(10) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(10) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(10) > section > label:nth-child(6)',
  '#root > div > main > div > div:nth-child(11) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(11) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(12) > section > label:nth-child(5)',
  '#root > div > main > div > div:nth-child(13) > section > label:nth-child(1)',
  '#root > div > main > div > div:nth-child(14) > section > label:nth-child(4)',
  '#root > div > main > div > div:nth-child(14) > section > label:nth-child(8)'
];

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

  
        
        cy.get('#root > div > main > div > div:nth-child(2) > section > label:nth-child(1) > input[type=checkbox]').click();

        labelsToClick.forEach(selector => {
          cy.get(selector).click();
      });

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
      
   
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

                cy.get('input[type="file"]').eq(0).selectFile('cypress/fixtures/image1.jpg');
                cy.get('input[type="file"]').eq(1).selectFile('cypress/fixtures/image2.jpg');
                cy.get('input[type="file"]').eq(2).selectFile('cypress/fixtures/image3.jpg');
                cy.get('input[type="file"]').eq(3).selectFile('cypress/fixtures/image4.jpg');
                cy.get('input[type="file"]').eq(4).selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

                cy.wait(15000);
             
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              cy.get('#title').type('a ');
              cy.get('#Subtitle').type('b');
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

              cy.get('#description').type('a');

              cy.get('#root > div > main > nav > button:nth-child(2)').click();
              

              cy.get(':nth-child(3) > :nth-child(1) > .pricing-input').type('10000100001000010000');
              cy.get(':nth-child(2) > .pricing-input').type('10000100001000010000100001000010000')
              cy.get('#root > div > main > nav > button:nth-child(2)').click();

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
    }); 
});


