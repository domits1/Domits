# SiteMinder SiteConnect: gap analysis

| | |
|---|---|
| Issue | #638 (related: #635, #3380, #603) |
| Author | Nishchal Bhujel |
| Status | Draft, before any SiteConnect code. Nothing here is agreed with SiteMinder yet. |
| Sources | `developer.siteminder.com/siteconnect-api` (overview, integration requirements), the Channex design notes in `../channex/`, and the file names in `backend/functions/.shared/channelManagement/` and `backend/functions/SiteMinder-Integration/`. The Channex verdicts come from its design notes and file names. The Channex source was not read, so check them against the code before building on them. The SiteMinder facts come from a summary of the pages that a tool produced, not from the raw pages, so check them there too. |

## 1. Summary

#638 makes Domits a booking channel in SiteMinder's SiteConnect. The repository already has a production channel manager integration (Channex) and a first pmsXchange sender for SiteMinder. Much of the Channex machinery is reusable as a pattern, but SiteConnect runs in the opposite direction, so little of it can be reused as it is.

The most important finding is the direction of the calls. Per SiteMinder's documentation:

| Data | Direction in SiteConnect | Direction in Channex | Direction in pmsXchange (built) |
|---|---|---|---|
| Rooms and rates (what the channel sells) | SiteMinder retrieves them from Domits (who starts the call is not stated) | Domits sends | not used |
| Availability and restrictions | SiteMinder pushes to Domits | Domits pushes | Domits pushes |
| Rates | SiteMinder pushes to Domits | Domits pushes | not built |
| Reservations (new, modified, cancelled) | Domits pushes to SiteMinder | Channex sends, Domits pulls | not built |

So in SiteConnect Domits has to run a SOAP endpoint that SiteMinder calls, and it sends reservations out. The issue text says the opposite in sections 6.4 and 6.5 ("transmit rates and availability from Domits to SiteMinder", "receive reservations"). The issue should be corrected after SiteMinder confirms the flow.

## 2. What SiteMinder requires (from their public guides)

- SOAP 1.1 only, `text/xml; charset=utf-8`, minified UTF-8 XML, OTA 2003/05 namespace, `Version="1.0"`.
- Messages: `OTA_HotelAvailRQ` (rooms and rates), `OTA_HotelAvailNotifRQ` (inventory and restrictions), `OTA_HotelRateAmountNotifRQ` (rates). Reservations go to one global SiteMinder endpoint.
- HTTPS on 443, TLS 1.2 or higher, a valid certificate, a registered domain name (no IP address).
- Authentication: WS-Security UsernameToken, one credential set for all properties.
- `EchoToken` unique per request and echoed back. Reservation `UniqueID` must never be reused, even across properties. `HotelCode` must be unique per property per channel and must not change after go-live.
- Response time: ideally under 1 second, 20 seconds is a failsafe. Answer with `<Success/>` or `<Errors>` at once and do the work asynchronously.
- Capacity: 750 days of initial inventory, 365 days of ongoing updates, about 50% headroom.
- Mandatory: schema validation with SOAP faults, a persistent queue that prevents duplicate processing and shows depth and age, retry with exponential backoff (suggested 0, 5, 15, 30, 60 seconds), time zone and DST handling.
- Certification: all mandatory test scenarios, the Postman collections, load testing at production volume, failover and recovery tests. 90 days to fix non-compliance after notification, and a critical production issue can suspend the channel at once.
- Restrictions covered: stop sell, min and max stay on arrival, min and max stay through, CTA, CTD. Pricing: per day pricing and occupancy based pricing.

Not stated in the public pages and needed from SiteMinder: the full reservation reference, acknowledgement behaviour, WSDL or endpoint details, the mandatory test scenario list, and how a new channel applies.

## 3. Coverage of #638, section by section

