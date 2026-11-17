# Airbnb through Channex

Domits does not connect to Airbnb directly. Airbnb's API is only open to software partners it invites, so a listing is connected through Channex, which is a certified Airbnb connection. How the Channex integration works: [Channex integration](../channex/README.md).

Channex's own step-by-step guide: [Airbnb mapping guide](https://docs.channex.io/channel-mapping-guides/airbnb).

## What is needed

- A listing that already exists on Airbnb. Channex cannot create Airbnb listings or change their content.
- The listing owner's Airbnb account. A co-host account cannot authorise the connection.
- No other software connected to the Airbnb account. Disconnect another PMS or channel manager first.
- The Domits listing mapped to a Channex property, room type and rate plan (Domits supports one of each per property).
- The Domits calendar confirmed by the host: after activation every open date is bookable on Airbnb.

## Steps

| Step | Who | Where |
|---|---|---|
| 1. Create or check the property, room type and rate plan in Channex production and save the mapping in Domits (a full sync follows) | Domits | Channex, Domits Channex diagnostics |
| 2. Create an Airbnb channel and log in to Airbnb to authorise Channex | Host, or Domits together with the host | Channex → Channels |
| 3. Map each Airbnb listing to the Channex room type and rate plan, activate | Domits | Channex → Channels |
| 4. Check prices and availability on Airbnb and the first booking in Domits | Domits | Airbnb, Domits |

Time: about 30–60 minutes for Domits, plus the host's login in step 2.

## Things to know

- Existing future Airbnb bookings are not imported (#3582). Block those dates in the Domits calendar before activating.
- Photos, descriptions, amenities and house rules stay managed on Airbnb. Channex can read listing details, but cannot change them.
- After activation, change prices and availability in Domits, not on Airbnb.
- Airbnb has no test environment: the connection can only be tested with a real listing.
