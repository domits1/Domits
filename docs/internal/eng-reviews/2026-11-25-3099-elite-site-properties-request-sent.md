# #3099 Show the request sent page of an Elite website

Branch: `elite-site-properties-request-sent`, on `elite-site-properties-request-page`. Issue: #3099. Reviewed before every commit, each guard broken on purpose, then a second review.

```
request page ── send ok ──▶ navigate(/properties/<slug>/sent, replace, state: reference and dates)
                                   │
       history: property page ◀────┘ (the request page is gone, so back cannot send again)

/properties/<slug>/sent ─▶ state with a reference and dates? ─yes─▶ sent page
                                                              └no──▶ "No request to show", nothing claimed either way
```

| Risk | Where it is closed |
|---|---|
| The sent page opened directly, in a new tab or from a bookmark | No router state, so it says the page shows a request only right after sending and that the email has the details, without claiming whether anything was sent, and links back to the property and the overview. Nothing is read or sent. |
| A reload of the sent page | The browser keeps the router state of the entry, so the same page shows again; nothing is sent. |
| The back button sending the request again | The sent page replaces the request page in the history, so back leads to the property page. The request page never sends on its own. |
| Guest data in the history | Only the reference and the dates are kept in the state, no name or email. |
| The live view | The sent address and its links keep `?siteId=`. |

Not closed: a guest who goes back to the property page and sends the same stay again on purpose makes a second request, because the key per stay is cleared after a success.

Guards broken on purpose: 6 of 6 caught. Second review: the empty page said nothing was sent, which is false for a guest who opens the address again in a new tab (fixed); the live view test now sends from the request page, and the reload test restores the state through the browser history as a reload does.

The dates are written with the year: "15 to 22 January 2027", "28 January to 3 February 2027", "30 December 2026 to 2 January 2027". A state whose dates are not `YYYY-MM-DD` counts as no request.
