/// <reference types="Cypress" />
import "../support/commands";

const expectedOptions = [
    'Motorboat',
    'Sailboat',
    'RIB',
    'Catamaran',
    'Yacht',
    'Barge',
    'House boat',
    'Jet ski',
    'Electric boat',
    'Boat without license'
];
const countryToSelect = 'Canada';
const validCity = 'Amsterdam';
const validHarbour = 'Marina';
const text128 = `Luxurious Boat Stay: Enjoy Breathtaking Views, Cozy Cabins, Premium Amenities, and Unforgettable Adventures on Stunning Waters. `;
const text135 = `Luxurious Boat Stay: Enjoy Breathtaking Views, Cozy Cabins, Premium Amenities, and Unforgettable Adventures on Stunning Waters. words`;
const subtext128 = `Experience Tranquility on Our Beautiful Boat: Enjoy Comfortable Lodging, Breathtaking Views, and Unforgettable Adventures Await!`;
const subtext135 = `Experience Tranquility on Our Beautiful Boat: Enjoy Comfortable Lodging, Breathtaking Views, and Unforgettable Adventures Await! words`;

const description505 = `Welcome aboard our luxurious boat accommodation, where comfort meets adventure! Experience breathtaking views of the open water from 
your cozy cabin, equipped with modern amenities to ensure a relaxing stay. Whether you're looking to unwind in tranquility or embark on exciting excursions, 
our boat offers the perfect getaway. Explore nearby scenic spots, indulge in delightful culinary experiences, and create lasting memories with friends and 
family. Book your unforgettable stay with us today words`;

const manufacturerName = 'Sea ray';
const modelName = 'SLX 400';

const GeneralPeriodicInspection = '2024-10-02'; // Example date

const formValues = ['1000 kg', '10 m', '15 L/h', '80 km/h', '2020', '2022'];


describe("Test: Boat 'what type of boat do yo own?'", () => {
    it("should test if all boat options are available and clickable", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('#root > div > main > nav > button.onboarding-button').click(); // It should go back to dashboard
        cy.wait(500);
        cy.get('.wijzer.addAcco').click();

        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page

        // To test if all boat options are available and clickable
        cy.get('#root > div > main > div > section')
            .find('div')
            .should('have.length', 10) // Ensure that all the options are available
            .each(($el) => {
                const optionText = $el.text().trim(); // Get the text of each element and trim any whitespace
                expect(expectedOptions).to.include(optionText); // Assert that the option is included in expectedOptions
            })
            .each(($el) => {
                cy.wrap($el).click() // Simulate a click on the boat option
                    .should('have.class', 'selected'); // Assert that the clicked option has the 'selected' class

            });

        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
    });
});

describe("Test: 'Where can we find your boat?' form", () => {
    it("Form functionality", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);

        //Confirm and proceed test
        cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.disabled');

        // Country of registration* test
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.get('#country > div.css-1nmdiq5-menu').should('be.visible'); //dropdown options should be visible
        cy.contains(countryToSelect).click(); // Click on the country
        cy.get('#country > div').should('contain', countryToSelect); // Assert that the selected country is shown in the dropdown 

        // City* test
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info

        // need to fix invalid information handling to continue
        // cy.get('#city').type('Amsterdam123', { force: true }).should('have.value', 'Amsterdam123'); // Type invalid input and check if it contains typed in info
        // cy.get('#city').type('A'.repeat(101)); // Attempt to enter too many characters

        // Harbour* test
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
    });
});

describe("Test: 'How many people can stay here?' form", () => {
    it("Amount test", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();

        // cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

        // guest
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

        // Cabins
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

describe("Test: 'Let guests know what your space has to offer.'", () => {
    it("Should check wanted boxes", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled


        // Let guests know what your space has to offer.
        //checking and unchecking first and last
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').check(); // checking first option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('be.checked');
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').uncheck(); // unchecking first option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(1) > section > label:nth-child(1) > input[type=checkbox]').should('not.be.checked');

        cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').check();  // checking last option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').should('be.checked');
        cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').uncheck(); // unchecking last option
        cy.wait(500);
        cy.get('#root > div > main > div > div:nth-child(17) > section > label:nth-child(6) > input[type=checkbox]').should('not.be.checked');
        // checking and unchecking everything (doesnt work, cant check any checkboxes in Navigational Equipment)
        // cy.get('input[type=checkbox]').check()// should check all checkboxes
        // cy.get('input[type=checkbox]').uncheck()// should uncheck all checkboxes
    });
});

