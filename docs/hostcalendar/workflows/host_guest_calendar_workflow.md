## Why?

For Hosts:

Hosts can view and manage availability through a calendar interface.
Hosts can set or update nightly prices, including special prices for specific dates or events.
Hosts can configure dynamic pricing based on occupancy ratio (e.g., increase prices when demand is high).
Hosts can block dates to make the property unavailable for booking (e.g., for personal use, maintenance, etc.).

For Guests:

Guests can view the calendar with real-time updates.
Calendar displays:
  Available dates
  Blocked/unavailable dates
  Standard prices
  Special or updated prices (highlighted clearly)
  Guests are informed when prices have changed due to occupancy or other conditions set by the host.

## Backend API
Here is some current API that are in use

Get active properties from a host (filtered by host id)
URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId

{
    "method": "GET"
}

Getting bookings for a host who owns the properties.(filtered by host id)
URL: https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=hostId

{
    "method": "GET"
}

Returns: Full booking information.

## New API creation

From host calendar view host will update the prices for upcoming months, spical date & events. Also can block dates that how the guest will not be able to book the proporty on those days.


### Controller
The controller has to receive the request from your index.js file (this is where you route requests to the correct methods) and parse the contents you need from it (think of a POST request where you have to parse the request body). We also perform our authorization here, in most backend frameworks, you write middleware functions which you can implement in the routing of a method. But because we use plain javascript, this is not as simple. For this reason, we call our authorization methods from the top level of our controller method. After parsing and authorizing the request, the controller method should give the needed data (for this method) to the business layer.