// /// <reference types="Cypress" />
// import "../support/commands";

// const expectedOptions = [
//     'Motorboat',
//     'Sailboat',
//     'RIB',
//     'Catamaran',
//     'Yacht',
//     'Barge',
//     'House boat',
//     'Jet ski',
//     'Electric boat',
//     'Boat without license'
// ];
// const countryToSelect = 'Canada';
// const validCity = 'Amsterdam';
// const validHarbour = 'Marina';
// const boatTitle = `Luxurious Boat Stay: Enjoy Breathtaking Views, Cozy Cabins, Premium Amenities, and Unforgettable Adventures on Stunning Waters. `;
// const text135 = `Luxurious Boat Stay: Enjoy Breathtaking Views, Cozy Cabins, Premium Amenities, and Unforgettable Adventures on Stunning Waters. words`;
// const subboatTitle = `Experience Tranquility on Our Beautiful Boat: Enjoy Comfortable Lodging, Breathtaking Views, and Unforgettable Adventures Await!`;
// const subtext135 = `Experience Tranquility on Our Beautiful Boat: Enjoy Comfortable Lodging, Breathtaking Views, and Unforgettable Adventures Await! words`;
// const description505 = `Welcome aboard our luxurious boat accommodation, where comfort meets adventure! Experience breathtaking views of the open water from 
// your cozy cabin, equipped with modern amenities to ensure a relaxing stay. Whether you're looking to unwind in tranquility or embark on exciting excursions, 
// our boat offers the perfect getaway. Explore nearby scenic spots, indulge in delightful culinary experiences, and create lasting memories with friends and 
// family. Book your unforgettable stay with us today words`;
// const description = `Welcome aboard our luxurious boat accommodation, where comfort meets adventure! Experience breathtaking views of the open water from 
// your cozy cabin, equipped with modern amenities to ensure a relaxing stay. Whether you're looking to unwind in tranquility or embark on exciting excursions, 
// our boat offers the perfect getaway. Explore nearby scenic spots, indulge in delightful culinary experiences and create lasting memories with friends and 
// family. Book your unforgettable stay with us today`;

// const manufacturerName = 'Sea ray';
// const modelName = 'SLX 400';
// const GeneralPeriodicInspection = '2024-10-02'

// const capacityValue = '1000';
// const lengthValue = '10';
// const fuelTankValue = '15';
// const speedValue = '80';
// const yearOfConstruction = '2020';
// const yearRenovated = '2022';

// describe("Test: Boat 'what type of boat do yo own?'", () => {
//     it("should test if all boat options are available and clickable", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('#root > div > main > nav > button.onboarding-button').click();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: boat options
//         cy.get('#root > div > main > div > section')
//             .find('div')
//             .should('have.length', 10)
//             .each(($el) => {
//                 const optionText = $el.text().trim();
//                 expect(expectedOptions).to.include(optionText);
//             })
//             .each(($el) => {
//                 cy.wrap($el).click()
//                     .should('have.class', 'selected');
//             });
//     });
// });

// describe("Test: 'Where can we find your boat?' form", () => {
//     it("Form functionality", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.disabled');

//         // Test: where can we find your boats?
//         cy.get('#country > div').click(); // Click to open the dropdown
//         cy.get('#country > div.css-1nmdiq5-menu').should('be.visible'); //dropdown options should be visible
//         cy.contains(countryToSelect).click();
//         cy.get('#country > div').should('contain', countryToSelect);
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
//     });
// });

// describe("Test: 'How many people can stay here?' form", () => {
//     it("Amount test", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();

//         // Test: How many people can stay here?
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(1)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');

//         cy.get('#root > div > main > section > div:nth-child(2) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(2) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(1)').click();
//         cy.get('#root > div > main > section > div:nth-child(2) > div').contains(0);

//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(1)').click();
//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);

//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(1)').click()
//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);

//         // simulating 50 clicks with 2 for loops to check limit 
//         for (let i = 1; i <= 4; i++) {
//             cy.get(`#root > div > main > section > div:nth-child(${i}) > div > button:nth-child(2)`).then($button => {
//                 for (let j = 0; j < 50; j++) {
//                     cy.wrap($button, { log: false }).click({ log: false });
//                 }
//             });
//         }
//     });
// });

// describe("Test: 'Let guests know what your space has to offer.'", () => {
//     it("Should check wanted boxes", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();

//         // Test: all checkboxes 
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');

//         cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').should('not.be.checked');

//         // // checking and unchecking everything (doesnt work, cant check any checkboxes in Navigational Equipment)
//         // cy.get('input[type=checkbox]').check();
//         // cy.get('input[type=checkbox]').uncheck();
//     });
// });

// describe("Test: Add photos of your boat", () => {
//     it("should be able to add images", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: add photos and remove
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');

//         cy.get('#root > div > main > section > section > section:nth-child(1) > img')
//             .should('have.attr', 'alt', 'Image-1');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > img')
//             .should('have.attr', 'alt', 'Image-2');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > img')
//             .should('have.attr', 'alt', 'Image-3');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > img')
//             .should('have.attr', 'alt', 'Image-4');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > img')
//             .should('have.attr', 'alt', 'Image-5');

//         cy.get('#root > div > main > section > section > section:nth-child(1) > button').click();
//         cy.get('#root > div > main > section > section > section:nth-child(2) > button').click();
//         cy.get('#root > div > main > section > section > section:nth-child(3) > button').click();
//         cy.get('#root > div > main > section > section > section:nth-child(4) > button').click();
//         cy.get('#root > div > main > section > section > section:nth-child(5) > button').click();

//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//     });
// });

