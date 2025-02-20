// /// <reference types="Cypress" />
// import "../support/commands";

// const camperTypes = [
//     "Campervan",
//     "Sprinter-Type",
//     "Cabover Motorhome",
//     "Semi-integrated Motorhome",
//     "Integrated Motorhome",
//     "Roof Tent",
//     "Other"
// ];
// const countryToSelect = 'Netherlands';
// const validCity = 'Amsterdam';
// const validStreet = 'Camperstreet 11';
// const validPostal = '9029IO';
// const camperTitleMoreThan128 = `Explore the Open Road with a Campervan: Your Home on Wheels, Perfect for Adventure and Creating Unforgettable Memories. and more words`;
// const camperSubtitleMoreThan128 = `From coastlines to mountain escapes, your campervan lets you travel freely, bringing comfort, convenience, and adventure. and more words`;
// const camperTitle = `Explore the Open Road with a Campervan: Your Home on Wheels, Perfect for Adventure and Creating Unforgettable Memories.`;
// const camperSubtitle = `From coastlines to mountain escapes, your campervan lets you travel freely, bringing comfort, convenience, and adventure.`;
// const shareSpecial505 = `
// Our camper stands out by offering the perfect blend of comfort, versatility, and adventure-ready features. With its spacious interior, cleverly designed to maximize
// every inch, you get a fully equipped kitchen, comfortable sleeping areas, and plenty of storage for your gear. Built for all terrains, it's ideal for both off-grid
// adventures and cozy campgrounds. Its eco-friendly features, like solar power options, keep you connected to nature while minimizing your impact. Travel in style. More Words`;
// const shareSpecial = `
// Our camper stands out by offering the perfect blend of comfort, versatility, and adventure-ready features. With its spacious interior, cleverly designed to maximize
// every inch, you get a fully equipped kitchen, comfortable sleeping areas, and plenty of storage for your gear. Built for all terrains, it's ideal for both off-grid
// adventures and cozy campgrounds. Its eco-friendly features, like solar power options, keep you connected to nature while minimizing your impact. Travel in style.`;
// const radioButtons = [
//     '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(1) > input[type=radio]',
//     '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(2) > input[type=radio]',
//     '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(3) > input[type=radio]',
//     '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(4) > input[type=radio]'
// ];
// const camperInputs = {
//     licensePlate: 'CAMP456',
//     brand: 'Winnebago',
//     model: 'Travato',
//     requirement: 'B',
//     gpi: '2024-08-15',
//     length: '7.5',
//     height: '3.0',
//     transmission: 'Automatic',
//     fuel: '15',
//     yearConstruction: '2020',
//     renovated: '2023'
// };
// const checks = [
//     '12:00',
//     '13:00',
//     '08:00',
//     '09:00'
// ]

// describe("Test: camper 'what type of camper do you own?'", () => {
//     it("should test if all camper options are available and clickable", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('#root > div > main > nav > button.onboarding-button').click();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // To test if all camper options are available and clickable
//         cy.get('#root > div > main > div > section')
//             .find('div')
//             .should('have.length', 7)
//             .each(($el) => {
//                 const optionText = $el.text().trim();
//                 expect(camperTypes).to.include(optionText);
//             })
//             .each(($el) => {
//                 cy.wrap($el).click()
//                     .should('have.class', 'selected');
//             });
//     });
// });

// describe("Test: camper 'where can we find your camper?'", () => {
//     it("should check functionality of  'where can we find your camper?'", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Where can we find your camper
//         cy.get('#country > div').click(); // Click to open the dropdown
//         cy.get('#country > div.css-1nmdiq5-menu').should('be.visible'); //dropdown options should be visible
//         cy.contains(countryToSelect).click();
//         cy.get('#country > div').should('contain', countryToSelect);
//         cy.get('#city').should('be.visible');
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').should('be.visible');
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').should('be.visible');
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);

//     });
// });

// describe("Test: how many people can stay here", () => {
//     it("should check functionality of buttons", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: how many people can stay here
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(1)').click()
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');

//         cy.get('#root > div > main > section > div:nth-child(2) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > section > div:nth-child(2) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(1)').click()
//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);

//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(1)').click()
//         cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);

//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(2)').click()
//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(1);
//         cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(1)').click()
//         cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);

//         for (let i = 0; i < 9; i++) {
//             cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         }

//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').should('be.disabled')
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(10);
//     });
// });
// describe("Test: camper 'How many people can stay here?' form'", () => {
//     it("should check functionality of  'How many people can stay here'", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Checkboxes
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');

//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('not.be.checked');

//         // Checking and unchecking everything
//         cy.get('input[type=checkbox]').check().should('be.checked');
//         cy.get('input[type=checkbox]').uncheck().should('not.be.checked');
//     });
// });
// describe("Test: 'House rules'", () => {
//     it("should Fill in the House rules", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Checkboxes
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');

