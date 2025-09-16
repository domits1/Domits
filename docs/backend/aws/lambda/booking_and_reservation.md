# Core information
For naming concerns, we refer to reservations in the front-end and booking in the back-end. In the lambda function, both keywords booking and reservations are used, but that has to be one name to ensure naming consistency. This is planned to be changed to that.

Also, remember that the Class Diagram and Sequence Diagram design and is not 100% accurate to what exists currently. This is bound to be updated soon.

The host for a booking needs to have their account connected with Stripe.
The total calculation for an booking is as followed: `const total = totalRoomRate + responseData.pricing.cleaning + responseData.pricing.service`

## Main issue: [#501](https://github.com/domits1/Domits/issues/501)

# Core functionality
The CRUD is responsible for 4 tasks, which are:
1. Make bookings and put them in the database 
2. Read bookings for host dashboard
3. Read bookings for guest dashboard
4. Remove bookings for host dashboard

All API requests will go through this lambda function (General-Bookings-CRUD-Bookings-develop), and that will determine which function is suited for which task.

...

# Security
Authorization will use your access_token. 
*How to grab your access token?*

1. Head to domits.com
2. Open the Dev console (CTRL+SHIFT+I)
3. Click the application tab, copy the token from **CognitoIdentityServiceProvider**.xxxxxxxxxxxxxxxx...**accessToken**
4. Copy and paste this into your request as header (If you're using Postman or any API application to invoke the request, be aware that the accessToken resets every hour.)

...

# Architectural pattern
...

# API Information
The API used is an REST api called: Booking-API-Develop
...

# Class diagram
![ReservationsCRUD drawio](https://github.com/user-attachments/assets/a2d0b969-836d-4ee3-8931-6aedc80742be)

[Class Diagram Edit Link](https://drive.google.com/file/d/1R07G2hYAxQhD3D1YhsxFvE4A0kERSELc/view?usp=sharing)
(To edit the Class Diagram, click the link and click: "Open With -> draw.io")

# Sequence diagram
Flow of the Create booking [(Code)](https://raw.githubusercontent.com/Bambaclad1/charts/refs/heads/main/bookingCRUDCreateSequence.txt)

![mermaid-flow-1x](https://github.com/user-attachments/assets/9e65e49b-c9d5-49e2-90a3-d461a162e092)
...
# Request formats
POST Request example: (Updated, 23-4)
```
{
    "httpMethod" : "POST",
    "headers": {
        "Authorization": "null"
    },
    "body": {
        "identifiers": {
            "property_Id": "606519ba-89a4-4e52-a940-3e4f79dabdd7",
            "guest_Id": "0f5cc159-c8b2-48f3-bf75-114a10a1d6b3",
            "payment_Id": "223cea5a-41d3-48cd-8578-184f14e6b47c"
        },
        "general": {
            "guests": 1,
            "latePayment": false,
            "status": "Accepted",
            "arrivalDate": 1744934400000,
            "departureDate": 1745020800000
        },
        "tax": {
            "tourism": 1.09
        }
    }
}
```
GET Request example:
> [!NOTE]
> The readType has six known values, `property`, `guest`, `createdAt`, `paymentId`, `hostId` and `departureDate` It runs querys based on GSI's.

### get by PropertyID [Token Needed]

***Usecase: Get bookings based on Property ID.***
***Returns: Every item in a table***
https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?property_Id=606519ba-89a4-4e52-a940-3e4f79dabdd7&readType=property

### get by GuestID [token Needed]

***Usecase: Get bookings based on GuestID.***
***Returns: Every item in a table***
https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest&guest_Id=0f5cc159-c8b2-48f3-bf75-114a10a1d6b3

### get by createdAt
to be updated...

## Todo Wiki:
- [ ] Update sequence/class diagram to current code for create/read
- [ ] Show proper flow for creating a booking (flowchart) in Domits
- [ ] ...