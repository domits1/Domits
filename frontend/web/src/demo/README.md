# Demo Directory

Deze directory bevat demo en test componenten voor het Domits platform.

## 📁 Inhoud

### DualMessagingTest.jsx
Een interactieve test interface voor het testen van messaging functionaliteit tussen host en guest accounts.

**Functies:**
- Side-by-side chat interface voor host en guest
- Real-time WebSocket messaging test
- Contact setup en configuratie
- Message debugging en monitoring
- File upload testing
- Automated message testing

**Gebruik:**
1. Navigeer naar `/demo/messaging`
2. Voer host en guest User IDs in
3. Zorg dat accounts als contacten zijn toegevoegd
4. Start messaging test

### DualMessagingTest.css
Styling voor de dual messaging test component met:
- Responsive design
- Dark mode support
- Professional styling
- Debug interface styling

## 🚀 Hoe Te Gebruiken

### Voorvereisten
- 2 verschillende Domits accounts (1 host, 1 guest)
- Accounts moeten elkaar als contact hebben toegevoegd
- User IDs van beide accounts

### Stappen
1. **Account Setup:**
   ```
   Host Account: Maak host account → noteer User ID
   Guest Account: Maak guest account → noteer User ID
   ```

2. **Contact Verzoek:**
   ```
   Host → Guest: Stuur contact verzoek
   Guest: Accepteer verzoek in notifications
   ```

3. **Test Starten:**
   ```
   Browser 1: Log in als host
   Browser 2: Log in als guest
   Ga naar: /demo/messaging
   ```

## 🧪 Test Scenario's

### Basis Tests
- [x] Real-time messaging host ↔ guest
- [x] WebSocket connection stability
- [x] Message history loading
- [x] Contact information display

### Geavanceerd Tests
- [x] File attachment uploads
- [x] Automated welcome messages
- [x] Message search functionality
- [x] Character limit validation (200 chars)
- [x] Connection recovery after refresh

### Performance Tests
- [x] Message latency (target: <500ms)
- [x] WebSocket reconnection (target: <2s)
- [x] Memory usage bij veel berichten
- [x] Cross-browser compatibility

## 🔧 Technische Details

### Components Gebruikt
- `ChatScreen` - Main chat interface
- `WebSocketProvider` - Real-time connection context
- `useFetchMessages` - Message history hook
- `useSendMessage` - Message sending hook
- `useFetchContacts` - Contact management hook

### WebSocket Endpoints
```
wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId={userId}
```

### API Endpoints
```
FetchContacts: https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts
FetchContacts_Guest: https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest
GetUserInfo: https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo
```

## 📊 Debug Features

### Real-time Monitoring
- Message send/receive counters
- WebSocket connection status
- Error logging en display
- Performance metrics

### Browser Console Logs
```javascript
// WebSocket status
console.log("WebSocket readyState:", socket.readyState);

// Message history
console.log("Messages loaded:", messages.length);

// Connection errors
console.error("WebSocket connection error");
```

## 🐛 Common Issues

### Setup Issues
**Problem**: Kan geen User ID vinden  
**Solution**: Check Profile → Settings → Account Information

**Problem**: Contact verzoek niet ontvangen  
**Solution**: Check notifications, refresh page

**Problem**: Accounts niet zichtbaar  
**Solution**: Zorg dat contact verzoek geaccepteerd is

### Runtime Issues
**Problem**: WebSocket connection failed  
**Solution**: Check internet connection, refresh page

**Problem**: Messages niet real-time  
**Solution**: Check beide accounts zijn online en connected

**Problem**: File upload faalt  
**Solution**: Check file size < 10MB, supported formats

## 📝 Development Notes

### Code Structure
```
DualMessagingTest.jsx
├── AccountSetupForm - User ID input en validatie
├── HowToGuide - Step-by-step instructies  
├── TestInstructions - Test scenario's
├── MessageDebugInfo - Real-time debugging
└── Main Chat Interface - Dual chat layout
```

### State Management
- `hostUserId` / `guestUserId` - Account identifiers
- `isConfigured` - Setup completion status
- `hostMessages` / `guestMessages` - Message tracking
- WebSocket contexts per user

### Styling Approach
- CSS Grid voor layout
- Flexbox voor components
- CSS custom properties voor theming
- Responsive breakpoints
- Dark mode media queries

## 🔮 Toekomstige Verbeteringen

### Geplande Features
- [ ] Automatic account discovery
- [ ] Preset test scenarios
- [ ] Performance benchmarking tools
- [ ] Multi-user testing (3+ accounts)
- [ ] Mobile responsive testing
- [ ] Automated test suites

### Enhancement Ideas
- [ ] Save/load test configurations
- [ ] Export test results
- [ ] Integration met CI/CD pipeline
- [ ] Load testing capabilities
- [ ] Network condition simulation

## 📚 Gerelateerde Documentatie

- [Messaging Overview](../../docs/internal/apis/messaging/messaging_overview.md)
- [Dual Account Testing Guide](../../docs/testing/dual_account_messaging_guide.md)
- [WebSocket Implementation](../features/hostdashboard/hostmessages/context/webSocketContext.js)
- [Chat Components](../components/messages/)

## 🤝 Contributing

Bij het toevoegen van nieuwe demo components:

1. Volg bestaande naming conventions
2. Include comprehensive styling
3. Add debug/monitoring features  
4. Update deze README
5. Test cross-browser compatibility

## 📄 License

Onderdeel van het Domits platform - Internal use only.