# Calendar Data Storage

This directory stores calendar data (pricing, blocked dates, maintenance) in JSON format.

## File Format

Each property has its own JSON file named `{propertyId}.json` with the following structure:

```json
{
  "blocked": [
    "2025-01-15",
    "2025-01-16"
  ],
  "maintenance": [
    {
      "date": "2025-01-20",
      "note": "Plumbing repair scheduled"
    },
    {
      "date": "2025-01-21",
      "note": "Deep cleaning"
    }
  ],
  "prices": {
    "2025-02-14": 250,
    "2025-02-15": 250,
    "2025-12-25": 500
  },
  "lastUpdated": "2025-01-15T10:30:00Z",
  "propertyId": "property-123"
}
```

## Usage

1. Start the calendar data server:
   ```bash
   cd frontend/web
   node calendar-data-server.js
   ```

2. The server will run on `http://localhost:3001`

3. Data is automatically saved when you make changes in the calendar UI

## Git

These JSON files can be committed to Git, allowing other developers to see the same calendar data when they run the application.
