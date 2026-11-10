# Elite self-select list

`DIRECT_BOOKING_WEBSITE_ELITE_SELF_SELECT_ACCOUNT_IDS` decides which hosts can choose the Elite website plan themselves, without payment (#3099). `PropertyHandler` reads it on `GET` and `PATCH /property/website/rate-plan`, on every request.

## What it holds

Cognito `Username` values (the id PropertyHandler uses as the host id), separated by commas, semicolons or spaces. Matching is exact and case-sensitive. `*` means every host.

## Off by default

Missing or empty means off for everyone. The plan answer then has `eliteSelfSelectAvailable: false`, and a plan change works as before: Elite goes through the Stripe checkout, which answers `503` while checkout is off.

## What it changes for a listed host

- Only while his current plan has no Stripe subscription. A paid Elite keeps the Stripe paths, and the plan answer says `eliteSelfSelectAvailable: false`.
- `PATCH {"plan":"elite"}`: the current plan ends and an Elite plan at price 0 starts, in one transaction, without any Stripe call. Answer `upgraded`.
- `PATCH {"plan":"essentials"}`: the Elite plan ends and Essentials starts, in one transaction. Answer `downgraded`. The Elite features end with it; site settings are not touched.
- Choosing the plan he is on changes nothing (`unchanged`). Two requests at the same moment leave one current plan. A change that keeps conflicting with another request answers `409`, and so does a paid plan that started in between. A failed write leaves the plan as it was.
- The account always comes from the token, never from the request body.
- Taking an id off the list stops new choices only. An Elite chosen before stays until the host switches back to Essentials, which also works with the list empty.
- The plan card does not offer this option yet. Until it does, use the list only while checkout is off: with checkout on, the card's Elite button can be clicked under the paid price, and a listed host would get Elite without payment.

## Where it is set

On the `PropertyHandler` Lambda in `eu-north-1`. Acceptance and production share this function, so the list applies to both. It is a Lambda variable only: never put it in Amplify or in a `REACT_APP_*` variable.

## Changing it

`aws lambda update-function-configuration --environment` replaces every variable on the function. Read the current variables first, change this one, and write back the whole set, as in [Changing an environment variable](../../partner/integrations/channel_manager/channex/channex_production_switch_runbook.md#changing-an-environment-variable). A configuration change starts new Lambda environments, so the new list applies to every request once the update has finished.

## Never commit ids

Real user ids are set on the Lambda only. Code, tests, docs and pull requests use fake ids such as `host-1`.