// describe("Test: title and subtitle functionality ", () => {
//     it("should be able to put in 128 characters and not more", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(500);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Title and Subtitle
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#title').type(boatTitle);
//         cy.get('#title').clear();
//         cy.get('#title').type(text135);
//         cy.get('#Subtitle').type(subboatTitle);
//         cy.get('#Subtitle').clear();
//         cy.get('#Subtitle').type(subtext135);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
//     });
// });

// describe("Test: Description functionality", () => {
//     it("should fill in a description and confirm if it's filled in", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(500);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#title').type(boatTitle);
//         cy.get('#Subtitle').type(subboatTitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

//         // Test: Description form
//         cy.get('#description').type(description505)
//         cy.get('#description').invoke('val').then((value) => {
//             expect(value.length).to.equal(500);
//         });
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
//         cy.get('#model').type(modelName).should('contain.value', modelName);
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection);

//         cy.get('#capacity').type(capacityValue).should('have.value', capacityValue);
//         cy.get('#length').type(lengthValue).should('have.value', lengthValue);
//         cy.get('#fueltank').type(fuelTankValue).should('have.value', fuelTankValue);
//         cy.get('#speed').type(speedValue).should('have.value', speedValue);
//         cy.get('#yoc').type(yearOfConstruction).should('have.value', yearOfConstruction);
//         cy.get('#renovated').type(yearRenovated).should('have.value', yearRenovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
//     });
// });

// describe("Test: Set rate", () => {
//     it("should contain the right values", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(500);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#title').type(boatTitle);
//         cy.get('#Subtitle').type(subboatTitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(description);
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
//         cy.get('#model').type(modelName).should('contain.value', modelName);
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection);
//         cy.get('#capacity').type(capacityValue).should('have.value', capacityValue);
//         cy.get('#length').type(lengthValue).should('have.value', lengthValue);
//         cy.get('#fueltank').type(fuelTankValue).should('have.value', fuelTankValue);
//         cy.get('#speed').type(speedValue).should('have.value', speedValue);
//         cy.get('#yoc').type(yearOfConstruction).should('have.value', yearOfConstruction);
//         cy.get('#renovated').type(yearRenovated).should('have.value', yearRenovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.scrollTo('top');

//         // Test: rent
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00'); // 15% of 100 is 15
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€115.00'); // 100 + 15 = 150
//         cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€100.00');
       
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00');
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€125.00'); // 115 + 10 = 125
//         cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€110.00');

//     });
// });


// describe("Test: Calendar functionality", () => {
//     it("should check the functionality of the calendar", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(500);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#title').type(boatTitle);
//         cy.get('#Subtitle').type(subboatTitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(description)
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
//         cy.get('#model').type(modelName).should('contain.value', modelName);
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection);
//         cy.get('#capacity').type(capacityValue).should('have.value', capacityValue);
//         cy.get('#length').type(lengthValue).should('have.value', lengthValue);
//         cy.get('#fueltank').type(fuelTankValue).should('have.value', fuelTankValue);
//         cy.get('#speed').type(speedValue).should('have.value', speedValue);
//         cy.get('#yoc').type(yearOfConstruction).should('have.value', yearOfConstruction);
//         cy.get('#renovated').type(yearRenovated).should('have.value', yearRenovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.scrollTo('top');
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Calender functionality
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div').should('have.text', '01/11/2024 - 01/11/2024x'); // one day

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(15)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(23)').click()
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(2)').should('have.text', '10/11/2024 - 23/12/2024x');// To see if theres a second one and check if u can select differnt months

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();// month before current month

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(3)').should('not.exist');// To see if theres a second one and check if u can select differnt months

//     });
// });

// describe("Test: All", () => {
//     it("should check if everything is correct", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(3).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').should('be.visible').click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#harbour').should('be.visible').click();
//         cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(500);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#title').type(boatTitle);
//         cy.get('#Subtitle').type(subboatTitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(description)
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
//         cy.get('#model').type(modelName).should('contain.value', modelName);
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
//         cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
//         cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection);
//         cy.get('#capacity').type(capacityValue).should('have.value', capacityValue);
//         cy.get('#length').type(lengthValue).should('have.value', lengthValue);
//         cy.get('#fueltank').type(fuelTankValue).should('have.value', fuelTankValue);
//         cy.get('#speed').type(speedValue).should('have.value', speedValue);
//         cy.get('#yoc').type(yearOfConstruction).should('have.value', yearOfConstruction);
//         cy.get('#renovated').type(yearRenovated).should('have.value', yearRenovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.scrollTo('top');
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

        
//         // Test: Please check if everything is correct
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(2) > td:nth-child(2)').should('have.text', boatTitle);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(3) > td:nth-child(2)').should('have.text', description);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(4) > td:nth-child(2)').should('have.text', '100');
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(11) > td:nth-child(2)').should('have.text', countryToSelect);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(12) > td:nth-child(2)').should('have.text', validCity);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(13) > td:nth-child(2)').should('have.text', validHarbour);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(1) > td:nth-child(2)').should('have.text', manufacturerName)
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(2)').should('have.text', modelName);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(3) > td:nth-child(2)').should('have.text', '02/10/2024');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(4) > td:nth-child(2)').should('have.text', capacityValue + 'People');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(5) > td:nth-child(2)').should('have.text', lengthValue + ' meter');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(6) > td:nth-child(2)').should('have.text', fuelTankValue + ' Liter(s) per hour');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(7) > td:nth-child(2)').should('have.text', speedValue + ' Kilometers per hour');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(8) > td:nth-child(2)').should('have.text', '01/01/2020');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(9) > td:nth-child(2)').should('have.text', '01/01/2022');
//     });
// });



