describe('Guest Login and Update Family on Guest Dashboard', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080);
  });

  it('should log in, switch to guest dashboard, and update the family count with random values each run', () => {
    
    const adults = Math.floor(Math.random() * 5) + 1; 
    const kids = Math.floor(Math.random() * 3);       
    const expectedFamilyText = `${adults} adult${adults === 1 ? '' : 's'} - ${kids} kid${kids === 1 ? '' : 's'}`;

    
    cy.visit('https://acceptance.domits.com/');

    cy.get('[src="/static/media/arrow-down-icon.59bf2e60938fc6833daa025b7260e7f6.svg"]').click();
    cy.get('.dropdownLoginButton').click();

    cy.get('#email').type('testpersoondomits@gmail.com');
    cy.get('#password').type('Gmail.com1');
    cy.get('.loginButton').click();

    cy.contains('button', 'Switch to Guest', { timeout: 15000 }).should('be.visible').click();

    cy.url().should('include', '/guestdashboard');
    cy.get('h2').should('contain', 'Dashboard');

   
    cy.get('.pi-list .pi-row').eq(4).as('familyRow');
    cy.get('@familyRow').find('button.pi-action').click();

    cy.contains('.booking-details__label', 'Adults')
      .parent()
      .find('input')
      .should('exist')
      .then(($input) => {
        const input = $input[0];
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, adults);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

    
    cy.contains('.booking-details__label', 'Kids')
      .parent()
      .find('input')
      .should('exist')
      .then(($input) => {
        const input = $input[0];
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, kids);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });

  
    cy.get('@familyRow').find('button.pi-action.save').click();


    cy.contains(expectedFamilyText).should('exist');
    cy.log(` Family updated to: ${expectedFamilyText}`);
  });
});
