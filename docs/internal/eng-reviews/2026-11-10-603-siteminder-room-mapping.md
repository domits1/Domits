# feat: link one SiteMinder room type to one Domits property #603

Pull request: not opened yet (branch `feature/603-siteminder-room-mapping`, on `acceptance`)
Issue: #603
Reviewed commit: d0b3f6157
Result: no blocking findings. Each commit was reviewed as a staged diff before it was made, then the branch against `acceptance`.

Decided with Stefan on 9 November 2026: one SiteMinder room type (for example one villa) is one Domits property, a multi-room reservation becomes one Domits booking per room, and such reservations are never refused. #3701 linked a whole SiteMinder hotel to one Domits property, which would turn two rooms into two bookings on the same Domits property. This pull request changes the link before reservations are saved.

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P3 (7/10) | backend/functions/SiteMinder-Integration/business/siteMinderMappingService.js `#deactivateRemoved` | When a Domits property moves from a room in hotel A to a room in hotel B, only its old rows in hotel B are switched off; its room in hotel A stays active. | Accepted for now: a host has one SiteMinder hotel in practice, and moving a property to another hotel is rare. Follow-up: switch off every other room of the property, in any hotel. |
| P3 (6/10) | backend/functions/SiteMinder-Integration/business/siteMinderInventoryService.js `#mapping` | The ARI check accepts the room types of every Domits property of the host in the hotel, so availability for villa A could also carry villa B. | Accepted: it stays within one host's SiteMinder account; a room of another host or another channel is still refused (tests). Which room belongs to which property is decided by the link. |
| P4 (5/10) | backend/functions/SiteMinder-Integration/business/siteMinderMappingService.js `#checkRoomIsFree` | Two links made at the same moment can both pass the check. | Accepted: a manual action of one host, rare. |
| P4 (8/10) | backend/functions/SiteMinder-Integration/business/siteMinderMappingService.js | `syncHotel` is gone. | Accepted: nothing called it yet (no handler or route exists). |

## Failure modes

| Code path | Realistic failure | Test | Handling | Visible to the user |
|---|---|---|---|---|
| `syncRoomType` | the room is already linked to another Domits property | yes | `SITEMINDER_ROOM_TYPE_ALREADY_MAPPED`, SiteMinder is not called | yes, an error |
| `syncRoomType` | the hotel belongs to another host | yes | `SITEMINDER_HOTEL_ALREADY_MAPPED` | yes |
| `syncRoomType` | the room type does not exist at SiteMinder | yes | `SITEMINDER_ROOM_TYPE_NOT_FOUND`, nothing stored | yes |
| `syncRoomType` | the property moves to another room | yes | old room and its rate plans set to `INACTIVE` | no, it just stops being a target |
| ARI | availability for two villas of one hotel in one message | yes | both accepted | no |

## What already exists

- The `channel_integration_*` tables already key room types and rate plans by Domits property, so no migration is needed.
- `#deactivateRemoved`, `#checkOwner` and `#account` from #3701 are reused.

## Not in scope

- Finding the Domits property for a room of an incoming reservation: the step that saves reservations.
- Building availability as 1 or 0 from the calendar of the Domits property: not built yet, noted in the docs.
- A route or screen for the host to link a room.