//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').check();
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('be.checked');
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').uncheck();
//         cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('not.be.checked');

//         // Checking and unchecking everything
//         cy.get('input[type=checkbox]').check().should('be.checked');
//         cy.get('input[type=checkbox]').uncheck().should('not.be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: House rules
//         cy.get('#root > div > main > div > div > label > div').click({ multiple: true });
//         cy.get('#root > div > main > div > div > label > input').should('be.checked');
//         cy.get('#root > div > main > div > div > label > div').click({ multiple: true });
//         cy.get('#root > div > main > div > div > label > input').should('not.be.checked');

//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]).should('contain.value', checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]).should('contain.value', checks[1]);

//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]).should('contain.value', checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]).should('contain.value', checks[3]);

//     });
// });

// describe("Test: camper 'Add and delete image test'", () => {
//     it("should be able to add and delete images and not got to the next page when there are no images", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Add & Remove images
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
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
// describe("Test: camper 'Title and subtitle'", () => {
//     it("should check that if you type more than 128 characters it still is 128", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#title').type(camperTitleMoreThan128)
//             .should('have.value', camperTitleMoreThan128.substring(0, 128));

//         cy.get('#Subtitle').type(camperSubtitleMoreThan128)
//             .should('have.value', camperSubtitleMoreThan128.substring(0, 128));
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
//     });
// });

// describe("Test: camper 'Description' form'", () => {
//     it("should check functionality of  'all inputs of Description '", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#title').type(camperTitle);
//         cy.get('#Subtitle').type(camperSubtitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Description
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(shareSpecial505).should('have.value', shareSpecial505.substring(0, 500));
//         // Iterate over each radio button and test selection
//         radioButtons.forEach((radio, index) => {
//             cy.get(radio).check();
//             cy.get(radio).should('be.checked');
//             radioButtons.forEach((otherRadio, otherIndex) => {
//                 if (otherIndex !== index) {
//                     cy.get(otherRadio).should('not.be.checked');
//                 }
//             });
//         });
//         cy.get('#licensePlate').type(camperInputs.licensePlate);
//         cy.get('#licensePlate').should('have.value', camperInputs.licensePlate);
//         cy.get('#camperbrand').type(camperInputs.brand);
//         cy.get('#camperbrand').should('have.value', camperInputs.brand);

//         cy.get('#model').type(camperInputs.model);
//         cy.get('#model').should('have.value', camperInputs.model);
//         cy.get('#requirement').type(camperInputs.requirement + '{enter}');
//         cy.get('#requirement > div > div.css-hlgwow > div.css-1dimb5e-singleValue').should('have.text', camperInputs.requirement);

//         cy.get('#gpi').type(camperInputs.gpi);
//         cy.get('#gpi').should('have.value', camperInputs.gpi);
//         cy.get('#length').type(camperInputs.length);
//         cy.get('#length').should('have.value', camperInputs.length);

//         cy.get('#height').type(camperInputs.height);
//         cy.get('#height').should('have.value', camperInputs.height);
//         cy.get('#transmission').type(camperInputs.transmission);
//         cy.get('#transmission').should('have.value', camperInputs.transmission);

//         cy.get('#fueltank').type(camperInputs.fuel);
//         cy.get('#fueltank').should('have.value', camperInputs.fuel);
//         cy.get('#yoc').type(camperInputs.yearConstruction);
//         cy.get('#yoc').should('have.value', camperInputs.yearConstruction);

//         cy.get('#renovated').type(camperInputs.renovated);
//         cy.get('#renovated').should('have.value', camperInputs.renovated);

//         cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(1) > input[type=checkbox]')
//             .should('not.be.checked');
//         cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(1) > input[type=checkbox]')
//             .check().should('be.checked').uncheck().should('not.be.checked');

//         cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(2) > input[type=checkbox]')
//             .should('not.be.checked');
//         cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(2) > input[type=checkbox]')
//             .check().should('be.checked').uncheck().should('not.be.checked');

//     });
// });

// describe("Test: camper Set rate", () => {
//     it("should contain the right values", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#title').type(camperTitle);
//         cy.get('#Subtitle').type(camperSubtitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(shareSpecial);
//         cy.get(radioButtons[1]).check();
//         cy.get('#licensePlate').type(camperInputs.licensePlate);
//         cy.get('#camperbrand').type(camperInputs.brand);
//         cy.get('#model').type(camperInputs.model);
//         cy.get('#requirement').type(camperInputs.requirement + '{enter}');
//         cy.get('#gpi').type(camperInputs.gpi);
//         cy.get('#length').type(camperInputs.length);
//         cy.get('#height').type(camperInputs.height);
//         cy.get('#transmission').type(camperInputs.transmission);
//         cy.get('#fueltank').type(camperInputs.fuel);
//         cy.get('#yoc').type(camperInputs.yearConstruction);
//         cy.get('#renovated').type(camperInputs.renovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: rent
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true }); // Base rate
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00'); // 15% of 100 is 15
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€115.00'); // 100 + 15 = 1150
//         cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€100.00');

