// import '../support/commands';
//
// beforeEach(() => {
//     cy.viewport(1920, 1080);
//     cy.loginAsHost();
//     cy.wait(3000);
//     cy.get('.chatbot-toggle-button').click();
//     cy.wait(1000);
//     cy.get('.dashboardSection > :nth-child(8)').click();
//     cy.wait(2000);
//     cy.url().should('eq', 'http://localhost:3000/hostdashboard/distribution');
//     cy.wait(1500);
// });
//
// describe('Visit Web Host Distribution', () => {
//         it('should go to distribution section', () => {
//             cy.get('.dashboardSection > :nth-child(8)').click();
//             cy.wait(500);
//             cy.url().should('eq', 'http://localhost:3000/hostdashboard/distribution');
//         });
//     }
// );
//
// describe('Host Distribution - Add Channel Button', () => {
//     it('should add a new channel', () => {
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//     });
//
//     it('should close and cancel adding a new channel', () => {
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Cancel').click();
//         cy.wait(1000);
//         cy.get('.addChannelButtonMenuContent').should('not.be.visible');
//     });
//
// });
//
// describe('Host Distribution - Three dots Button', () => {
//     it('should be able to delete an channel', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//         cy.get('.host-dist-box-container').should('be.visible');
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             initialRowCount = $rows.length;
//             if (initialRowCount === 0) {
//                 cy.log('No channels found, stopping the test');
//                 return;
//             }
//         });
//         cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//         cy.get('.threeDotsMenuContent').should('be.visible');
//         cy.get('.delete').click();
//         cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             newRowCount = $rows.length;
//             if (newRowCount < initialRowCount) {
//                 cy.log('Channel was deleted successfully');
//             } else {
//                 cy.log('No channel was deleted');
//             }
//         });
//     });
//
//     it('should be able to save changes', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('PUT', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/EditSingleChannel')
//             .as('editChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//
//         cy.get('.host-dist-box-container').should('be.visible');
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             initialRowCount = $rows.length;
//             if (initialRowCount === 0) {
//                 cy.log('No channels found, stopping the test');
//                 return;
//             }
//             cy.get('.host-dist-box-container').should('be.visible');
//             cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//                 .should('not.be.checked', false);
//             cy.get(':nth-child(1) > .host-dist-box-row > :nth-child(3) > .toggle-status-switch > .slider').click();
//             cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//                 .should('be.checked', true);
//             cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//             cy.get('.threeDotsMenuContent').should('be.visible');
//             cy.get('.threeDotsMenuContent > :nth-child(2)').click();
//             cy.wait('@editChannel').its('response.statusCode').should('eq', 200);
//
//             cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//             cy.get('.threeDotsMenuContent').should('be.visible');
//             cy.get('.delete').click();
//             cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//             cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//                 newRowCount = $rows.length;
//                 if (newRowCount < initialRowCount) {
//                     cy.log('Channel was deleted successfully');
//                 } else {
//                     cy.log('No channel was deleted');
//                 }
//             });
//         });
//     });
// });
// describe('Host Distribution - Manage Channel Button', () => {
//     it('should add an item to the list and close the menu', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').should('be.visible').click();
//         cy.get('.channelManageButtonContainer > :nth-child(1)').should('be.visible').click();
//         cy.get('.addAccommodationsViewContainer').should('be.visible');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.addAccommodationsViewContainer.visible > div > table > tbody')
//             .find('tr')
//             .then(($rows1) => {
//                 const initialRowCount = $rows1.length;
//                 if (initialRowCount === 0) {
//                     cy.log('No accommodations found, stopping the test');
//                     return;
//                 }
//                 cy.get(':nth-child(1) > :nth-child(5) > button').click();
//                 cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.addAccommodationsViewContainer.visible > div > table > tbody')
//                     .then(($rows2) => {
//                         const newRowCount = $rows2.length;
//                         if (newRowCount <= initialRowCount) {
//                             cy.log('Accommodation was removed successfully');
//                         } else {
//                             cy.log('No accommodation was removed from the list');
//                         }
//                     });
//             });
//         cy.get('.closeAddViewButton').click();
//         cy.get('.addAccommodationsViewContainer').should('not.be.visible');
//         cy.get('.channelManageButtonContainer > :nth-child(3)').click();
//         cy.get('.removeAccommodationsViewContainer').should('be.visible');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.removeAccommodationsViewContainer.visible > div > table > tbody')
//             .find('tr')
//             .should('have.length.greaterThan', 0);
//         cy.get('.closeRemoveViewButton').click();
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//         cy.get('.threeDotsMenuContent').should('be.visible');
//         cy.get('.delete').click();
//         cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             newRowCount = $rows.length;
//             if (newRowCount < initialRowCount) {
//                 cy.log('Channel was deleted successfully');
//             } else {
//                 cy.log('No channel was deleted');
//             }
//         });
//     });
//
//     it('should remove an item from the list and close the menu', () => {
//         let initialRowCount = 0;
//         let newAddRowCount = 0;
//         let initialRemoveRowCount = 0;
//         let newRemoveRowCount = 0;
//         let newRowCount = 0;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').should('be.visible').click();
//         cy.get('.channelManageButtonContainer > :nth-child(1)').should('be.visible').click();
//         cy.get('.addAccommodationsViewContainer').should('be.visible');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.addAccommodationsViewContainer.visible > div > table > tbody')
//             .find('tr')
//             .then(($rows) => {
//                 initialRowCount = $rows.length;
//                 if (initialRowCount === 0) {
//                     cy.log('No accommodations found, stopping the test');
//                     return;
//                 }
//                 cy.get(':nth-child(1) > :nth-child(5) > button').click();
//                 cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.addAccommodationsViewContainer.visible > div > table > tbody')
//                     .then(($rows) => {
//                         newAddRowCount = $rows.length;
//                     });
//                 cy.get('.closeAddViewButton').click();
//                 cy.get('.addAccommodationsViewContainer').should('not.be.visible');
//                 cy.get('.channelManageButtonContainer > :nth-child(3)').click();
//                 cy.get('.removeAccommodationsViewContainer').should('be.visible');
//                 cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.removeAccommodationsViewContainer.visible > div > table > tbody')
//                     .find('tr')
//                     .then(($rows) => {
//                         initialRemoveRowCount = $rows.length;
//                     });
//                 cy.get(':nth-child(1) > :nth-child(5) > button').click();
//                 cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.removeAccommodationsViewContainer.visible > div > table > tbody')
//                     .find('tr')
//                     .should('not.exist')
//                     .then(() => {
//                         newRemoveRowCount = 0;
//                         if (newRemoveRowCount <= initialRemoveRowCount) {
//                             cy.log('Accommodation was removed successfully');
//                         } else {
//                             cy.log('No accommodation was removed from the list');
//                         }
//                     });
//                 cy.get('.closeRemoveViewButton').click();
//                 cy.get('.channelManageButtonContainer > :nth-child(1)').click();
//                 cy.get('.addAccommodationsViewContainer').should('be.visible');
//                 cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > div > div > div > div.addAccommodationsViewContainer.visible > div > table > tbody')
//                     .find('tr')
//                     .then(($rows) => {
//                         const newNewAddRowCount = $rows.length;
//                         if (newNewAddRowCount >= newAddRowCount) {
//                             cy.log('A new accommodation was added successfully after removing an accommodation');
//                         } else {
//                             cy.log('No accommodation was added to the list after removing an accommodation');
//                         }
//                     });
//             });
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//         cy.get('.threeDotsMenuContent').should('be.visible');
//         cy.get('.delete').click();
//         cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             newRowCount = $rows.length;
//             if (newRowCount < initialRowCount) {
//                 cy.log('Channel was deleted successfully');
//             } else {
//                 cy.log('No channel was deleted');
//             }
//         });
//     });
//
//     it('should be able to enable channel through the manage channel menu', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//         cy.get('.host-dist-box-container').should('be.visible');
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').should('be.visible').click();
//         cy.get('.enabled').should('be.visible').click();
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('be.checked', true);
//
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             initialRowCount = $rows.length;
//             if (initialRowCount === 0) {
//                 cy.log('No channels found, stopping the test');
//                 return;
//             }
//             cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//             cy.get('.threeDotsMenuContent').should('be.visible');
//             cy.get('.delete').click();
//             cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//             cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//                 newRowCount = $rows.length;
//                 if (newRowCount < initialRowCount) {
//                     cy.log('Channel was deleted successfully');
//                 } else {
//                     cy.log('No channel was deleted');
//                 }
//             });
//         });
//     });
//
//     it('should be able to disable channel through the manage channel menu', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//         cy.get('.host-dist-box-container').should('be.visible');
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').click();
//         cy.get('.enabled').click();
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').click();
//         cy.get(':nth-child(1) > .host-dist-box-row > .channelManageButton').click();
//         cy.get('.disabled').click();
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('not.be.checked', false);
//
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             initialRowCount = $rows.length;
//             if (initialRowCount === 0) {
//                 cy.log('No channels found, stopping the test');
//                 return;
//             }
//             cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//             cy.get('.threeDotsMenuContent').should('be.visible');
//             cy.get('.delete').click();
//             cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//             cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//                 newRowCount = $rows.length;
//                 if (newRowCount < initialRowCount) {
//                     cy.log('Channel was deleted successfully');
//                 } else {
//                     cy.log('No channel was deleted');
//                 }
//             });
//         });
//     });
// });
//
// describe('Host Distribution - Slider', () => {
//     it('should be able to enable an channel through the slider', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//         cy.get('.host-dist-box-container').should('be.visible');
//
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('not.be.checked', false);
//         cy.get(':nth-child(1) > .host-dist-box-row > :nth-child(3) > .toggle-status-switch > .slider').click();
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('be.checked', true);
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//         cy.get('.threeDotsMenuContent').should('be.visible');
//         cy.get('.delete').click();
//         cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             newRowCount = $rows.length;
//             if (newRowCount < initialRowCount) {
//                 cy.log('Channel was deleted successfully');
//             } else {
//                 cy.log('No channel was deleted');
//             }
//         });
//     });
//
//     it('should be able to disable an channel through the slider', () => {
//         let initialRowCount;
//         let newRowCount;
//         cy.intercept('POST', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/CreateChannel')
//             .as('createChannel');
//         cy.intercept('DELETE', 'https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/DeleteChannel')
//             .as('deleteChannel');
//         cy.get('.addChannelButton').click();
//         cy.get('.addChannelButtonMenuContent').should('be.visible');
//         cy.get('.channels').select('Airbnb');
//         cy.get('.channelAPIKey').type('123456789');
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-header > div > div > div > div.addCancelButtonContainer > button.addChannelButtonMenuButton.Add').click();
//         cy.wait('@createChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.contentContainer-channel > :nth-child(1)').should('exist');
//         cy.get('.host-dist-box-container').should('be.visible');
//
//         cy.get(':nth-child(1) > .host-dist-box-row > :nth-child(3) > .toggle-status-switch > .slider').should('be.visible').click();
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('be.checked', true);
//         cy.get(':nth-child(1) > .host-dist-box-row > :nth-child(3) > .toggle-status-switch > .slider').click();
//         cy.get('#root > div > div.containerHostDistribution > div.host-dist-content > div > div.contentContainer-channel > div:nth-child(1) > div > p:nth-child(3) > label > input[type=checkbox]')
//             .should('not.be.checked', false);
//
//         cy.get(':nth-child(1) > .host-dist-box-row > .threeDotsButton').should('be.visible').click();
//         cy.get('.threeDotsMenuContent').should('be.visible');
//         cy.get('.delete').click();
//         cy.wait('@deleteChannel').its('response.statusCode').should('eq', 200);
//         cy.get('.host-dist-box-container').find('.host-dist-box-row').then(($rows) => {
//             newRowCount = $rows.length;
//             if (newRowCount < initialRowCount) {
//                 cy.log('Channel was deleted successfully');
//             } else {
//                 cy.log('No channel was deleted');
//             }
//         });
//     });
// });
//
// describe('Host Distribution - Creating a iCal link', () => {
//     it('should upload iCal to S3, copy URL to clipboard, and check if it is valid', () => {
//         let userId;
//         let icalUrl;
//         cy.window().then((win) => {
//             const data = JSON.parse(win.localStorage.getItem('CognitoIdentityServiceProvider.78jfrfhpded6meevllpfmo73mo.17143a37-934d-4bc6-9777-1395041fe876.userData'));
//             userId = data.Username;
//             expect(userId).to.exist;
//             expect(userId).to.be.a('string');
//         });
//         cy.intercept('PUT', '**/hosts/*/*.ics', {}).as('uploadICalToS3');
//         cy.get('.exportICalButton').click();
//         cy.wait('@uploadICalToS3').then((interception) => {
//             expect(interception.request.url).to.include(`/hosts/${userId}/${userId}.ics`);
//             expect(interception.request.headers['content-type']).to.equal('text/calendar');
//             icalUrl = interception.request.url;
//         });
//         cy.window().then((win) => {
//             cy.stub(win.navigator.clipboard, 'writeText').as('copyToClipboard');
//         });
//         cy.get('@copyToClipboard').should('have.been.calledOnce');
//         cy.then(() => {
//             expect(icalUrl).to.exist;
//             cy.request(icalUrl).then((response) => {
//                 expect(response.status).to.equal(200);
//                 const icalContent = response.body;
//                 expect(icalContent).to.include('BEGIN:VCALENDAR');
//                 expect(icalContent).to.include('END:VCALENDAR');
//                 expect(icalContent).to.include('BEGIN:VEVENT');
//                 expect(icalContent).to.include('END:VEVENT');
//                 expect(icalContent).to.include('SUMMARY:');
//                 expect(icalContent).to.include('DTSTART:');
//                 expect(icalContent).to.include('DTEND:');
//                 expect(icalContent).to.include('UID:');
//                 expect(icalContent).to.include('LOCATION:');
//                 expect(icalContent).to.include('ACCOMMODATION-ID:');
//             });
//         });
//     });
// });
//
