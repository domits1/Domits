# Automated Messaging API

## Description
The Automated Messaging API provides smart, event-driven message delivery within the Domits messaging ecosystem. It automatically sends contextual messages to guests and hosts based on booking events, property interactions, and predefined triggers.

## Metadata
**Lambda Function:** UnifiedMessaging

**Related Issue:** [#767 - Messaging Unified Inbox Airbnb](https://github.com/domits1/Domits/issues/767)

**Status:** **In Development** - Infrastructure exists, automation features need implementation

**Branch:** `feature/767-messaging-unified-inbox-airbnb`

**Implementation Status:** 
- ✅ Basic messaging infrastructure (WebSocket, manual messages)
- ❌ Automated message triggers and templates
- ❌ EventBridge integration for booking events
- ❌ Message scheduling and queuing system

**Last Updated:** December 30, 2025

## Working Endpoints

| Method | Description | Auth Required | Endpoint | Trigger Event |
|--------|-------------|---------------|----------|---------------|
| POST | Send automated message | System | `/send` | Booking confirmation |
| POST | Send automated message | System | `/send` | Check-in instructions |
| POST | Send automated message | System | `/send` | Wi-Fi credentials |
| POST | Send automated message | System | `/send` | Check-out reminders |
| POST | Send automated message | System | `/send` | Payment notifications |
| GET | Retrieve message threads | Yes | `/threads` | User request |
| GET | Retrieve message history | Yes | `/messages` | User request |

## Security & Authorization

### Authentication
- **System Messages**: Internal service-to-service authentication using AWS IAM roles
- **User Messages**: JWT token validation required in `Authorization` header
- **API Gateway**: Request validation and rate limiting enabled

### Authorization Levels
- **System**: Full access to send automated messages
- **Host**: Can view messages for their properties and guests
- **Guest**: Can view messages related to their bookings
- **Admin**: Full read/write access across all conversations

## Automated Message Types & Logic

### 1. Booking Confirmation Messages
**Trigger:** New booking created with status `confirmed`
**Recipients:** Guest + Host
**Timing:** Immediate upon booking confirmation

```json
{
  "messageType": "booking_confirmation",
  "isAutomated": true,
  "template": "booking_confirmation_guest",
  "variables": {
    "guestName": "John Doe",
    "propertyName": "Cozy Downtown Apartment",
    "checkInDate": "2025-01-15",
    "checkOutDate": "2025-01-20",
    "totalAmount": "€450.00"
  }
}
```

### 2. Check-in Instructions
**Trigger:** 24 hours before check-in date
**Recipients:** Guest
**Timing:** Scheduled via EventBridge

```json
{
  "messageType": "checkin_instructions",
  "isAutomated": true,
  "template": "checkin_guide",
  "variables": {
    "propertyAddress": "123 Main Street, Amsterdam",
    "keyBoxCode": "1234",
    "hostContact": "+31 6 12345678"
  }
}
```

### 3. Wi-Fi Credentials
**Trigger:** Day of check-in
**Recipients:** Guest
**Timing:** 10:00 AM on check-in date

```json
{
  "messageType": "wifi_credentials",
  "isAutomated": true,
  "template": "wifi_info",
  "variables": {
    "networkName": "DomitsGuest_123",
    "password": "Welcome2025!",
    "additionalInfo": "Network works throughout the entire apartment"
  }
}
```

### 4. Check-out Reminders
**Trigger:** Day before check-out
**Recipients:** Guest
**Timing:** 18:00 PM (6 PM) day before departure

```json
{
  "messageType": "checkout_reminder",
  "isAutomated": true,
  "template": "checkout_instructions",
  "variables": {
    "checkOutTime": "11:00 AM",
    "keyReturnInstructions": "Please leave keys in the key box",
    "specialInstructions": "Please start dishwasher before leaving"
  }
}
```

## Class Diagram

```mermaid
classDiagram
    class AutomatedMessage {
        +string id
        +string messageType
        +boolean isAutomated
        +string template
        +object variables
        +string recipientId
        +string senderId
        +timestamp scheduledAt
        +timestamp sentAt
        +string status
        +number retryCount
    }

    class MessageTemplate {
        +string id
        +string name
        +string subject
        +string content
        +string[] requiredVariables
        +string language
        +boolean active
        +timestamp createdAt
        +timestamp updatedAt
    }

    class BookingEvent {
        +string bookingId
        +string eventType
        +string propertyId
        +string hostId
        +string guestId
        +timestamp checkInDate
        +timestamp checkOutDate
        +string status
        +object metadata
    }

    class MessageQueue {
        +string messageId
        +string priority
        +timestamp scheduledFor
        +number retryCount
        +string status
        +object payload
    }

    class UnifiedMessage {
        +string id
        +string senderId
        +string recipientId
        +string text
        +string[] fileUrls
        +boolean isAutomated
        +string messageType
        +timestamp createdAt
        +string channelId
    }

    class MessageController {
        +MessageService messageService
        +sendMessage(event)
        +getThreads(event)
        +getMessages(event)
    }

    class MessageService {
        +AutomationService automationService
        +sendMessage(payload)
        +processAutomatedMessage(event)
        +scheduleMessage(message, delay)
    }

    class AutomationService {
        +TemplateService templateService
        +QueueService queueService
        +processBookingEvent(event)
        +generateMessage(template, variables)
        +scheduleDelivery(message, timing)
    }

    BookingEvent --> AutomationService : triggers
    AutomationService --> MessageTemplate : uses
    AutomationService --> MessageQueue : schedules
    MessageQueue --> UnifiedMessage : creates
    MessageController --> MessageService : delegates
    MessageService --> AutomationService : processes
    AutomatedMessage --> MessageTemplate : references
    AutomatedMessage --> UnifiedMessage : becomes
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Booking as Booking Service
    participant EventBridge as AWS EventBridge
    participant Lambda as UnifiedMessaging Lambda
    participant Automation as AutomationService
    participant Template as TemplateService
    participant Queue as MessageQueue
    participant WebSocket as WebSocket API
    participant Guest as Guest Client

    Booking->>EventBridge: Booking confirmed event
    EventBridge->>Lambda: Trigger automated message
    Lambda->>Automation: Process booking event
    Automation->>Template: Get message template
    Template-->>Automation: Return template + variables
    Automation->>Queue: Schedule message delivery
    Queue->>Lambda: Execute scheduled message
    Lambda->>WebSocket: Send message payload
    WebSocket->>Guest: Deliver real-time message
    Guest-->>WebSocket: Acknowledge receipt
```

## Request Examples

### POST /send (Automated Message)
```json
{
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer system_service_token"
  },
  "body": {
    "messageType": "booking_confirmation",
    "isAutomated": true,
    "recipientId": "guest_123",
    "senderId": "system",
    "template": "booking_confirmation_guest",
    "variables": {
      "guestName": "Sarah Johnson",
      "propertyName": "Modern Canal House",
      "checkInDate": "2025-02-01",
      "checkOutDate": "2025-02-05",
      "totalAmount": "€680.00",
      "bookingReference": "DMT-2025-001234"
    },
    "scheduledAt": "2025-01-15T10:00:00Z"
  }
}
```

### GET /threads (Message Threads)
| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `userId` | User requesting threads | ✅ | `userId=guest_123` |
| `limit` | Max threads to return | ❌ | `limit=20` |
| `offset` | Pagination offset | ❌ | `offset=0` |
| `includeAutomated` | Include automated messages | ❌ | `includeAutomated=true` |

### GET /messages (Message History)
| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `userId` | User requesting messages | ✅ | `userId=guest_123` |
| `recipientId` | Other party in conversation | ✅ | `recipientId=host_456` |
| `limit` | Max messages to return | ❌ | `limit=50` |
| `before` | Messages before timestamp | ❌ | `before=1735574400000` |
| `messageTypes` | Filter by message types | ❌ | `messageTypes=booking_confirmation,checkin_instructions` |

## Message Templates

### Template Structure
```json
{
  "id": "booking_confirmation_guest",
  "name": "Booking Confirmation - Guest",
  "subject": "Your Domits booking is confirmed! 🎉",
  "content": "Hi {{guestName}}!\n\nGreat news - your booking for {{propertyName}} is confirmed!\n\n📅 Check-in: {{checkInDate}}\n📅 Check-out: {{checkOutDate}}\n💰 Total: {{totalAmount}}\n📋 Reference: {{bookingReference}}\n\nWe'll send you check-in instructions 24 hours before your arrival.\n\nHave questions? Just reply to this message!\n\nWelcome to Domits! 🏠",
  "requiredVariables": ["guestName", "propertyName", "checkInDate", "checkOutDate", "totalAmount", "bookingReference"],
  "language": "en",
  "active": true
}
```

### Available Templates
- `booking_confirmation_guest` - Booking confirmation for guests
- `booking_confirmation_host` - Booking notification for hosts
- `checkin_instructions` - 24h before arrival instructions
- `wifi_credentials` - Day-of-checkin Wi-Fi details
- `checkout_reminder` - Day-before-checkout reminders
- `payment_received` - Payment confirmation messages
- `booking_modified` - Booking change notifications
- `booking_cancelled` - Cancellation notifications

## Event Triggers & Scheduling

### EventBridge Rules
```json
{
  "Rules": [
    {
      "Name": "BookingConfirmedRule",
      "EventPattern": {
        "source": ["domits.bookings"],
        "detail-type": ["Booking Status Change"],
        "detail": {
          "status": ["confirmed"]
        }
      },
      "Target": "UnifiedMessagingLambda"
    },
    {
      "Name": "CheckInReminderRule",
      "ScheduleExpression": "cron(0 10 * * ? *)",
      "Target": "CheckInReminderLambda"
    }
  ]
}
```

### Message Timing
- **Immediate**: Booking confirmations, payment notifications
- **24h before check-in**: Check-in instructions at 10:00 AM
- **Day of check-in**: Wi-Fi credentials at 10:00 AM
- **Day before check-out**: Check-out reminders at 18:00 PM
- **Custom delays**: Configurable per message type

## Error Handling & Retry Logic

### Retry Strategy
- **Maximum retries**: 3 attempts
- **Backoff**: Exponential (30s, 2m, 8m)
- **Dead letter queue**: Failed messages after all retries
- **Monitoring**: CloudWatch alarms for failure rates

### Error Types
- `TEMPLATE_NOT_FOUND` - Message template missing
- `RECIPIENT_INVALID` - Invalid recipient ID
- `WEBSOCKET_DELIVERY_FAILED` - WebSocket connection issues
- `RATE_LIMIT_EXCEEDED` - Too many messages per recipient
- `TEMPLATE_VARIABLE_MISSING` - Required template variable missing

## Monitoring & Observability

### Metrics
- Messages sent per type (hourly/daily)
- Delivery success rate by message type
- Template rendering errors
- Average delivery latency
- Retry queue depth

### Logs
- Structured JSON logging for all automated messages
- Correlation IDs for end-to-end tracing
- Template variable validation logs
- Delivery attempt logs with timestamps

### Alerts
- Failed message delivery > 5% in 15 minutes
- Template rendering errors > 10 in 5 minutes
- Dead letter queue depth > 50 messages
- WebSocket delivery latency > 5 seconds

## Testing

### Unit Tests
- Template rendering with various variable sets
- Message scheduling logic
- Error handling and retry mechanisms
- Event processing and filtering

### Integration Tests
- End-to-end message delivery flow
- EventBridge trigger processing
- WebSocket delivery verification
- Database persistence validation

### Test Data
```json
{
  "testBooking": {
    "bookingId": "test_booking_001",
    "guestId": "test_guest_001",
    "hostId": "test_host_001",
    "propertyId": "test_property_001",
    "checkInDate": "2025-02-01T15:00:00Z",
    "checkOutDate": "2025-02-05T11:00:00Z",
    "status": "confirmed",
    "totalAmount": 450.00
  }
}
```

## Configuration

### Environment Variables
```bash
WEBSOCKET_API_ENDPOINT=wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production
MESSAGE_TEMPLATE_TABLE=domits-message-templates
MESSAGE_QUEUE_URL=https://sqs.eu-north-1.amazonaws.com/123456789/automated-messages
RETRY_ATTEMPTS=3
RATE_LIMIT_PER_USER=100
```

### Feature Flags
- `AUTOMATED_MESSAGING_ENABLED` - Global automated messaging toggle
- `BOOKING_CONFIRMATIONS_ENABLED` - Booking confirmation messages
- `CHECKIN_REMINDERS_ENABLED` - Check-in instruction messages
- `WIFI_CREDENTIALS_ENABLED` - Wi-Fi credential messages
- `CHECKOUT_REMINDERS_ENABLED` - Check-out reminder messages

## Current Implementation Status

### ✅ What Currently Exists
- **Basic Infrastructure**: `backend/functions/UnifiedMessaging/index.js` with routing logic
- **Manual Messaging**: WebSocket-based real-time messaging between users
- **Frontend Integration**: Web and mobile clients can send/receive messages
- **Database Schema**: Message storage and retrieval working

### ❌ What's Missing for Automated Messages
- **MessageController Methods**: Only skeleton exists, needs automated message logic
- **MessageService Class**: Referenced in controller but not implemented
- **AutomationService**: Completely missing - handles event processing
- **TemplateService**: Missing - manages message templates
- **EventBridge Integration**: No booking event listeners
- **Message Scheduling**: No delayed/timed message delivery
- **Template System**: No template storage or rendering

## Implementation Guide for Next Intern

### 🎯 Priority 1: Core Automation Infrastructure (Week 1-2)

#### Step 1: Create Missing Service Classes
Create these files in `backend/functions/UnifiedMessaging/`:

Create `service/messageService.js` and `service/automationService.js` with the core automation logic.

#### Step 2: Enhance MessageController
Update `controller/messageController.js` to add automated message processing method.

#### Step 3: Update Routing
In `index.js`, add automated message route for `/automation` endpoint.

### 🎯 Priority 2: Event Integration (Week 2-3)

#### Step 1: EventBridge Setup
Create EventBridge rules to listen for booking events.

#### Step 2: Booking Service Integration
Modify booking service to emit events when booking status changes.

### 🎯 Priority 3: Message Scheduling (Week 3-4)

#### Step 1: SQS Integration
Create delayed message queue for scheduled delivery:
- Check-in reminders (24h before)
- Wi-Fi credentials (day of check-in)
- Check-out reminders (day before checkout)

#### Step 2: Cron Jobs
Set up EventBridge scheduled rules for time-based triggers.

## Missing Files Checklist for Intern

### 📁 Files to Create
- [ ] `backend/functions/UnifiedMessaging/service/messageService.js`
- [ ] `backend/functions/UnifiedMessaging/service/automationService.js`
- [ ] `backend/functions/UnifiedMessaging/service/templateService.js` 
- [ ] `backend/functions/UnifiedMessaging/controller/messageController.js` (enhance existing)
- [ ] `backend/functions/UnifiedMessaging/templates/booking_confirmation_guest.json`
- [ ] `backend/functions/UnifiedMessaging/templates/checkin_instructions.json`
- [ ] `backend/functions/UnifiedMessaging/templates/wifi_credentials.json`
- [ ] `backend/functions/UnifiedMessaging/templates/checkout_reminder.json`
- [ ] `backend/functions/UnifiedMessaging/util/eventProcessor.js`
- [ ] `backend/functions/UnifiedMessaging/util/messageQueue.js`

### 📁 Files to Modify  
- [ ] `backend/functions/UnifiedMessaging/index.js` (add automation routes)
- [ ] Booking service (add event emission)
- [ ] Infrastructure files (EventBridge, SQS setup)

### 🗄️ Database Changes Needed
- [ ] Create `message_templates` table
- [ ] Add `isAutomated` and `messageType` columns to existing messages table
- [ ] Create `scheduled_messages` table for delayed delivery

### 🔧 Infrastructure Setup Required
- [ ] EventBridge custom bus for booking events
- [ ] SQS queue for message scheduling
- [ ] IAM roles for cross-service communication
- [ ] CloudWatch alarms for monitoring

## Quick Start Commands for Intern

```bash
# 1. Navigate to function directory
cd backend/functions/UnifiedMessaging

# 2. Create service directory structure
mkdir -p service templates util controller

# 3. Copy existing controller if it exists elsewhere
# cp path/to/existing/messageController.js controller/

# 4. Start with messageService.js implementation
touch service/messageService.js service/automationService.js service/templateService.js

# 5. Create template files
touch templates/booking_confirmation_guest.json templates/checkin_instructions.json

# 6. Test existing infrastructure
npm test # or yarn test
```

## Testing Strategy for Each Phase

### Phase 1 Tests
```javascript
// Test automated message detection
describe('AutomationService', () => {
  it('should process booking confirmation events', async () => {
    const event = { bookingId: 'test_123', status: 'confirmed' };
    const result = await automationService.processBookingEvent(event);
    expect(result.messageType).toBe('booking_confirmation');
  });
});
```

### Phase 2 Tests  
```javascript
// Test template rendering
describe('TemplateService', () => {
  it('should render booking confirmation template', async () => {
    const variables = { guestName: 'John Doe', propertyName: 'Test Property' };
    const message = await templateService.renderTemplate('booking_confirmation_guest', variables);
    expect(message).toContain('John Doe');
  });
});
```

## Todo & Improvements

### Phase 1 (Current - Intern Focus)
- [ ] **CRITICAL**: Create missing service layer (`messageService.js`, `automationService.js`)
- [ ] **CRITICAL**: Implement template system with basic templates
- [ ] **CRITICAL**: Add automation routing to `index.js`
- [ ] **HIGH**: EventBridge integration for booking events  
- [ ] **HIGH**: Message scheduling infrastructure

### Phase 2 (Next Sprint)
- [ ] Multi-language template support
- [ ] Rich media message support (images, PDFs)
- [ ] Message personalization based on guest preferences
- [ ] A/B testing framework for templates

### Phase 3 (Future)
- [ ] AI-powered message optimization
- [ ] Dynamic template generation
- [ ] Cross-platform push notification integration
- [ ] Advanced analytics and reporting dashboard
- [ ] Guest communication preference management

### Technical Debt
- [ ] Migrate hardcoded endpoint URLs to configuration
- [ ] Implement proper error handling for edge cases
- [ ] Add comprehensive logging for debugging
- [ ] Create automated performance testing suite
- [ ] Document API rate limiting and throttling policies

### External Integrations
- [ ] Airbnb messaging adapter
- [ ] Booking.com messaging adapter  
- [ ] VRBO messaging adapter
- [ ] SMS fallback for critical messages
- [ ] Email backup delivery system