//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00'); // 15% of 100 is 15
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€125.00'); // 100 + 15 = 1150
//         cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€110.00');

//     });
// });

// describe("Test: camper Calender", () => {
//     it("should check if the calender works", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#title').type(camperTitle);
//         cy.get('#Subtitle').type(camperSubtitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(shareSpecial);
//         cy.get(radioButtons[1]).check();
//         cy.get('#licensePlate').type(camperInputs.licensePlate);
//         cy.get('#camperbrand').type(camperInputs.brand);
//         cy.get('#model').type(camperInputs.model);
//         cy.get('#requirement').type(camperInputs.requirement + '{enter}');
//         cy.get('#gpi').type(camperInputs.gpi);
//         cy.get('#length').type(camperInputs.length);
//         cy.get('#height').type(camperInputs.height);
//         cy.get('#transmission').type(camperInputs.transmission);
//         cy.get('#fueltank').type(camperInputs.fuel);
//         cy.get('#yoc').type(camperInputs.yearConstruction);
//         cy.get('#renovated').type(camperInputs.renovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true });
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Calender
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click(); // Next month
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div').should('have.text', '01/11/2024 - 01/11/2024x');

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(15)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(23)').click()
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(2)').should('have.text', '10/11/2024 - 23/12/2024x');

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_prev__wq3JJ').click();

//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(1)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_dateRanges__IGJzK > section > div:nth-child(3)').should('not.exist');
//     });
// });

// describe("Test: camper description", () => {
//     it("should contain the right information", () => {
//         cy.loginAsGuest();
//         cy.get('.wijzer.addAcco').click();
//         cy.get('img.accommodation-icon').eq(4).click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > section > div:nth-child(5)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#country > div').click();
//         cy.contains(countryToSelect).click();
//         cy.get('#city').type(validCity, { force: true }).should('have.value', validCity);
//         cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet);
//         cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
//         cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked');
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(3)').type(checks[0]);
//         cy.get('#root > div > main > div > label:nth-child(3) > input:nth-child(5)').type(checks[1]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(3)').type(checks[2]);
//         cy.get('#root > div > main > div > label:nth-child(4) > input:nth-child(5)').type(checks[3]);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
//         cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg');
//         cy.wait(1000);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#title').type(camperTitle);
//         cy.get('#Subtitle').type(camperSubtitle);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
//         cy.get('#description').type(shareSpecial);
//         cy.get(radioButtons[1]).check();
//         cy.get('#licensePlate').type(camperInputs.licensePlate);
//         cy.get('#camperbrand').type(camperInputs.brand);
//         cy.get('#model').type(camperInputs.model);
//         cy.get('#requirement').type(camperInputs.requirement + '{enter}');
//         cy.get('#gpi').type(camperInputs.gpi);
//         cy.get('#length').type(camperInputs.length);
//         cy.get('#height').type(camperInputs.height);
//         cy.get('#transmission').type(camperInputs.transmission);
//         cy.get('#fueltank').type(camperInputs.fuel);
//         cy.get('#yoc').type(camperInputs.yearConstruction);
//         cy.get('#renovated').type(camperInputs.renovated);
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true }); // Base rate
//         cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
//         cy.get('#root > div > main > nav > button:nth-child(2)').click();

//         // Test: Correct info
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(2) > td:nth-child(2)').should('have.text', camperTitle);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(3) > td:nth-child(2)').should('have.text', shareSpecial);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(4) > td:nth-child(2)').should('have.text', '100');
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(11) > td:nth-child(2)').should('have.text', countryToSelect);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(12) > td:nth-child(2)').should('have.text', validCity);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(13) > td:nth-child(2)').should('have.text', validPostal);
//         cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(14) > td:nth-child(2)').should('have.text', validStreet);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(1) > td:nth-child(2)').should('have.text', camperInputs.licensePlate);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(2) > td:nth-child(2)').should('have.text', camperInputs.brand);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(3) > td:nth-child(2)').should('have.text', camperInputs.model);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(4) > td:nth-child(2)').should('have.text', camperInputs.requirement);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(5) > td:nth-child(2)').should('have.text', '15/08/2024');
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(6) > td:nth-child(2)').should('have.text', `${camperInputs.height} meter`);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(7) > td:nth-child(2)').should('have.text', `${camperInputs.length} meter`);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(8) > td:nth-child(2)').should('have.text', `${camperInputs.fuel} Liter(s) per hour`);
//         cy.get('#summary > table:nth-child(4) > tbody > tr:nth-child(9) > td:nth-child(2)').should('have.text', camperInputs.transmission);
//     });
// });
