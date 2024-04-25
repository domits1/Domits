it('LoginGuest dashboard testing', () => {
    console.log('Auth spec');
    cy.visit('https://acceptance.domits.com/');
    cy.wait(1000); 
    cy.get('.personalMenu').click(); 
  
    cy.wait(1000); 
  
    cy.get('.dropdownLoginButton').click(); 
  
    cy.get('input[name="email"]').type('kacperfl29@gmail.com'); 
    cy.wait(500); 
    cy.get('input[name="password"]').type('Kacper2911'); 
    cy.wait(500); 
    cy.get('button[type="submit"]').click(); 
  
    cy.wait(3000); 
  
    cy.url().should('eq', 'https://acceptance.domits.com/login'); 
    cy.reload(); 
    cy.get('.personalMenu').first().click(); 
    cy.contains('button', 'Profile').click();

    // Navigeren naar de berichtensectie
    cy.get('.dashboardSections > :nth-child(2)').click(); // Ga naar de berichten/chat sectie

    // Typen en versturen van een bericht
cy.get('.chat__input').type('Is er nog iets anders waarmee ik u kan helpen?{enter}');

// Even wachten om de UI te laten updaten
cy.wait(1000); // Pas deze tijd aan op basis van gemiddelde reactietijd

// Controleren op het bericht


    // Optioneel: uitloggen na voltooien van tests
    cy.get('.personalMenu').click(); 
    cy.get('.dropdownLogoutButton').click(); // Stel dat er een klasse is voor de logout knop
});