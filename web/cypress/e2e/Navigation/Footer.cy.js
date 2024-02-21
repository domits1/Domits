// describe('Links', () => {
//     it('Should check all footer links', () => {
//         cy.visit('https://acceptance.domits.com/');
//
//         // Navigation section
//         cy.get('.footer-section').eq(0).find('a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//
//         // Guests section
//         cy.get('.footer-section').eq(1).find('a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//
//         // Hosts section
//         cy.get('.footer-section').eq(2).find('a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//
//         // Network section
//         cy.get('.footer-section').eq(3).find('a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//
//         // Socials section
//         cy.get('.footer-section-grid').eq(0).find('a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//
//         // Check additional links
//         cy.get('.footer-terms a').each(($link) => {
//             const href = $link.prop('href');
//             if (href && href !== '#') {
//                 cy.request(href).should('have.property', 'status', 200);
//             }
//         });
//     });
// });
