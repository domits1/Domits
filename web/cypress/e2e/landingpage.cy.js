// describe('Landing Page Tests', () => {
  
//     beforeEach(() => {
//       cy.visit('http://localhost:3000/landing');
//     });
  
//     it('Should display the landing page and load key sections', () => {
//       cy.get('h1').contains('List your').should('exist');
//       cy.get('button').contains('Start hosting').should('exist');
//       cy.get('img[alt="House"]').should('exist');
//       cy.get('img[alt="personalAdvice"]').should('exist');
//     });
  
//     it('Should display and toggle FAQ sections', () => {
//       cy.get('#root > div > main > div.landing_faq__YpA6X > div.landing_faq__list__06I6I > div:nth-child(1)')
//       cy.get('#root > div > main > div.landing_faq__YpA6X > div.landing_faq__list__06I6I > div:nth-child(1)').first().click();
//       cy.get('#root > div > main > div.landing_faq__YpA6X > div.landing_faq__list__06I6I > div:nth-child(1) > div.landing_landing__faq__answer__ly4ul');
//       cy.get('#root > div > main > div.landing_clientRevieuw__BrQ-0 > div:nth-child(2)').should('exist');
//     });

//     it('Should login', () =>{
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > input:nth-child(2)').type('Messi');
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > input:nth-child(4)').type('AAA');
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > input:nth-child(6)').type('nilasov268@scarden.com');
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > div.passwordContainer').type('Test123400!');
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > label.hostCheckbox').click(); 
//             cy.get('#root > div > main > div.landing_RegisterBlock__Uvynk > div > form > button').click(); 
//     })
//   });
  