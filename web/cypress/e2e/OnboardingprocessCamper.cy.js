/// <reference types="Cypress" />
import "../support/commands";

const camperTypes = [
    "Campervan",
    "Sprinter-Type",
    "Cabover Motorhome",
    "Semi-integrated Motorhome",
    "Integrated Motorhome",
    "Roof Tent",
    "Other"
];
const countryToSelect = 'Netherlands';
const validCity = 'Amsterdam';
const validStreet = 'Camperstreet 11';
const validPostal = '9029IO';
const camperTitleNot128 = `Explore the Open Road with a Campervan: Your Home on Wheels, Perfect for Adventure and Creating Unforgettable Memories. and more words`;
const camperSubtitleNot128 = `From coastlines to mountain escapes, your campervan lets you travel freely, bringing comfort, convenience, and adventure. and more words`;
const camperTitle = `Explore the Open Road with a Campervan: Your Home on Wheels, Perfect for Adventure and Creating Unforgettable Memories.`;
const camperSubtitle = `From coastlines to mountain escapes, your campervan lets you travel freely, bringing comfort, convenience, and adventure.`;
const shareSpecial505 = `
Our camper stands out by offering the perfect blend of comfort, versatility, and adventure-ready features. With its spacious interior, cleverly designed to maximize 
every inch, you get a fully equipped kitchen, comfortable sleeping areas, and plenty of storage for your gear. Built for all terrains, it's ideal for both off-grid 
adventures and cozy campgrounds. Its eco-friendly features, like solar power options, keep you connected to nature while minimizing your impact. Travel in style. More Words`;
const shareSpecial = `
Our camper stands out by offering the perfect blend of comfort, versatility, and adventure-ready features. With its spacious interior, cleverly designed to maximize 
every inch, you get a fully equipped kitchen, comfortable sleeping areas, and plenty of storage for your gear. Built for all terrains, it's ideal for both off-grid 
adventures and cozy campgrounds. Its eco-friendly features, like solar power options, keep you connected to nature while minimizing your impact. Travel in style.`;
const radioButtons = [
    '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(1) > input[type=radio]',
    '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(2) > input[type=radio]',
    '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(3) > input[type=radio]',
    '#root > div > main > div > section.accommodation-general > div.radioBtn-box > label:nth-child(4) > input[type=radio]'
];
const camperInputs = {
    licensePlate: 'CAMP456',
    brand: 'Winnebago',
    model: 'Travato',
    requirement: 'B',
    gpi: '2024-08-15',
    length: '7.5',
    height: '3.0',
    transmission: 'Automatic',
    fuel: '15',
    yearConstruction: '2020',
    renovated: '2023'
};

describe("Test: camper 'what type of camper do you own?'", () => {
    it("should test if all camper options are available and clickable", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('#root > div > main > nav > button.onboarding-button').click(); // It should go back to dashboard
        cy.wait(500);
        cy.get('.wijzer.addAcco').click();

        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // To test if all camper options are available and clickable
        cy.get('#root > div > main > div > section')
            .find('div')
            .should('have.length', 7) // Ensure that all the options are available
            .each(($el) => {
                const optionText = $el.text().trim(); // Get the text of each element and trim any whitespace
                expect(camperTypes).to.include(optionText); // Assert that the option is included in expectedOptions
            })
            .each(($el) => {
                cy.wrap($el).click() // Simulate a click on the camper option
                    .should('have.class', 'selected'); // Assert that the clicked option has the 'selected' class

            });

    });
});

describe("Test: camper 'where can we find your camper?'", () => {
    it("should check functionality of  'where can we find your camper?'", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.get('#country > div.css-1nmdiq5-menu').should('be.visible'); //dropdown options should be visible
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#country > div').should('contain', countryToSelect); // Assert that the selected country is shown in the dropdown 
        cy.get('#city').should('be.visible');
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').should('be.visible');
        cy.get('#street').type(validStreet, {force: true}).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').should('be.visible');
        cy.get('#postal').type(validPostal, {force: true}).should('have.value', validPostal);  // check if it contains 9029IO

    });
});

