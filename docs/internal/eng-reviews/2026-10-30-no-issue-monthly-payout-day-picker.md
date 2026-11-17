# fix(finance): clamp monthly payout forecasts and add a recurring day picker

Pull request: #3739
Issue: No issue number was supplied for this task
Reviewed commit: acceptance base e96c35c; implementation diff reviewed before commit
Result: No blocking findings; automated checks pending

## Findings

No blocking findings.

## What already exists

- `RefreshFunctions` already loads and saves `monthly_anchor` through the existing Stripe payout-schedule API.
- `stripePayoutsService.getForecastFromBalance` already forecasts the next automatic payout from the connected account's Stripe schedule.
- The change keeps the existing API contract and reuses the existing state, save handler, loading guard, and toast feedback.

## Failure modes

- A missing or invalid Stripe monthly anchor produces no forecast instead of an invalid date. Unit tests cover invalid anchors and invalid dates.
- A payout day from 29 to 31 in a shorter month is clamped to that month's final day. Unit tests cover February in leap and non-leap years, November, and year rollover.
- If saving the selected day fails, the existing handler shows an error toast and reloads the persisted Stripe schedule. No new persistence path is introduced.
- While the payout schedule is loading or Stripe is disconnected, the day picker is disabled.

## Data flow

```text
Host selects a recurring day
        ▼
MonthlyPayoutDayPicker radio grid
        ▼
RefreshFunctions monthly_anchor state
        ▼
Existing save handler
        ▼
Stripe settings.payouts.schedule.monthly_anchor

Stripe schedule
        ▼
getForecastFromBalance
        ▼
getNextMonthlyPayoutDate
        ▼
Forecast using the last day of shorter months
```

## Not in scope

- Daily, weekly, and manual payout behavior.
- Changing Stripe's payout-schedule API contract.
- A one-time calendar date or payout-time selector.
- Screenshots and local browser/responsive verification; these require the application environment.