describe("Test: Add photos of your boat", () => {
    it("should be able to add images", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();

        // add image test
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

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

        cy.get('#root > div > main > section > section > section:nth-child(1) > button').click();
        cy.get('#root > div > main > section > section > section:nth-child(2) > button').click();
        cy.get('#root > div > main > section > section > section:nth-child(3) > button').click();
        cy.get('#root > div > main > section > section > section:nth-child(4) > button').click();
        cy.get('#root > div > main > section > section > section:nth-child(5) > button').click(); // delete all images 

        cy.get('#root > div > main > nav > button.onboarding-button-disabled').should('be.visible'); // check if the disabled button is visible so that it cant go to he next page without adding photos
        // cy.get('#root > div > main > nav > button:nth-child(2)').should('not.be.visible');
    });
});

describe("Test: title and subtitle functionality ", () => {
    it("should be able to put in 128 characters and not more", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images
        cy.wait(500)

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //Title
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled'); // button check
        cy.get('#title').type(text128); // Typing 128 characters
        cy.wait(1000);
        cy.get('#title').clear();
        cy.get('#title').type(text135); // Exceeding the typing limit 

        //Subtitle
        cy.get('#Subtitle').type(subtext128); // Typing 128 characters
        cy.wait(1000);
        cy.get('#Subtitle').clear();
        cy.get('#Subtitle').type(subtext135); // Exceeding the typing limit 

        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled'); // button check

    });
});

describe("Test: Description functionality", () => {
    it("should fill in a description and confirm if it's filled in", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //Title
        cy.get('#title').type(text128); // Typing 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(subtext128); // Typing 128 characters
        cy.wait(1000);

        cy.get('#root > div > main > nav > button:nth-child(2)').click();


        // Description Test
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

        cy.get('#description').type(description505) //type 505 characters'

        cy.get('#description').invoke('val').then((value) => {
            expect(value.length).to.equal(500); // Check if the length is exactly 500 characters
        });

        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');

        cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
        cy.get('#model').type(modelName).should('contain.value', modelName);


        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');

        cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection); // Verify the date

        // Type values into the form fields
        cy.get('#capacity').type('1000 kg').should('have.value', '1000 kg');
        cy.get('#length').type('10 m').should('have.value', '10 m');
        cy.get('#fueltank').type('15 L/h').should('have.value', '15 L/h');
        cy.get('#speed').type('80 km/h').should('have.value', '80 km/h');
        cy.get('#yoc').type('2020').should('have.value', '2020');
        cy.get('#renovated').type('2022').should('have.value', '2022');

        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');

    });
});