describe("Test: camper 'Let your guest know''", () => {
    it("should check functionality of  'checkboxes'", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, {force: true}).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, {force: true}).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click() // + test
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(1); // x test: should have 1
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(1)').click() // - test 
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // - test: should have 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled'); // check if confirm and proceed button is enabled

        //there is no limit 
        for (let i = 0; i < 25; i++) {
            cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        }
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(26);// Check if it can be set to the limit

        // rooms
        cy.get('#root > div > main > section > div:nth-child(2) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(2) > div').contains(1);
        cy.get('#root > div > main > section > div:nth-child(2) > div > button:nth-child(1)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);

        // Bathrooms
        cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(3) > div').contains(1);
        cy.get('#root > div > main > section > div:nth-child(3) > div > button:nth-child(1)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(3) > div').contains(0);

        // Beds

        cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(4) > div').contains(1);
        cy.get('#root > div > main > section > div:nth-child(4) > div > button:nth-child(1)').click()
        cy.wait(1000)
        cy.get('#root > div > main > section > div:nth-child(4) > div').contains(0);


    });
});
describe("Test: camper 'How many people can stay here?' form'", () => {
    it("should check functionality of  'How many people can stay here'", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, {force: true}).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, {force: true}).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // Let guests know what your space has to offer.
        //checking and unchecking first and last
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').check(); // checking first option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('be.checked');
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').uncheck(); // unchecking first option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');

        cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').check();  // checking last option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('be.checked');
        cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').uncheck(); // unchecking last option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(15) > section > label:nth-child(12) > input[type=checkbox]').should('not.be.checked');

        // checking and unchecking everything
        cy.get('input[type=checkbox]').check().should('be.checked');// should check all checkboxes
        cy.get('input[type=checkbox]').uncheck().should('not.be.checked');// should uncheck all checkboxes



    });
});

describe("Test: camper 'Add and delete image test'", () => {
    it("should be able to add and delete images and not got to the next page when there are no images", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);

        cy.get('#root > div > main > section > section > section:nth-child(1) > img') // Target the image 
            .should('have.attr', 'alt', 'Image-1');
        cy.get('#root > div > main > section > section > section:nth-child(2) > img')
            .should('have.attr', 'alt', 'Image-2');
        cy.get('#root > div > main > section > section > section:nth-child(3) > img')
            .should('have.attr', 'alt', 'Image-3');
        cy.get('#root > div > main > section > section > section:nth-child(4) > img')
            .should('have.attr', 'alt', 'Image-4');
        cy.get('#root > div > main > section > section > section:nth-child(5) > img')
            .should('have.attr', 'alt', 'Image-5'); // checking if all image-containers contain an image

        cy.wait(5000);
        cy.get('#root > div > main > section > section > section:nth-child(1) > button').click();
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > button').click();
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > button').click();
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > button').click();
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > button').click(); // delete all images 

        cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.visible'); // check if the disabled button is visible so that it cant go to he next page without adding photos
        // cy.get('#root > div > main > nav > button:nth-child(2)').should('not.be.visible');



    });
});
describe("Test: camper 'Title and subtitle'", () => {
    it("should check that if you type more than 128 characters it still is 128", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

         //Title
         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
         cy.get('#title').type(camperTitleNot128)
         .should('have.value', camperTitleNot128.substring(0, 128)); // Typing  more than 128 characters
         cy.wait(1000);

         //Subtitle
         cy.get('#Subtitle').type(camperSubtitleNot128)
         .should('have.value', camperSubtitleNot128.substring(0, 128)); // Typing  more than 128 characters

         cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled'); // button check


    });
});

