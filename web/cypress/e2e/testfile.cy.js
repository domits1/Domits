// describe('Testing "inlogen"', () => {
//     it('test 1', () => {
//         cy.visit('https://localhost:3000/login');
//         // Check 1 //Juiste Inlog gegevens //email // passwoord
//         cy.performInputCheck2('kacperfl29@gmail.com','Kacper1212' );//l
//         cy.testinlog();
//     })
//     it('test 2', () => {
//         cy.visit('https://localhost:3000/login');
//         // Check 2 //onjuiste e-mail //juiste passwoord
//         cy.performInputCheck2('abdelrahmavdfvfd@yahoo.com','0123456789' );
//     })
//     it('test 3', () => {
//         cy.visit('https://localhost:3000/login');
//         // check 3 // Juiste e-mail // onjuiste passwoord
//         cy.performInputCheck2('abdelrahmanfox22@yahoo.com','5481616' );
//     })
//     it('test 4', () => {
//         cy.visit('https://localhost:3000/login');
//         // check 4 // leeg e-mail // leeg passwoord
//         cy.performInputCheck2(' ',' ' );
//     })
// })