Verdicts: **Reuse** (use as is), **Pattern** (copy the design, new code), **New** (nothing to build on), **Blocked** (needs SiteMinder's answer first).

| #638 section | What exists | Verdict | Notes |
|---|---|---|---|
| 6.1 Discovery and partnership | nothing in code | Blocked | Spec, sandbox, commercial terms and the room-model answer all come from SiteMinder |
| 6.2 Adapter, idempotency, retries, correlation ids | Channex: deterministic booking id from the reservation, per-revision error isolation, `integration_sync_state` locks, `ChannexSyncEvidence`. SiteMinder: `siteMinderSoapClient.js` (sends only), `otaXml.js` | Pattern | The new part is an inbound SOAP 1.1 server with WS-Security and schema validation. The existing client sends and cannot receive |
| 6.3 Property onboarding and mapping | Generic tables with a `channel` column: `ChannelIntegrationAccount`, `ChannelIntegrationProperty`, `ChannelIntegrationRoomType`, `ChannelIntegrationRatePlan`, `ChannelReservationLink`. Channex mapping logic in `channexMappingService.js` | Reuse (tables), Pattern (service) | `channel = 'SITEMINDER'` fits. The mapping rules differ: SiteMinder calls Domits with a `HotelCode` and room and rate codes that Domits must have published first |
| 6.4 Rates and availability | Channex outbox sends them. pmsXchange builders send availability and restrictions to SiteMinder | New (inbound) | In SiteConnect Domits receives them. The existing builders only help as examples of the XML shape. Open model question: see section 4 |
| 6.5 Reservation delivery | Channex webhook plus pull. Deterministic booking id, `ChannelReservationLink` | Pattern | Direction reversed: Domits pushes reservations to SiteMinder in real time. The public pages name no reservation message (`OTA_HotelResNotifRQ` appears there only for optional notification emails to hotels) |
| 6.6 Modifications and cancellations | Channex booking revisions (`ChannexBookingRevision`, `channexBookingRevisionImportService.js`) | Pattern | Domits sends modifications and cancellations. Needs a trigger from the Domits booking lifecycle |
| 6.7 Overbooking prevention | Channex writes the outbox row in the same transaction as the booking (design note D8) | Pattern | The same rule applies: no booking write without its outbound message in the same transaction |
| 6.8 Pricing, commission | nothing | Blocked | Commercial terms |
| 6.9 Security and data protection | Secrets Manager credential store, webhook secret check | Pattern | New: WS-Security UsernameToken validation, password policy (12 to 50 characters), optional IP allowlist, a WAF note for SiteMinder's fixed User-Agent |
| 6.10 Monitoring | Sync evidence, diagnostics service, the alarms in the Channex production switch runbook | Pattern | Queue depth and age are an explicit SiteMinder requirement |
| 6.11 Partner onboarding | Channex connect and map flow, host integrations page | Pattern | SiteMinder's flow starts on their side (the hotel enables the channel) |
| 6.12 Testing and certification | Channex certification (admin page and runbook) | Pattern | Needs SiteMinder's scenario list, the Postman collections and a load test |
| 6.13 Documentation | Channex doc set in `../channex/` | Pattern | This document is the first part |

What exists in `backend/functions/SiteMinder-Integration/` today (pmsXchange, Domits as the PMS): availability and restrictions message builders, an OTA XML helper, a SOAP client, and tests. Nothing calls the pushers, and the function has a `.deployment-disabled` file. It belongs to a different integration (see the issue's "Key architectural distinction") and is only a source of XML helpers here.

## 4. Open questions

For SiteMinder:

1. Is a whole-property vacation rental accepted as a "room type" with quantity 1? How do they treat one property sold as one unit?
2. Which flow applies to us: do they push availability, restrictions and rates to Domits, and do we push reservations to them? This is how the public guides read, and the issue says the opposite.
3. The reservation reference: message types, the acknowledgement format, the global endpoint, and whether modifications and cancellations use the same message.
4. The mandatory certification scenarios and the Postman collections.
5. Sandbox and credentials, and how a new channel applies.
6. Commission, payment collection and tax responsibility.
7. Whether occupancy based pricing is required or per day pricing is enough.

For the Domits team:

1. **Who is the source of truth for a SiteMinder property's availability and price?** In SiteConnect SiteMinder pushes ARI to Domits. Today the host's Domits calendar is the master (Channex design note D8). A SiteMinder listing needs a mode where the Domits calendar for that property is written by the inbound messages and read-only for the host. This touches PropertyHandler and the calendar UI.
2. Where does a SiteMinder property come from? Is it created in Domits by the host first, or created from SiteMinder's data?
3. One outbox for all channels (add a `channel` column to `channex_ari_outbox`, rename) or a separate table for SiteMinder? Recommendation: a separate table and worker. Channex is certified and live, and a migration of its outbox is the largest blast radius in this plan. Extract the pure parts (date merging, batching, backoff) into shared helpers when both exist.
4. Which Lambda hosts the endpoint: a new `SiteMinder-SiteConnect` function (recommended, because a SOAP endpoint with WS-Security and its own domain and certificate does not fit the Cognito-based `ChannelManagement` routes), or an extension of `ChannelManagement`?

## 5. Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| The room model does not fit | Everything in 6.3 to 6.7 depends on it | Ask first (question 1), build nothing before the answer |
| The issue describes the flow in the wrong direction | A plan built on it would build the wrong half | Confirm with SiteMinder and correct the issue |
| Response time of about 1 second | An endpoint that writes a year of calendar rows synchronously will not meet it | Answer `<Success/>` at once, queue the work, write in a worker |
| A critical issue can suspend the channel | Production incidents have a contractual cost | Alarms on queue age before go-live |
| Domits is not the source of truth | A host edit in Domits could be overwritten by SiteMinder, or the other way round | Decide question 1 before building the endpoint |

## 6. Proposed order of work

1. Contact SiteMinder's Partner Integrations team with the questions in section 4. This has the longest lead time and gates everything else.
2. Correct the issue text for the flow direction once SiteMinder answers.
3. Decision records for the four Domits-side questions in section 4.
4. A thin end-to-end slice, riskiest part first: the endpoint accepts a signed `OTA_HotelAvailNotifRQ`, validates it, answers `<Success/>`, and queues the work. No calendar writes yet.
5. Mapping and the calendar write path.
6. Reservation push, modifications and cancellations.
7. Monitoring, load test, certification.

## 7. Not in scope here

- The pmsXchange integration (#603, #3380). It stays as it is and gets its own Lambda handler and trigger separately.
- Changes to Channex code. Nothing in this plan edits the certified integration.
- Commercial terms with SiteMinder.