describe("Test: camper 'Description' form'", () => {
    it("should check functionality of  'all inputs of Description '", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        //Title
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
        cy.get('#title').type(camperTitle); // Typing  more than 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(camperSubtitle); // Typing  more than 128 characters
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // Description
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
        cy.get('#description').type(shareSpecial505).should('have.value', shareSpecial505.substring(0, 500)); //type 505 characters and check if it has 500

        // Iterate over each radio button and test selection
        radioButtons.forEach((radio, index) => {
            cy.get(radio).check(); // Check the current radio button
            // Verify that the radio button is checked
            cy.get(radio).should('be.checked');

            // Verify that all other radio buttons are unchecked
            radioButtons.forEach((otherRadio, otherIndex) => {
                if (otherIndex !== index) {
                    cy.get(otherRadio).should('not.be.checked');
                }
            });
        });

        // License plate
        cy.get('#licensePlate').type(camperInputs.licensePlate);
        cy.get('#licensePlate').should('have.value', camperInputs.licensePlate);
        // Brand
        cy.get('#camperbrand').type(camperInputs.brand);
        cy.get('#camperbrand').should('have.value', camperInputs.brand);
        // Model
        cy.get('#model').type(camperInputs.model);
        cy.get('#model').should('have.value', camperInputs.model);
        // Required Driver’s License 
        cy.get('#requirement').type(camperInputs.requirement + '{enter}');
        cy.get('#requirement > div > div.css-hlgwow > div.css-1dimb5e-singleValue').should('have.text', camperInputs.requirement); // Check value after typing
        // General Periodic Inspection
        cy.get('#gpi').type(camperInputs.gpi);
        cy.get('#gpi').should('have.value', camperInputs.gpi);
        // Length
        cy.get('#length').type(camperInputs.length);
        cy.get('#length').should('have.value', camperInputs.length);
        // Height
        cy.get('#height').type(camperInputs.height);
        cy.get('#height').should('have.value', camperInputs.height);
        // Transmission
        cy.get('#transmission').type(camperInputs.transmission);
        cy.get('#transmission').should('have.value', camperInputs.transmission);
        // Fuel Tank Capacity
        cy.get('#fueltank').type(camperInputs.fuel);
        cy.get('#fueltank').should('have.value', camperInputs.fuel);
        // Year of Construction
        cy.get('#yoc').type(camperInputs.yearConstruction);
        cy.get('#yoc').should('have.value', camperInputs.yearConstruction);
        // Year of Renovation
        cy.get('#renovated').type(camperInputs.renovated);
        cy.get('#renovated').should('have.value', camperInputs.renovated);

        //checkboxes
        cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');
        cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(1) > input[type=checkbox]').check().should('be.checked').uncheck().should('not.be.checked');
        cy.wait(500)
        cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(2) > input[type=checkbox]').should('not.be.checked');
        cy.get('#root > div > main > div > section.accommodation-technical > div.check-box-vertical > label:nth-child(2) > input[type=checkbox]').check().should('be.checked').uncheck().should('not.be.checked');


    });
});

describe("Test: camper Set rate", () => {
    it("should contain the right values", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        //Title
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
        cy.get('#title').type(camperTitle); // Typing  more than 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(camperSubtitle); // Typing  more than 128 characters
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // Description
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
        cy.get('#description').type(shareSpecial); //type 505 characters and check if it has 500
        cy.get(radioButtons[1]).check();
        // License plate
        cy.get('#licensePlate').type(camperInputs.licensePlate);
        // Brand
        cy.get('#camperbrand').type(camperInputs.brand);
        // Model
        cy.get('#model').type(camperInputs.model);
        // Required Driver’s License 
        cy.get('#requirement').type(camperInputs.requirement + '{enter}');
        // General Periodic Inspection
        cy.get('#gpi').type(camperInputs.gpi);
        // Length
        cy.get('#length').type(camperInputs.length);
        // Height
        cy.get('#height').type(camperInputs.height);
        // Transmission
        cy.get('#transmission').type(camperInputs.transmission);
        // Fuel Tank Capacity
        cy.get('#fueltank').type(camperInputs.fuel);
        // Year of Construction
        cy.get('#yoc').type(camperInputs.yearConstruction);
        // Year of Renovation
        cy.get('#renovated').type(camperInputs.renovated);

        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', {force: true} ); // Base rate
        cy.wait(1000);
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00'); // 15% of 100 is 15
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€115.00'); // 100 + 15 = 1150
        cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€100.00');

        // Service fees
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', {force: true});
        cy.wait(1000);
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(3) > p').should('have.text', '€15.00'); // 15% of 100 is 15
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(5) > p').should('have.text', '€125.00'); // 100 + 15 = 1150
        cy.get('#root > div > main > section:nth-child(4) > div > p').should('have.text', '€110.00');

    });
});

