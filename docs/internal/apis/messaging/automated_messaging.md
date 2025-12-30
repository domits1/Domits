# Automated Messaging API

## Description
The Automated Messaging API provides intelligent, event-driven message delivery within the Domits messaging ecosystem. It automatically sends contextual messages to guests and hosts based on booking lifecycle events, property interactions, and predefined triggers, enhancing user experience through timely communication without manual intervention.

## Metadata
**Lambda Function:** UnifiedMessaging

**Related Issue:** [#767 - Messaging Unified Inbox Airbnb](https://github.com/domits1/Domits/issues/767)

**Status:** **In Development**

**Branch:** `feature/767-messaging-unified-inbox-airbnb`

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

## Todo & Improvements

### Phase 1 (Current)
- [x] Basic message sending infrastructure
- [x] Template system foundation
- [ ] EventBridge integration for booking events
- [ ] Message scheduling and queuing
- [ ] Template variable validation

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