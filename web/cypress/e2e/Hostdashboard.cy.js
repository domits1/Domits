// import '../support/commands'

// describe('LoginGuest dashboard testing', () => {
//     beforeEach(() => {
//         cy.loginAsGuest();
//         cy.get('.personalMenu').first().click();
//         cy.contains('button', 'Profile').click();


//         it('1. Fills basic information about the listing and add photos 2. selects guest type, the price of listing type of listing and xxx amount of m2', () => {
//             cy.get('.container > :nth-child(1) > :nth-child(2) > :nth-child(2)').click();
    
//             cy.get(':nth-child(2) > :nth-child(1) > :nth-child(1) > .radioInput').click();
//             cy.get(':nth-child(2) > :nth-child(1) > :nth-child(2) > .radioInput').click();
//             cy.get(':nth-child(2) > :nth-child(3) > .radioInput').click();
//             cy.get(':nth-child(4) > .radioInput').click();
    
//             cy.get(':nth-child(4) > :nth-child(1) > :nth-child(1) > .radioInput').click();
//             cy.get(':nth-child(4) > :nth-child(2) > label > .radioInput').click();
    
//             cy.get('#title').should('be.visible').click();
//             cy.focused().type('Czeladz, Poland{enter}');
    
//             cy.get('#Subtitle').should('be.visible').click();
//             cy.focused().type('A small town in south of Poland{enter}');
    
//             cy.get('#description').should('be.visible').click();
//             cy.focused().type('Czeladź is a small city in Silesian Voivodeship, Poland, known for its historical significance in coal mining. Today, it blends its industrial heritage with modern developments, offering a mix of cultural and recreational activities.{enter}');
    
//             cy.get(':nth-child(2) > .nextButtons').click();
//             cy.get('input[type="file"]').selectFile('cypress/e2e/PhotosTest/czeladz_home.jpg');
    
//             cy.get(':nth-child(2) > .nextButtons').click();
//             cy.get('input[type="file"]').selectFile('cypress/e2e/PhotosTest/czeladz_inside.jpg');
    
//             cy.get(':nth-child(2) > .nextButtons').click();
//             cy.get('input[type="file"]').selectFile('cypress/e2e/PhotosTest/czeladz_home.jpg');
    
//             cy.get(':nth-child(2) > .nextButtons').click();
//             cy.get('input[type="file"]').selectFile('cypress/e2e/PhotosTest/czeladz_inside.jpg');
    
//             cy.get(':nth-child(2) > .nextButtons').click();
//             cy.get('input[type="file"]').selectFile('cypress/e2e/PhotosTest/czeladz_home.jpg');
    
//             cy.get('.container > :nth-child(1) > :nth-child(3) > :nth-child(2)').click();
       
//             cy.get(':nth-child(1) > :nth-child(2) > .room-features > .configurations > :nth-child(2) > .radioInput').click();
    
//             cy.get('.priceSlider ')
//                 .invoke('attr', 'value', 80);
    
//             cy.get('.priceSlider ')
//                 .invoke('attr', 'value', 80)
//                 .trigger('change');
    
//             cy.get('input.textInput').click();
//             cy.focused().type('85{enter}');
    
//             cy.get('select.textInput').select('Villa');
    
//             cy.get(':nth-child(2) > .configurations > :nth-child(3) > .radioInput').click();
    
//             //currently its not working in /enlist
//             // cy.get('[disabled=""]').click();
//         });

//        cy.get('.headerHostButton').should('be.visible').click({ force: true });

//         cy.get('.dashboardSection > :nth-child(4)').should('be.visible').click();
//         cy.get('.boxColumns > .wijzer').should('be.visible').click();
//     });

//     it('validates correct input for guests, bedrooms, bathrooms and beds', () => {
//         cy.get('#guests').clear().type('214').should('have.value', '214');
//         cy.get('#guests').should('have.value', '214');
    

//         cy.get('#bedrooms').clear().type('abc').should('not.have.value', 'abc');
//         cy.get('#bedrooms').type('1').should('have.value', '1');
    

//         cy.get('#bathrooms').clear().type('1').should('have.value', '1');
//         cy.get('#bathrooms').clear().type('0').should('have.value', '0');
//         cy.get('#bathrooms').clear().type('10000').should('have.value', '10000');
    

//         cy.get('#beds').type('1').should('have.value', '1');
//     });

//     it('manages selection in dropdown for country selection', () => {
//         cy.get('.css-19bb58m').should('be.visible').click();
//         cy.focused().type('Netherlands{enter}');

//         cy.get('.css-19bb58m').should('be.visible').click();
//         cy.focused().clear();

//         cy.get('.css-19bb58m').should('be.visible').click();
//         cy.focused().type('Poland{enter}');

//         cy.get('#city').should('be.visible').click();
//         cy.focused().type('Czeladz{enter}');

//         cy.get('#street').should('be.visible').click();
//         cy.focused().type('Tuwima 16{enter}');

//         cy.get('#postal').should('be.visible').click();
//         cy.focused().type('1423AD{enter}');
//     });

    
// });