describe("Test: camper Set rate", () => {
    it("should contain the right values", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        //Title
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
        cy.get('#title').type(camperTitle); // Typing  more than 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(camperSubtitle); // Typing  more than 128 characters
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // Description
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
        cy.get('#description').type(shareSpecial); //type 505 characters and check if it has 500
        cy.get(radioButtons[1]).check();
        // License plate
        cy.get('#licensePlate').type(camperInputs.licensePlate);
        // Brand
        cy.get('#camperbrand').type(camperInputs.brand);
        // Model
        cy.get('#model').type(camperInputs.model);
        // Required Driver’s License 
        cy.get('#requirement').type(camperInputs.requirement + '{enter}');
        // General Periodic Inspection
        cy.get('#gpi').type(camperInputs.gpi);
        // Length
        cy.get('#length').type(camperInputs.length);
        // Height
        cy.get('#height').type(camperInputs.height);
        // Transmission
        cy.get('#transmission').type(camperInputs.transmission);
        // Fuel Tank Capacity
        cy.get('#fueltank').type(camperInputs.fuel);
        // Year of Construction
        cy.get('#yoc').type(camperInputs.yearConstruction);
        // Year of Renovation
        cy.get('#renovated').type(camperInputs.renovated);

        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true }); // Base rate
        // Service fees
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        // Calender
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


    });
});

describe("Test: camper Set rate", () => {
    it("should contain the right values", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.get('img.accommodation-icon').eq(4).click(); // Click the camper option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section > div:nth-child(5)').click(); // should click Integrated Motorhome
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Where can we find your camper 
        cy.get('#country > div').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains Amsterdam in info
        cy.get('#street').type(validStreet, { force: true }).should('have.value', validStreet); // check if it contains Camperstreet 11
        cy.get('#postal').type(validPostal, { force: true }).should('have.value', validPostal);  // check if it contains 9029IO
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // how many people can stay here form
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0); // Defauolt value equals 0
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Let guests know what your space has to offer.
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1) > input[type=checkbox]').check().should('be.checked'); // checking cleaning service option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.wait(500);
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(5000);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        //Title
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
        cy.get('#title').type(camperTitle); // Typing  more than 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(camperSubtitle); // Typing  more than 128 characters
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Description
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');
        cy.get('#description').type(shareSpecial); //type 505 characters and check if it has 500
        cy.get(radioButtons[1]).check();
        // License plate
        cy.get('#licensePlate').type(camperInputs.licensePlate);
        // Brand
        cy.get('#camperbrand').type(camperInputs.brand);
        // Model
        cy.get('#model').type(camperInputs.model);
        // Required Driver’s License 
        cy.get('#requirement').type(camperInputs.requirement + '{enter}');
        // General Periodic Inspection
        cy.get('#gpi').type(camperInputs.gpi);
        // Length
        cy.get('#length').type(camperInputs.length);
        // Height
        cy.get('#height').type(camperInputs.height);
        // Transmission
        cy.get('#transmission').type(camperInputs.transmission);
        // Fuel Tank Capacity
        cy.get('#fueltank').type(camperInputs.fuel);
        // Year of Construction
        cy.get('#yoc').type(camperInputs.yearConstruction);
        // Year of Renovation
        cy.get('#renovated').type(camperInputs.renovated);
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        // Base rate and fees page
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true }); // Base rate
        // Service fees
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        // Calender
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
        cy.get('#root > div > main > nav > button:nth-child(2)').click();



    });
});