// import '../support/commands'
// // import 'cypress-file-upload';
// describe('House accomadation test', () => {
//     it('should be able to add a listing', () => {
//         cy.loginAsHost();
//         cy.contains('button', 'Add accommodation').click();
//         cy.url().should('include', '/enlist');
//         //test apartment
//         cy.get('.option').eq(0).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(3)').click(); // 4 ,3 ,2
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click(); 
//         cy.get('#react-select-3-option-0').click();
//         cy.get('#city').type('Amsterdam');
//         cy.get('#street').type('Bosstraat 19');
//         cy.get('#postal').type('1231AD');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').then(($button) => {
//             for (let i = 0; i < 1; i++) {
//               cy.wrap($button).click();
//             }
//           });
//         //   cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(2)').then(($button) => {
//         //     for (let i = 0; i < 50; i++) {
//         //       cy.wrap($button).click();
//         //     }
//         //   });
//           cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(2)').then(($button) => {
//             for (let i = 0; i < 3; i++) {
//               cy.wrap($button).click();
//             }
//           });
//           cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(2)').then(($button) => {
//             for (let i = 0; i < 2; i++) {
//               cy.wrap($button).click();
//             }
//           });
//           cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(3)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(4)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(5)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(6)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(7)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(8)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(9)').click();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(10)').click();
//         cy.wait(500);
//         cy.get('#root > div > main > div > div:nth-child(2) > section > label:nth-child(1) > input[type=checkbox]').click();

//         cy.get('#root > div > main > div > div:nth-child(2) > section > label:nth-child(5)').click();
//         cy.get(' #root > div > main > div > div:nth-child(3) > section > label:nth-child(1)').click();
//         cy.get(' #root > div > main > div > div:nth-child(4) > section > label:nth-child(4)').click();
//         cy.get(' #root > div > main > div > div:nth-child(5) > section > label:nth-child(1)').click();
//         cy.get(' #root > div > main > div > div:nth-child(5) > section > label:nth-child(2)').click();
//         cy.get(' #root > div > main > div > div:nth-child(6) > section > label:nth-child(1)').click();
//         cy.get(' #root > div > main > div > div:nth-child(7) > section > label:nth-child(1)').click();
//         cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(5) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(8) > section > label:nth-child(6) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(2) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(9) > section > label:nth-child(3) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(5) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(10) > section > label:nth-child(6) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(11) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(11) > section > label:nth-child(5) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(12) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(12) > section > label:nth-child(5) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(13) > section > label:nth-child(1) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(14) > section > label:nth-child(4) >').click();
//         cy.get(' #root > div > main > div > div:nth-child(14) > section > label:nth-child(8) >').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.wait(500);
   

//                 // add image test
//                 cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//                 cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//                 cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//                 cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//                 cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
//               //   cy.wait(500);
//               //   cy.get('#root > div > main > section > section > section:nth-child(2) > img')
//               //   .should('have.attr', 'alt', 'Image-2');
//               // cy.get('#root > div > main > section > section > section:nth-child(3) > img')
//               //   .should('have.attr', 'alt', 'Image-3');
//               // cy.get('#root > div > main > section > section > section:nth-child(4) > img')
//               //   .should('have.attr', 'alt', 'Image-4');
//               // cy.get('#root > div > main > section > section > section:nth-child(5) > img')
//               //   .should('have.attr', 'alt', 'Image-5');
              
                
//                 cy.get('#root > div > main > section > section > section:nth-child(1) > button').click();
//                 cy.get('#root > div > main > section > section > section:nth-child(2) > button').click();
//                 cy.get('#root > div > main > section > section > section:nth-child(3) > button').click();
//                 cy.get('#root > div > main > section > section > section:nth-child(4) > button').click();
//                 cy.get('#root > div > main > section > section > section:nth-child(5) > button').click(); // delete all images 
        
//                 cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.visible'); 
//     }); 
// });

