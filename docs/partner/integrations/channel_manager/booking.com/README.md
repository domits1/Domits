# Booking.com through Channex

Domits does not connect to Booking.com directly. Booking.com has paused onboarding of new connectivity providers and does not accept direct connections from individual properties, so a listing is connected through Channex. How the Channex integration works: [Channex integration](../channex/README.md).

Channex's own step-by-step guide: [Booking.com mapping guide](https://docs.channex.io/channel-mapping-guides/booking.com).

## What is needed

- A property that already exists on Booking.com. Channex cannot create a Booking.com listing; a new listing needs Booking.com's approval first, which takes days.
- Access to the property's Booking.com extranet (the owner's account, with two-step verification on their phone).
- The Domits listing mapped to a Channex property, room type and rate plan (Domits supports one of each per property).
- The Domits calendar confirmed by the host: after activation every open date is bookable on Booking.com.

## Steps

| Step | Who | Where |
|---|---|---|
| 1. Create or check the property, room type and rate plan in Channex production and save the mapping in Domits (a full sync follows) | Domits | Channex, Domits Channex diagnostics |
| 2. Choose Channex as connectivity provider and accept its terms | Host | Booking.com extranet: Account → Connectivity provider |
| 3. Send the Booking.com Hotel ID to Domits | Host | — |
| 4. Create a Booking.com channel with the Hotel ID, map the Booking.com room and rate to the Channex room type and rate plan, activate | Domits | Channex → Channels |
| 5. Check prices and availability on Booking.com and the first booking in Domits | Domits | Booking.com extranet, Domits |

Time: about 30–60 minutes for Domits, plus the host's step 2.

## Things to know

- Map every Booking.com room and rate that can be booked; a booking on an unmapped rate does not arrive. With Domits's one room type and one rate plan per property (#3568), the Booking.com listing should have one bookable room and rate.
- Existing future Booking.com bookings are not imported (#3582). Block those dates in the Domits calendar before activating.
- Photos, descriptions, facilities and policies stay managed in the Booking.com extranet.
- After activation, change prices and availability in Domits, not in the extranet: Domits overwrites a date the next time that date changes in Domits, or on a full sync.
- Bookings arrive in Domits with the amount the guest paid on Booking.com and source Booking.com.
- Guest messages on a test booking only work when the test booking was made while logged in to Booking.com.

## Testing on staging

Channex staging has Booking.com test hotels (EUR test hotel 4372137 was used for Domits). Run the backend locally with `CHANNEX_BASE_URL=https://staging.channex.io` and a staging API key; production Lambdas talk to Channex production only.