describe("Test: Set rate", () => {
    it("should contain the right values", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //Title
        cy.get('#title').type(text128); // Typing 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(subtext128); // Typing 128 characters
        cy.wait(1000);

        cy.get('#root > div > main > nav > button:nth-child(2)').click();


        // Description Test
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

        cy.get('#description').type(description505) //type 505 characters'

        cy.get('#description').invoke('val').then((value) => {
            expect(value.length).to.equal(500); // Check if the length is exactly 500 characters
        });
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
        cy.get('#model').type(modelName).should('contain.value', modelName);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection); // Verify the date
        // Type values into the form fields
        cy.get('#capacity').type('1000 kg').should('have.value', '1000 kg');
        cy.get('#length').type('10 m').should('have.value', '10 m');
        cy.get('#fueltank').type('15 L/h').should('have.value', '15 L/h');
        cy.get('#speed').type('80 km/h').should('have.value', '80 km/h');
        cy.get('#yoc').type('2020').should('have.value', '2020');
        cy.get('#renovated').type('2022').should('have.value', '2022');
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');


        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //set rate test
        cy.scrollTo('top');
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


describe("Test: Calendar functionality", () => {
    it("should check the functionality of the calendar", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //Title
        cy.get('#title').type(text128); // Typing 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(subtext128); // Typing 128 characters
        cy.wait(1000);

        cy.get('#root > div > main > nav > button:nth-child(2)').click();


        // Description Test
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

        cy.get('#description').type(description505) //type 505 characters'

        cy.get('#description').invoke('val').then((value) => {
            expect(value.length).to.equal(500); // Check if the length is exactly 500 characters
        });
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
        cy.get('#model').type(modelName).should('contain.value', modelName);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection); // Verify the date
        // Type values into the form fields
        cy.get('#capacity').type('1000 kg').should('have.value', '1000 kg');
        cy.get('#length').type('10 m').should('have.value', '10 m');
        cy.get('#fueltank').type('15 L/h').should('have.value', '15 L/h');
        cy.get('#speed').type('80 km/h').should('have.value', '80 km/h');
        cy.get('#yoc').type('2020').should('have.value', '2020');
        cy.get('#renovated').type('2022').should('have.value', '2022');
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //set rate test
        cy.scrollTo('top');
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', {force: true} ); // Base rate
        // Service fees
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', {force: true});

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

describe("Test: All", () => {
    it("should check if everything is correct", () => {
        cy.loginAsGuest();
        cy.get('.wijzer.addAcco').click(); // first Add accommodation button 
        cy.wait(500)
        cy.get('img.accommodation-icon').eq(3).click(); // Click the boat option
        cy.get('#root > div > main > nav > button:nth-child(2)').click(); //next page
        cy.get('#root > div > main > div > section').contains(expectedOptions[6]).click(); // it should select house boat
        cy.get('#root > div > main > nav > button:nth-child(2)').click();//next page
        cy.wait(500);
        // Country of registration* 
        cy.get('#root > div > main > h2').scrollIntoView({ duration: 100, offset: { top: 0, left: 0 } }); // scroll so should('be.visible') works
        cy.get('#country > div').should('be.visible').click(); // Click to open the dropdown
        cy.contains(countryToSelect).click(); // Click on the country
        // City* 
        cy.get('#city').should('be.visible').click();
        cy.get('#city').type(validCity, { force: true }).should('have.value', validCity); // Check if it contains typed in info
        // Harbour* 
        cy.get('#harbour').should('be.visible').click();
        cy.get('#harbour').type(validHarbour, { force: true }).should('have.value', validHarbour); // Check if it contains typed in info
        cy.wait(500);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click();
        // 'How many people can stay here?'
        cy.get('#root > div > main > section > div:nth-child(1) > div').contains(0);
        cy.get('#root > div > main > section > div:nth-child(1) > div > button:nth-child(2)').click()
        cy.wait(1000)
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled').click(); // check if confirm and proceed button is enabled
        cy.get('#root > div > main > div > div:nth-child(12) > section > label:nth-child(1)').click(); //checking Cleaning service (add service fee manually) to test add service fee

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        cy.get('#root > div > main > section > section > section:nth-child(1) > input').selectFile('cypress/fixtures/image1.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(2) > input').selectFile('cypress/fixtures/image2.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(3) > input').selectFile('cypress/fixtures/image3.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(4) > input').selectFile('cypress/fixtures/image4.jpg');
        cy.get('#root > div > main > section > section > section:nth-child(5) > input').selectFile('cypress/fixtures/image5.jpg'); // adding 5 images

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //Title
        cy.get('#title').type(text128); // Typing 128 characters
        cy.wait(1000);
        //Subtitle
        cy.get('#Subtitle').type(subtext128); // Typing 128 characters
        cy.wait(1000);

        cy.get('#root > div > main > nav > button:nth-child(2)').click();


        // Description Test
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.disabled');

        cy.get('#description').type(description505) //type 505 characters'

        cy.get('#description').invoke('val').then((value) => {
            expect(value.length).to.equal(500); // Check if the length is exactly 500 characters
        });
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(2) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#manufacturer').type(manufacturerName).should('contain.value', manufacturerName);
        cy.get('#model').type(modelName).should('contain.value', modelName);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(1) > input[type=radio]').click().should('be.checked');
        cy.wait(500);
        cy.get('#root > div > main > div > section.accommodation-general > div:nth-child(8) > label:nth-child(2) > input[type=radio]').click().should('be.checked');
        cy.get('#gpi').type(GeneralPeriodicInspection).should('have.value', GeneralPeriodicInspection); // Verify the date
        // Type values into the form fields
        cy.get('#capacity').type(formValues[0]).should('have.value', formValues[0]);
        cy.get('#length').type(formValues[1]).should('have.value', formValues[1]);
        cy.get('#fueltank').type(formValues[2]).should('have.value', formValues[2]);
        cy.get('#speed').type(formValues[3]).should('have.value', formValues[3]);
        cy.get('#yoc').type(formValues[4]).should('have.value', formValues[4]);
        cy.get('#renovated').type(formValues[5]).should('have.value', formValues[5]);
        cy.get('#root > div > main > nav > button:nth-child(2)').should('be.enabled');
        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        //set rate test
        cy.scrollTo('top');
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(1) > input').clear().type('100', { force: true }); // Base rate
        // Service fees
        cy.get('#root > div > main > section:nth-child(3) > div:nth-child(2) > input').clear().type('10', { force: true });

        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        // Calender
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > header > nav > button.Calendar_next__jcEfE').click();// next month
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();
        cy.get('#root > div > main > section > main > section > div.Calendar_calendar__7tYff > section > ul.dates > li:nth-child(6)').click();


        cy.get('#root > div > main > nav > button:nth-child(2)').click();
        // information

        cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(2) > td:nth-child(2)').should('have.text', text128);
        cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(4) > td:nth-child(2)').should('have.text', '100');
        cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(11) > td:nth-child(2)').should('have.text', countryToSelect);
        cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(12) > td:nth-child(2)').should('have.text', validCity);
        cy.get('#summary > table.accommodation-summary > tbody > tr:nth-child(13) > td:nth-child(2)').should('have.text', validHarbour);


        formValues.forEach((value, index) => {
            cy.get(`#summary > table:nth-child(4) > tbody > tr:nth-child(${index + 4}) > td:nth-child(2)`)
                .should('contain.text', value); // Check if the td contains the value
        });
        //
    });
});



