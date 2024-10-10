describe('Landing Page Tests', () => {

    beforeEach(() => {
      cy.viewport(1920, 1080);
    });
  
    it('First Section should exist', () => {
      cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
      cy.get('.landing_MainText__uwM8p > h1').should('exist');
      cy.get('.landing_textAnimated__fvaGq > :nth-child(1)').should('exist');
      cy.get('.landing_textAnimated__fvaGq > :nth-child(2)').should('exist');
      cy.get('.landing_textAnimated__fvaGq > :nth-child(3)').should('exist');
      cy.get('button').contains('Start hosting').should('exist');
      cy.get('.landing_MainText__uwM8p > p').should('exist');
      cy.get('img[alt="House"]').should('exist');
      cy.get('img[alt="personalAdvice"]').should('exist');
    });
  
    it('Should login', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('[name="firstName"]').type('Messi');
        cy.get('[name="lastName"]').type('AAA'); 
        cy.get('[type="email"]').type('nilasov268@scarden.com');
          cy.get('#password').type('Test123400!');
          cy.get('.hostCheckbox > input').click();
          cy.get('.registerButton').click();
          cy.get('.errorText').should('exist');
      });

    it('Hosting on Domits has never been easier.', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_easyHosting_text__fLgDn > h1').should('exist');
        cy.get('.landing_easyHosting_text__fLgDn > h3').should('exist');
        cy.get('.landing_threeSteps__eShp8 > :nth-child(1) > h1 > .landing_highlightText__T8CZ3').should('exist');
        cy.get(':nth-child(1) > h2').should('exist');
      });

      it('Why should i host on Domits?', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_SecPicture__33Fdz > img').should('exist');
        cy.get('.landing_whyHostText__bOXBW > h1').should('exist');
        cy.get('.landing_whyHostText__bOXBW > p').should('exist');
        cy.get('.landing_whyHostText__bOXBW > .landing_nextButtons__Zfo2L').should('exist');
      });


      it('Register your property simple and safe', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_simpleSafeAll__kUQRL > h1').should('exist');
        cy.get('.landing_SimpleSafeAllCards__ZixV3 > :nth-child(1) > :nth-child(1) > img').should('exist');
        cy.get(':nth-child(1) > :nth-child(3) > img').should('exist');
        cy.get('.landing_SimpleSafeAllCards__ZixV3 > :nth-child(2) > :nth-child(1) > img').should('exist');
        cy.get(':nth-child(2) > :nth-child(2) > img').should('exist');
        cy.get(':nth-child(2) > :nth-child(3) > img').should('exist');
      });

      it('What other say about domits', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_clientRevieuw__wnY1l > h1').should('exist');
        cy.get('.landing_clientRevieuw__wnY1l > :nth-child(2)').should('exist');
        cy.get('.landing_clientRevieuw__wnY1l > :nth-child(7)').should('exist');
      });


      it('  Is your property suitable for renting out?', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_checkList__DBvZs > h1').should('exist');
        cy.get('.landing_subText__i24x5').should('exist');
        cy.get('.landing_checkListItems__0dBJN > :nth-child(1) > h3').should('exist');
        cy.get(':nth-child(1) > .landing_checkListItem__text__QAZuX').should('exist');
      });

    it('Should display and toggle FAQ sections', () => {
      cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
      cy.get(':nth-child(1) > .landing_landing__faq__body__DmcsJ').click();
      cy.get(':nth-child(1) > .landing_landing__faq__answer__zhs0N').should('exist');
    });

    it(' Free personal advice from our rental expert team', () => {
        cy.visit('https://acceptance.domits.com/landing/', { failOnStatusCode: false });
        cy.get('.landing_personal__advice__lVoZj > img').should('exist');
        cy.get('.landing_personal__advice__left__JJXGH > h1 > .landing_highlightText__T8CZ3').should('exist');
        cy.get('.landing_personal__advice__left__JJXGH > h1 > .landing_highlightText__T8CZ3').should('exist');
      });
    });
  