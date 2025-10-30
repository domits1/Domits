**Main issue: [#501](https://github.com/domits1/Domits/issues/501)**

# Core information

For naming concerns, we refer to reservations in the front-end and booking in the back-end. In the lambda function, both keywords booking and reservations are used, but that has to be one name to ensure naming consistency. This is planned to be changed to that.

Also, remember that the Class Diagram and Sequence Diagram design and is not 100% accurate to what exists currently. This is bound to be updated soon.

The host for a booking needs to have their account connected with Stripe.
The total calculation for an booking is as followed: `const total = totalRoomRate + responseData.pricing.cleaning + responseData.pricing.service`

# Core functionality

The CRUD is responsible for 4 tasks, which are:
1. Make bookings and put them in the database 
2. Read bookings for host dashboard and guest dashboard
3. Edit bookings for the create process
4. Delete bookings (implemented)

All API requests will go through this lambda function (General-Bookings-CRUD-Bookings-develop), and that will determine which function is suited for which task.

# Security

Authorization will use your access_token.

*How to grab your access token?*

1. Head to domits.com, acceptance.domits.com or if you're running localhost, localhost
2. Open the Dev console (CTRL+SHIFT+I)
3. Click the application tab, copy the token from **CognitoIdentityServiceProvider**.xxxxxxxxxxxxxxxx...**accessToken**
4. Copy and paste this into your request as header (If you're using Postman or any API application to invoke the request, be aware that the accessToken resets every hour.)


# API Information
The API used is an REST api called: Booking-API-Develop

You can check it out [here](https://eu-north-1.console.aws.amazon.com/apigateway/main/apis/92a7z9y2m5/resources?api=92a7z9y2m5&region=eu-north-1&routes=jwqjok3).

# Class diagram
![ReservationsCRUD drawio](https://github.com/user-attachments/assets/a2d0b969-836d-4ee3-8931-6aedc80742be)

[Class Diagram Edit Link](https://drive.google.com/file/d/1R07G2hYAxQhD3D1YhsxFvE4A0kERSELc/view?usp=sharing)
(To edit the Class Diagram, click the link and click: "Open With -> draw.io")

# Sequence diagram
Flow of the Create booking [(Code)](https://raw.githubusercontent.com/Bambaclad1/charts/refs/heads/main/bookingCRUDCreateSequence.txt)

![mermaid-flow-1x](https://github.com/user-attachments/assets/9e65e49b-c9d5-49e2-90a3-d461a162e092)
...
# Request formats

## Running requests
Requests can be run through various ways, the ones listed are the common methods used:
1. In Node. You can configure a post in your events folder. 
    This is by far the best way, because it does not require changing an auth token. You can find it here: `backend\events\General-Bookings-CRUD-Bookings-develop\` and eventually run `node ./post.js`
> [!warning]
> Using the Node function does not ask you for an authorization and uses a dummy account to handle bookings. This can result in many errors where your web environment's data does not match the backend data. To fix this, input your own auth token.

2. In Postman. Ensure to add your auth token in the headers page. See the GIF below how that works. Do bare in mind that Postman does not generate CORS errors, incase you get them. Rather, localhost gets CORS errors.

![sendarequestpostman](https://github.com/user-attachments/assets/3d2241a1-a591-44f4-93c6-0cce1cca4ea2)

3. Using a `await fetch` (or any other fetch packages) to send a request from the front-end. This is the way users will interact with Domits. So make sure that this one is the most polished one. For functions that require authorization, use `frontend\web\src\services\getAccessToken.js`. Eventually you'd run `const getAccessToken();`
```js
import { getAccessToken } from "frontend\web\src\services\getAccessToken.js"; // always use "../../src/services", never a direct path. This is just a example.

    const token = await getAccessToken();

    const response = await fetch(
        `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?paymentid=${paymentID}`, {
            method: "PATCH",
            headers: {
                Authorization: token
            }
            body: JSON.stringify(body),
        }
    );
```

---

### POST Request Format:

```
{
    "httpMethod" : "POST",
    "headers": {
        "Authorization": "null"
    },
    "body": {
        "identifiers": {
            "property_Id": "606519ba-89a4-4e52-a940-3e4f79dabdd7"
        },
        "general": {
            "guests": 1,
            "arrivalDate": 1744934400000,   
            "departureDate": 1745020800000
        },
    }
}
```
---
### GET Request Format:

**The first thing you need to configure in your request is a readType. This tells every read type apart and the function knows what to get based on which readType is requested.**

**Current developed `readtype`'s:**
* `createdAt`
* `departureDate`
* `guest`
* `hostId`
* `paymentId`
* `property`

### get by `createdAt` 
Uses token: No

Use Case: Getting bookings from a date where the reservation was created

Retuns: Dates from the date which a reservation was created and the corrosponding property_id.

Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=createdAt&property_Id=c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8&createdAt=1756857600000`

### get by `departureDate`
Uses token: No

Use Case: Getting bookings from a departureDate

Returns: Dates from the data which a reservation's departureDate is over with the corrosponding property_id

Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=departureDate&property_Id=c759a4b7-8dcf-4544-a6cf-8df7edf3a7e8&departureDat=1749513600000`

### get by `guest`
Uses token: Yes 

Use case: Getting bookings which the guest has booked.

Returns: Full booking information.

Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=guest`

### get by `hostId` 
Uses token: Yes

Use case: Getting all bookings for all the properties a host owns.

Returns: Full booking information.

Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=hostId`

> [!TIP]
> Add property_Id in your request to sort with only one property_id.
> 
> Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=hostId&property_Id=a7a438d5-528d-4578-85ef-d3282ce92e6e`


### get by `paymentId` 
Uses token: Yes

Use case: Gets bookings on the unique payment_id

Returns: Full booking information.

Format: `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=paymentId&paymentID=pi_3S5nsgGiInrsWMEc0djWC2YZ`

### get by `property`
This is pending refactoring. This function returns nothing at the moment because of a security flaw.

---

### DELETE Request Format:

Uses token: Yes

Use case: Delete a booking from the database. Only the guest or host of the booking can delete it.

Returns: 204 No Content on success (no response body).

Authorization: Requires valid access token in headers.

**Request Body:**
```json
{
    "bookingId": "your-booking-id-here"
}
```

**Example using fetch:**
```js
const response = await fetch(
    `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings`, {
        method: "DELETE",
        headers: {
            Authorization: token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            bookingId: "abc123-def456-ghi789"
        })
    }
);
```

**Example event format:**
```json
{
    "httpMethod": "DELETE",
    "headers": {
        "Authorization": "your-access-token"
    },
    "body": "{\"bookingId\": \"abc123-def456-ghi789\"}"
}
```

**Response codes:**
- `204`: Booking successfully deleted
- `400`: bookingId is required in request body
- `403`: User is not authorized to delete this booking (not the guest or host)
- `404`: Booking not found
- `500`: Server error

**Security:**
- User must be authenticated with a valid access token
- User must be either the guest or the host of the booking to delete it
- Attempting to delete another user's booking will result in a 403 Forbidden error

---

## Todo Wiki:
- [ ] Update sequence/class diagram to current code for create/read
- [ ] Show proper flow for creating a booking (flowchart) in Domits
- [x] Implement DELETE functionality for bookings
- [ ] ...