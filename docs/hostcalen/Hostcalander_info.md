## Core functionality

Views: Month (implemented), Week/Day placeholders ready to extend.
Navigation: Today / Prev / Next month.
Selection: Click a cell → toggle available ↔ blocked.
Click-drag over cells → create a range selection (stored as available in state by default).
Statuses: booked, available, blocked, maintenance.
Pricing: Enter a euro value → Set price applies to the last selection (or any bucket if you adjust the handler).
Legend & Stats: Visual key + simple counts for quick feedback.
APIs: 
  1. Get all proporty 
  URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property
    
    
  2. Get all your own properties (filtered by Authorization header (AccessToken))
  URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all

{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}