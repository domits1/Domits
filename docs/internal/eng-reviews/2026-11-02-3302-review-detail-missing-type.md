# Review detail 500 for a listing without a property type

Issue: #3302 (reviewer finding on #3703)
Target: uncommitted working-tree diff on `fix/3302-review-detail-missing-type`
Result: no BLOCK, no FIX NOW, two FOLLOW-UP

## Verdict

```
BLOCK       none
FIX NOW     none
FOLLOW-UP   2
```

## Change

`backend/functions/PropertyHandler/business/service/propertyService.js:681` reads `propertyType?.property_type` instead of `propertyType.property_type`:

```js
propertyType?.property_type === "Boat" || propertyType?.property_type === "Camper"
```

The repository already returns `null` for a missing row (`data/repository/propertyTypeRepository.js:29`: `return result ? TypeMapping.mapDatabaseEntryToType(result) : null;`), so the unguarded read was the only crash site. A missing type now yields `technicalDetails: null` and `getTechnicalDetails` is not called.

New test: `backend/test/PropertyHandler/propertyService.fullPropertyAttributes.test.js` (missing type `undefined`/`null`, House, full-location variant).

Mutation check: reverting the optional chaining fails 3 of 6 tests; restoring the file gives an identical sha256 and 6 of 6 pass.

## Findings

### [FOLLOW-UP] (confidence: 8/10) `backend/functions/PropertyHandler/business/service/propertyService.js:696`: the response now carries `propertyType: null`

```js
      propertyType: propertyType,
```

Previously a listing without a type could never be served, so no consumer ever saw `propertyType: null`. The backend controller does not read it (no `propertyType.` access in `controller/`). The web frontend reads it only behind a default: `hostPropertyUtils.js:724` (`data?.propertyType || {}`), `websiteListingChange.js:38` (`propertyDetails?.propertyType || {}`), `buildWebsiteTemplateModel.js:527` (`propertyDetails?.propertyType?.spaceType`). Mobile (`frontend/app/Domits/src`) has no read of the fetched full-property response: its `propertyType.property_type` and `propertyType.spaceType` reads (`OnboardingType.js:46,70,74`, `OnboardingSpace.js:9`, `OnboardingCheck.js:110-111`, `HostOnboarding.js:139`, `OnboardingBoatSpace.js`, `OnboardingCamperSpace.js`, `OnboardingAnySpace.js`) are onboarding form state initialised from `propertyFormDataTemplate.js:73`, and `listingDetails.json` is a test fixture.

Not blocking: no concrete defect, and no consumer reads the fetched response without a default.

### [FOLLOW-UP] (confidence: 6/10) `backend/functions/PropertyHandler/business/service/propertyService.js:589`: `getFullPropertiesByHostId` passes the list row to `getFullPropertyAttributes`

```js
return await Promise.all(propertyIdentifiers.map(async (property) => this.getFullPropertyAttributes(property)));
```

Other callers pass an id string. If `getPropertiesByHostId` returns objects, every per-property getter receives an object. This could be a false positive (the repository return shape was not read), and it is outside this diff. Unrelated to #3302.

## What already exists

- `getCardPropertyAttributes` (`propertyService.js:610`) already tolerates a null `propertyType` because it only forwards it.
- `buildCheckInFromRules` (`propertyService.js:927`) already guards null `rules`.
- `getFullPropertyByBookingId`, `getFullPropertyByIdAsHost`, `getFullPropertyForReview` and `getFullActivePropertyById` all funnel through `getFullPropertyAttributesInternal`, so one guard fixes the review-detail, public listing, host single and booking routes.

## Failure modes

```
getFullPropertyAttributesInternal
        │
        ▼
getPropertyType ──▶ null (row missing)
        │
        ▼
propertyType?.property_type ──▶ undefined ──▶ technicalDetails = null
```

| Path | Failure | Test | Handling | User sees |
|---|---|---|---|---|
| missing type row | `propertyType` null | yes (`undefined`, `null`) | optional chaining | listing loads, no technical details |
| other type (House) | `getTechnicalDetails` must not run | yes | unchanged | `technicalDetails: null` |
| technical-details listing that lost its type row | technical details silently omitted | no | none | listing without technical details, no error |

The last row is the accepted trade-off of this fix. It is silent, but it degrades one section instead of failing the whole response, and it is not a critical gap.

## Not in scope

- Frontend changes: every web read found is already guarded; recorded in the PR description.
- Making `propertyType` mandatory at write time (builder or migration backfill): would be the root-cause fix for orphan listings, but is a data-integrity decision, not a review-detail fix.
- Guards for `location`, `pricing` and `generalDetails`: they are only forwarded into the response, never dereferenced in this function.
- Mobile consumers of `propertyType`: searched, none read the API response.

## Test quality

All six tests exercise one responsibility each and fail under the mutation. The service is built with stubbed getters, the same style as `propertyService.getFullPropertyByBookingId.test.js`.
