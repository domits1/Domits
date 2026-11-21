# #3099 Only include the WhatsApp contact when the widget is enabled

Pull request: `website-whatsapp-widget-setting`, from `acceptance`.
Issue: #3099
Reviewed: before the commit, then the change as a whole, then each guard broken on purpose.

The host block of the public render (`GET /property/website/public/render`) carries the host's WhatsApp number from the connected WhatsApp integration. It now carries it only when the site's "Show WhatsApp widget" setting (`visibility.chatWidget` in the served content overrides) is on. The setting stays on by default, as the editor and the template model treat it: only an explicit `false` turns it off. With the widget off, `host.whatsapp` is the empty block (`isAvailable: false`, no number); the name and photo stay. The quote panel's "Contact the host" link follows the same setting; the floating widget already did.

| Site setting | Render `host.whatsapp` | Quote panel link |
|---|---|---|
| `chatWidget: false` | empty, no number | none |
| `chatWidget: true` | the number | WhatsApp link |
| not set, or not a boolean | the number, as today | WhatsApp link, as today |

Existing sites with the setting on or not set answer byte for byte as before (render pin unchanged).

## Findings

| Severity | Where | Finding | Decision |
|---|---|---|---|
| P4 (7/10) | `websitePublicHostService.js` | The number is still read from the integration and cached per host, also for a site that will not show it. | Accepted: the cache is per host and one host can have sites with the setting on and off. The number is dropped before the answer leaves the Lambda. |

## Not in scope

- The default of the setting: stays on (Karim, 17 Nov).
- The editor preview: it shows the draft to its own host.
- Static pages: they carry no host block.
