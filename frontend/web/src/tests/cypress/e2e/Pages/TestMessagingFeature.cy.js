function generateRandomText(length) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

describe('Testing Messaging feature as a Host', () => {
    
    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();
        cy.viewport(1920, 1080);
        cy.loginAsHost();
    });

    it('should log in as a Host', () => {
        cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard/');
        cy.get('.header-links > .headerHostButton').should('contain.text', 'Switch to Guest');
    });

    it('should go to the message tab', () => {
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-toggle > .active').should('be.visible'); 
        cy.get('.contact-list-toggle > :nth-child(2)').should('be.visible');       
    });

    it('should be able open the first host chat', () => {
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.wait(100);
        cy.get('.contact-list-list-item').click();
        cy.get('.host-chat-screen').should('be.visible');
        cy.get('h3').first().then(($person) => {
            cy.get('.contact-item-full-name').should('contain.text', $person.text());
        });
    });

    it('should be able to send message as a host in chat', () => {        
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-textarea').type('Hello world');
        cy.get('.message-input-send-button').click();
        cy.reload();
        
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get(':nth-child(1) > .message-content').should('contain.text','Hello world');
        cy.get(':nth-child(1) > .message-header > .sender-name').should('contain.text', 'You');
    });

    it('verying that timestamps are accurate', () => {
           
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-textarea').type('Hello world');
        cy.get('.message-input-send-button').click();
        cy.get(':nth-child(1) > .message-content').should('contain.text','Hello world');
        cy.get(':nth-child(1) > .message-header > .sender-name').should('contain.text', 'You');
        cy.get(':nth-child(1) > .message-header > .message-time').first().then(($time) => {
            cy.log('time on chat: ' + $time.text());
            
            const time2 = new Date().toLocaleTimeString();

            cy.log('current time:', time2);
            const parsedTime1 = new Date(`2025-03-20T${$time}:00`).toLocaleTimeString('en-US', { hour12: true });
            const parsedTime2 = new Date(`2025-03-20T${time2}`).toLocaleTimeString('en-US', { hour12: true });

            const isSameTime = parsedTime1.slice(0, 7) === parsedTime2.slice(0, 7);

            expect(isSameTime).to.be.true;  
        }); 
    });

    it('checking if the click actually happens', () => {
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-send-button').click().then(($btn) => {
            cy.wrap($btn).should('not.be.disabled');
        });
    });

    it('should prevent sending empty messages', () => {   
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-send-button').click();
        cy.get(':nth-child(1) > .message-content').should('not.have.text','');        
    });

    it('should generate random text example', () => {
        const randomText = generateRandomText(10000);

        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-textarea').type(randomText);
        cy.get('.message-input-send-button').click();
        cy.reload();

        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get(':nth-child(1) > .message-content').should('have.text', randomText);   
    });
});

