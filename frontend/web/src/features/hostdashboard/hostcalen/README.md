# Host Calendar Feature - Implementation Guide

## Overview
The Host Calendar is a fully functional calendar management system that allows hosts to:
- View bookings for their properties
- Set dynamic pricing for specific dates
- Block dates for unavailability
- Mark dates for maintenance
- Track availability statistics

## Features Implemented

### 1. Property Selection
- Dropdown in the toolbar to select which property to manage
- Auto-selects the first property when loaded
- Fetches properties from the existing API endpoint

### 2. Dynamic Pricing
- Set custom prices for selected dates
- Input price in the "Add Price" card
- Select dates on the calendar (click or drag)
- Click "Set price" to apply
- Prices are displayed on each calendar day

### 3. Availability Management
- **Block dates**: Mark dates as unavailable for booking
- **Maintenance**: Mark dates for property maintenance
- **Undo**: Revert all unsaved changes back to server data

### 4. Calendar View
- Month view with color-coded date states:
  - **Blue**: Booked (from existing bookings)
  - **Green**: Available
  - **Red**: Blocked
  - **Amber**: Maintenance
- Click dates to toggle their state
- Drag to select multiple dates

### 5. Statistics Panel
Shows counts for the last 8 weeks:
- Booked days
- Blocked days
- Maintenance days
- Available days

### 6. Save Changes
- Tracks all pending changes (pricing, availability)
- "Save Changes" button appears when there are unsaved changes
- Saves all changes to the backend in one operation

## File Structure

```
hostcalendar/
├── HostCalendar.jsx              # Main calendar component
├── HostCalendar.scss             # Styling
├── components/
│   ├── Toolbar.jsx               # Navigation and property selection
│   ├── Legend.jsx                # Color legend
│   ├── CalendarGrid.jsx          # Calendar grid display
│   ├── StatsPanel.jsx            # Statistics display
│   └── Sidebar/
│       ├── AvailabilityCard.jsx  # Availability controls
│       ├── PricingCard.jsx       # Pricing controls
│       └── ExternalCalendarsCard.jsx
├── services/
│   └── calendarService.js        # API service layer
└── utils/
    ├── date.js                   # Date utilities
    ├── classNames.js             # CSS helper
    └── getAccessToken.js         # Auth token helper
```

## API Endpoints Used

### Existing Endpoints:
1. **Get Properties by Host**
   - `GET /property/bookingEngine/byHostId?hostId={hostId}`
   - Returns list of host's properties

2. **Get Property Details**
   - `GET /property/hostDashboard/single?property={propertyId}`
   - Returns property details including availability and pricing

3. **Get Bookings**
   - `GET /bookings?readType=propertyId&propertyId={propertyId}`
   - Returns all bookings for a property

### NEW Endpoints Required (Backend):
The following endpoints need to be created on the backend:

1. **Update Property Availability**
   ```
   PUT /property/availability
   Body: {
     propertyId: string,
     availability: {
       blocked: string[],      // Array of date keys (YYYY-MM-DD)
       maintenance: string[]   // Array of date keys (YYYY-MM-DD)
     }
   }
   ```

2. **Update Property Pricing**
   ```
   PUT /property/pricing
   Body: {
     propertyId: string,
     pricing: {
       "2024-12-25": 150,    // Date key: price mapping
       "2024-12-26": 150,
       ...
     }
   }
   ```

## Data Flow

1. **Load Calendar**:
   - User logs in → Auth token retrieved
   - Fetch host's properties
   - Auto-select first property
   - Fetch property details (availability + pricing)
   - Fetch property bookings
   - Process and display on calendar

2. **User Interactions**:
   - Click dates → Toggle state (available/blocked/maintenance)
   - Input price + select dates → Set custom price
   - Click "Block dates" → Mark selected dates as blocked
   - Click "Maintenance" → Mark selected dates for maintenance
   - Click "Undo" → Revert to server data

3. **Save Changes**:
   - Track all changes in `pendingChanges` state
   - Click "Save Changes" button
   - Call API to save availability and pricing
   - Clear pending changes
   - Show success/error message

## State Management

### Main State Variables:
- `selectedPropertyId`: Currently selected property
- `propertyDetails`: Full property data from API
- `bookings`: Array of bookings for the property
- `selections`: Object with Sets for each date state (booked, available, blocked, maintenance)
- `prices`: Object mapping date keys to prices
- `pendingChanges`: Tracks unsaved changes

