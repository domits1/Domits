# Remove duplicate VAT rates file

Pull request: #3754
Issue: None
Reviewed commit: 6632eca (the proposed one-file deletion; the final PR commit also adds this review record)
Result: no blocking findings

## Findings

No findings.

## What already exists

The canonical module `frontend/web/src/utils/CountryVATRatesAndTouristTaxes.js` already provides both `vatRates` and `touristTaxRates`.

The two active consumers use that canonical module:

- `frontend/web/src/features/hostdashboard/hostpricing/components/TaxFeePopup.js:3`
- `frontend/web/src/features/bookingengine/ListingDetails.js:91`

The duplicate `CountryVATRatesAndTouristTaxes 2.js` has the same Git blob SHA as the canonical module and no active import references.

```text
TaxFeePopup.js ---------┐
                        ├──> CountryVATRatesAndTouristTaxes.js
ListingDetails.js ------┘

CountryVATRatesAndTouristTaxes 2.js  -> removed (identical, unused)
```

## Failure modes

- An overlooked static import of the duplicate could break the frontend build. Repository-wide code search found no such import; the PR build check is the final validation.
- No new runtime path is introduced. Both existing consumers continue to use the canonical module.

## Not in scope

- Updating VAT or tourist-tax values.
- Changing the canonical module or its consumers.
- Consolidating separate tax-related logic.
