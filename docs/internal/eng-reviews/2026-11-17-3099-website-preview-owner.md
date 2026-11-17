# #3099 Show the website preview to the host who owns the draft

Pull request: `website-preview-owner`, from `acceptance`.
Issue: #3099
Reviewed: before the commit, then the change as a whole, then each guard broken on purpose.

`GET /property/website/preview?draft=<draftId>` now needs the logged-in host who owns the draft: the host comes from the token (`authorizeGroupRequest`), the draft must belong to that host, and the host must still own the listing (`authorizeOwnerRequest`). The answer sends the listing through `toPublicWebsitePropertySnapshotView`, the same view as the live render, read with the public location, and adds the same `host` block as the live render. The preview page sends the host session (`fetchWithWebsiteSession`) and builds the host profile from that block, as the live site does.

| Request | Answer |
|---|---|
| No or invalid login | 401; the page asks to log in as the host |
| Draft of another host, suspended or missing | 404 "Website preview not found.", nothing read |
| Listing of the draft deleted | 404 |
| Listing no longer owned by the host | 403; the page asks to log in as the host |
| The owner | 200: draft, listing through the public view, host block |

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P2 (7/10) | API Gateway, `OPTIONS /property/website/preview` | The preview now sends `Authorization`, so the browser asks `OPTIONS` first. Before this change it was a plain GET. | Checked 17 Nov, read only: the resource (`Property-API-Develop`, `6pfkmx`) has `OPTIONS` as a MOCK with `Access-Control-Allow-Headers: 'Content-Type,Authorization'`, the same as `/property/website/draft`, and a live preflight answers 200 with that header. No API Gateway change needed. |
| P3 (8/10) | deploy order | The Lambda and the web app deploy separately. Between the two, the old page sends no token and gets 401. | Accepted: the preview is a host tool and the gap is the time between the two deploys. |
| P4 (8/10) | `WebsitePublicPreviewPage.jsx` | The host profile now comes from the backend block instead of a lookup by host id. | Same as the live site; tested. |

Second review: no defect in this change. It removed one unreachable check (`fetchWithWebsiteSession` never answers 401; it throws, and that is mapped to the login message), and confirmed that the editor reads listings through `/hostDashboard/single`, not this route. Two points outside this change: the public render still sends the full address on `acceptance` (fixed by #3933), and the public analytics event answers 204 or 404 for any draft or site id (raised with Karim).

## Not in scope

- Other website routes without a login: quote, resolve, render, the analytics event, the Stripe webhook and the booking request in General-Bookings. Checked; none sends listing data outside the public views.