## Usage Instructions

### For Users (Hosts):
1. Navigate to `/hostdashboard/calendar`
2. Select your property from the dropdown
3. View current bookings (blue) and availability (green)
4. To block dates:
   - Click/drag to select dates
   - Click "Block dates" button
5. To set pricing:
   - Enter price in the "Price €" field
   - Click/drag to select dates
   - Click "Set price" button
6. Click "Save Changes" to persist your updates
7. Click "Undo" to revert unsaved changes

### For Developers:

#### Adding New Features:
```javascript
// In HostCalendar.jsx

// Add new state
const [newFeature, setNewFeature] = useState(initialValue);

// Add new handler
const handleNewFeature = () => {
  // Your logic here
};

// Pass to child components
<ChildComponent onNewFeature={handleNewFeature} />
```

#### Modifying Date Processing:
```javascript
// In processBookingsIntoCalendar function
// Add custom logic for processing dates
if (customCondition) {
  newSelections.customState.add(key);
}
```

## Backend Requirements

To fully activate this calendar, the backend team needs to:

1. **Create Database Tables** (if not exists):
   - `calendar_availability` table:
     - property_id (varchar)
     - date (date)
     - status (enum: available, blocked, maintenance)

   - `calendar_pricing` table:
     - property_id (varchar)
     - date (date)
     - price (decimal)

2. **Implement PUT endpoints**:
   - `/property/availability` - Save blocked/maintenance dates
   - `/property/pricing` - Save custom pricing per date

3. **Update GET endpoints** (if needed):
   - Ensure `/property/hostDashboard/single` returns all availability and pricing data

## Testing Checklist

- [ ] Property dropdown loads and displays all host properties
- [ ] Calendar loads with correct current month
- [ ] Existing bookings appear as blue (booked)
- [ ] Can click dates to select them
- [ ] Can drag to select multiple dates
- [ ] "Block dates" button marks dates as red (blocked)
- [ ] "Maintenance" button marks dates as amber (maintenance)
- [ ] Price input accepts numeric values
- [ ] "Set price" applies price to selected dates
- [ ] Prices display on calendar dates
- [ ] "Undo" reverts all unsaved changes
- [ ] "Save Changes" button appears when there are pending changes
- [ ] Statistics panel shows correct counts
- [ ] Month navigation (prev/next) works correctly

## Known Limitations

1. **Backend Endpoints**: The save functionality requires new backend endpoints to be created
2. **Week/Day View**: Currently only month view is implemented (week/day are placeholders)
3. **External Calendars**: The external calendars card is a placeholder
4. **Date Range Selection**: Currently supports single date and drag selection
5. **Validation**: Price validation is basic (checks for number and >= 0)

## Future Enhancements

1. **Advanced Pricing**:
   - Seasonal pricing templates
   - Weekend vs weekday pricing
   - Length-of-stay discounts

2. **Bulk Operations**:
   - Select entire week/month
   - Apply pricing rules to multiple properties

3. **Import/Export**:
   - Sync with external calendar services (Airbnb, Booking.com)
   - iCal import/export

4. **Analytics**:
   - Occupancy rate trends
   - Revenue projections
   - Competitive pricing suggestions

5. **Notifications**:
   - Alert when availability changes
   - Remind about maintenance dates

## Support

For issues or questions:
1. Check console for error messages
2. Verify API endpoints are accessible
3. Ensure user has proper authentication
4. Check that property data structure matches expected format

## API Response Formats

### Expected Property Details Format:
```json
{
  "property": {
    "id": "prop-123",
    "title": "Beautiful Beach House"
  },
  "propertyAvailability": [
    {
      "availableStartDate": 1703980800000,
      "availableEndDate": 1735603200000
    }
  ],
  "propertyPricing": {
    "roomRate": 100,
    "cleaning": 50
  }
}
```

### Expected Bookings Format:
```json
[
  {
    "id": "booking-456",
    "checkInDate": "2024-12-20",
    "checkOutDate": "2024-12-25",
    "propertyId": "prop-123"
  }
]
```

## Version History

- **v1.0.0** (Current): Initial implementation with core features
  - Property selection
  - Dynamic pricing
  - Availability management
  - Statistics display
  - Save/undo functionality