describe('Testing message feature as a Guest', () => {

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();
        cy.viewport(1920, 1080);
        cy.loginAsGuest();
    });    

    it('should be able to log in as Guest', () => {
        cy.url().should('eq', 'https://acceptance.domits.com/guestdashboard');
        cy.get('.header-links > .headerHostButton')
        .should('contain.text','Switch to Host');
    });

    it('should be able to display the messag tabs', () => {        
        cy.get('.dashboardSections > :nth-child(3)').click();
    });


    it('should be able open the first guest chat', () => {
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-chat-screen').should('be.visible');
        cy.get('h3').first().then(($person) => {
            cy.get('.guest-contact-item-full-name').should('contain.text', $person.text());
        });
    });

    it('should be able to send message as a guest in chat', () => {   
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-textarea').type('Hello world');
        cy.get('.guest-message-input-send-button').click();
        cy.reload();
        
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get(':nth-child(1) > .guest-message-content').should('contain.text','Hello world');
        cy.get(':nth-child(1) > .guest-message-header > .guest-sender-name').should('contain.text', 'You');
    });

    it('verying that timestamps are accurate', () => {
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-textarea').type('Hello world');
        cy.get('.guest-message-input-send-button').click();

        cy.get(':nth-child(1) > .guest-message-content').should('contain.text','Hello world');
        cy.get(':nth-child(1) > .guest-message-header > .guest-sender-name').should('contain.text', 'You');
        cy.get(':nth-child(1) > .guest-message-header > .guest-message-time').first().then(($time) => {
            cy.log('time on chat: ' + $time.text());
            
            const time2 = new Date().toLocaleTimeString();

            cy.log('current time:', time2);
            const parsedTime1 = new Date(`2025-03-20T${$time}:00`).toLocaleTimeString('en-US', { hour12: true });
            const parsedTime2 = new Date(`2025-03-20T${time2}`).toLocaleTimeString('en-US', { hour12: true });

            const isSameTime = parsedTime1.slice(0, 7) === parsedTime2.slice(0, 7);

            expect(isSameTime).to.be.true;  
        }); 
    });

    it('checking if the click actually happens', () => {
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-send-button').click().then(($btn) => {
            cy.wrap($btn).should('not.be.disabled');
        });
    });

    it('should prevent sending empty messages', () => { 
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-send-button').click();
        cy.get(':nth-child(1) > .guest-message-content').should('not.have.text','');        
    });

    it('should generate random text example', () => {
        const randomText = generateRandomText(10000);

        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-textarea').type(randomText);
        cy.get('.guest-message-input-send-button').click();
        cy.reload();
        
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get(':nth-child(1) > .guest-message-content').should('have.text', randomText);   
    });
});

describe('Testing interaction between Host and Guest', () => {

    const randomText = generateRandomText(10000);

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.reload();
        cy.viewport(1920, 1080);
    });

    it('should be able to login as a Guest', () => {    
        cy.loginAsGuest();    
        cy.url().should('eq', 'https://acceptance.domits.com/guestdashboard');
        cy.get('.header-links > .headerHostButton')
        .should('contain.text','Switch to Host');
    });   

    
    it('should generate random text example and send to host', () => { 
        cy.loginAsGuest();    

        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-message-input-textarea').type('Hello I am guest, ' +randomText);
        cy.get('.guest-message-input-send-button').click();
        cy.reload();
        
        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.get('.guest-contact-list-list-item').click();
        cy.get(':nth-child(1) > .guest-message-content').should('have.text', 'Hello I am guest, '+randomText);   
    });

    it('should log in as a Host', () => {
        cy.loginAsHost();
        cy.url().should('eq', 'https://acceptance.domits.com/hostdashboard/');
        cy.get('.header-links > .headerHostButton').should('contain.text', 'Switch to Guest');
    });

    
    it('should be able open the first host chat and verify the message from the Guest', () => {
        cy.loginAsHost();
        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.wait(100);
        cy.get('.contact-list-list-item').click();
        cy.get('.host-chat-screen').should('be.visible');
        cy.get('h3').first().then(($person) => {
            cy.get('.contact-item-full-name').should('contain.text', $person.text());
        });
        cy.get(':nth-child(1) > .message-content').should('contain.text', 'Hello I am guest, ' +randomText);
    });
    

    it('should generate random text example and send a reply to guest as a Host', () => {
        cy.loginAsHost();

        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get('.message-input-textarea').type('Hi I am host, ' +randomText);
        cy.get('.message-input-send-button').click();
        cy.reload();

        cy.get('.dashboardSection > :nth-child(5)').click();
        cy.get('.contact-list-list-item').click();
        cy.get(':nth-child(1) > .message-content').should('have.text', 'Hi I am host, ' +randomText);   
    });

    it('should be able login as a Guest and verify the message from the Host as a Guest', () => {
        cy.loginAsGuest();

        cy.get('.dashboardSections > :nth-child(3)').click();
        cy.wait(100);
        cy.get('.guest-contact-list-list-item').click();
        cy.get('.guest-chat-screen').should('be.visible');
        cy.get('h3').first().then(($person) => {
            cy.get('.guest-contact-item-full-name').should('contain.text', $person.text());
        });
        cy.get(':nth-child(1) > .guest-message-content').should('contain.text', 'Hi I am host, ' +randomText);
    });
});