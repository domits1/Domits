import '../support/commands'

describe('Landing Page and HostDashboard Tests', () => {
  beforeEach(() => {
    cy.viewport(1920, 1080)

    cy.loginAsGuest()

    // Mock API responses for the dashboard
    cy.intercept(
      'POST',
      '**/General-Payments-Production-Read-CheckIfStripeExists',
      {
        statusCode: 200,
        body: {
          hasStripeAccount: JSON.stringify({body: false}),
        },
      },
    ).as('checkStripeAccount')

    cy.intercept('POST', '**/FetchRecentAccommodations', {
      statusCode: 200,
      body: {
        body: JSON.stringify([
          {
            ID: '1',
            Title: 'Cozy Apartment',
            AccommodationType: 'Apartment',
            City: 'New York',
            Street: 'Main St',
            PostalCode: '12345',
            Images: ['image1.jpg', 'image2.jpg'],
            Drafted: false,
            createdAt: '2023-01-01T12:00:00Z',
            DateRanges: [
              {
                startDate: '2023-02-01T00:00:00Z',
                endDate: '2023-02-10T00:00:00Z',
              },
            ],
          },
          {
            ID: '2',
            Title: 'Luxury Boat',
            AccommodationType: 'Boat',
            City: 'Miami',
            Harbour: 'Central Harbour',
            Images: ['boat1.jpg', 'boat2.jpg'],
            Drafted: true,
            createdAt: '2023-01-05T12:00:00Z',
            DateRanges: [],
          },
        ]),
      },
    }).as('fetchRecentAccommodations')

    cy.stub(window, 'fetch')
      .resolves({
        json: () =>
          Promise.resolve({
            attributes: {
              sub: 'user123',
              email: 'testuser@example.com',
              given_name: 'John Doe',
              address: '123 Test Address',
              phone_number: '+123456789',
            },
          }),
      })
      .as('mockAuth')
  })

  it('should load and display user information', () => {
    cy.wait('@checkStripeAccount')

    cy.contains('Welcome adaswrrwdadadsa').should('be.visible')
    cy.contains('Email: kacperfl29@gmail.com').should('be.visible')
    cy.contains('Name: adaswrrwdadadsa').should('be.visible')
  })

  it('should fetch and display recent accommodations', () => {
    cy.wait('@fetchRecentAccommodations')

    cy.contains('My recent listings:').should('be.visible')
    cy.contains('Cozy Apartment').should('be.visible')
    cy.contains('New York').should('be.visible')
    cy.contains('Main St').should('be.visible')
    cy.contains('12345').should('be.visible')
    cy.contains('Luxury Boat').should('be.visible')
    cy.contains('Miami').should('be.visible')
    cy.contains('Central Harbour').should('be.visible')
  })

  it('should navigate to listing details when clicking a live accommodation', () => {
    cy.wait('@fetchRecentAccommodations')

    cy.contains('Cozy Apartment').click()
    cy.url().should('include', '/listingdetails?ID=1')
  })

  it('should display an alert when clicking a drafted accommodation', () => {
    cy.wait('@fetchRecentAccommodations')

    cy.contains('Luxury Boat').click()
    cy.on('window:alert', text => {
      expect(text).to.contains(
        'This accommodation is drafted and cannot be viewed in listing details!',
      )
    })
  })

  it('should refresh accommodations when clicking the "Refresh" button', () => {
    cy.wait('@fetchRecentAccommodations')

    cy.contains('Refresh').click()
    cy.wait('@fetchRecentAccommodations')
  })

  it('should navigate to the listing page when clicking "Go to listing"', () => {
    cy.contains('Go to listing').click()
    cy.url().should('include', '/hostdashboard/listings')
  })

  it('should navigate to the "Add accommodation" page when clicking the button', () => {
    cy.contains('Add accommodation').click()
    cy.url().should('include', '/enlist')
  })
})
