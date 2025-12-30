# Dual Account Messaging Test Guide

Een complete handleiding voor het testen van messaging tussen host en guest accounts op Domits.

## 📋 Overzicht

Deze guide helpt je om messaging functionaliteit te testen tussen twee echte Domits accounts. Je leert hoe je accounts aanmaakt, aan elkaar toevoegt, en de dual messaging test interface gebruikt.

## 🎯 Doelstellingen

- Host en guest messaging naast elkaar testen
- Real-time WebSocket functionaliteit valideren
- Contact systeem testen (verzoeken versturen/accepteren)
- Berichtfuncties testen (tekst, bijlagen, zoeken)
- Geautomatiseerde berichten testen

## 🔧 Benodigdheden

### Accounts
- **2 verschillende Domits accounts** (1 host, 1 guest)
- **2 verschillende browsers** of incognito/private browsing
- **Actieve internetverbinding** voor WebSocket connecties

### Browser Setup
- Chrome + Firefox (aanbevolen)
- Chrome normaal + Chrome incognito
- Safari + Chrome
- Edge + Firefox

## 📝 Stap-voor-Stap Instructies

### Stap 1: Accounts Aanmaken

#### Host Account
1. Ga naar `https://domits.com/register`
2. Kies **"I want to list my property"** (Host registratie)
3. Vul alle benodigde gegevens in:
   - Email adres (gebruik +1 trick: `jouwemail+host@gmail.com`)
   - Wachtwoord
   - Persoonlijke informatie
4. Bevestig je email adres
5. Complete host onboarding process
6. **Belangrijk**: Noteer je User ID (te vinden in profiel settings)

#### Guest Account
1. Open een **andere browser** of incognito mode
2. Ga naar `https://domits.com/register`
3. Kies **"I want to book accommodations"** (Guest registratie)
4. Vul alle benodigde gegevens in:
   - Email adres (gebruik +2 trick: `jouwemail+guest@gmail.com`)
   - Wachtwoord
   - Persoonlijke informatie
5. Bevestig je email adres
6. **Belangrijk**: Noteer je User ID (te vinden in profiel settings)

### Stap 2: User ID's Vinden

#### Voor Host Account:
1. Log in op je host account
2. Ga naar `Profile` → `Settings` of `Account`
3. Zoek naar je **User ID** (UUID format: `12345678-1234-1234-1234-123456789012`)
4. Kopieer deze ID

#### Voor Guest Account:
1. Log in op je guest account (andere browser)
2. Ga naar `Profile` → `Settings` of `Account`
3. Zoek naar je **User ID** (UUID format)
4. Kopieer deze ID

### Stap 3: Contact Verzoek Versturen

#### Optie A: Host stuurt verzoek naar Guest
1. **Als Host**: Ga naar Messages/Chat sectie
2. Zoek naar "Add Contact" of "New Contact"
3. Voer de Guest User ID in, of zoek op naam/email
4. Stuur contact verzoek
5. **Als Guest**: Check notifications en accepteer het verzoek

#### Optie B: Guest stuurt verzoek naar Host
1. **Als Guest**: Ga naar Messages/Chat sectie
2. Zoek naar host via User ID of property listings
3. Stuur contact verzoek
4. **Als Host**: Check notifications en accepteer het verzoek

### Stap 4: Dual Messaging Test Starten

1. Ga naar `https://domits.com/demo/messaging`
2. Voer beide User ID's in:
   - **Host User ID**: `[je host user id]`
   - **Guest User ID**: `[je guest user id]`
3. Klik op **"Start Messaging Test"**

## 🧪 Test Scenario's

### Basis Messaging Test
1. **Real-time berichten**: Stuur berichten van host naar guest en vice versa
2. **Verificatie**: Controleer of berichten onmiddellijk verschijnen in beide chats
3. **WebSocket status**: Check browser console voor connection status

### Geavanceerde Tests

#### 1. Bestandsbijlagen
- Upload verschillende bestandstypes (PNG, JPG, PDF)
- Test preview functionaliteit
- Controleer file size limits

#### 2. Geautomatiseerde Berichten
- Klik op "Test messages" knop
- Controleer welcoming, check-in, en Wi-Fi berichten
- Verificeer template formatting

#### 3. Zoekfunctionaliteit
- Stuur meerdere berichten met verschillende keywords
- Test de message search functie
- Controleer filtering accuracy

#### 4. Character Limits
- Test berichten van verschillende lengtes
- Probeer de 200 character limit te bereiken
- Controleer error handling

#### 5. Verbinding Herstellen
- Refresh een browser tab
- Check of WebSocket automatisch reconnect
- Controleer message history

## 🔍 Debugging & Monitoring

### Browser Console Checken
```javascript
// WebSocket connection status
console.log("WebSocket readyState:", socket.readyState);

// Message history
console.log("Messages:", messages);

// Connection errors
console.error("WebSocket errors");
```

### Network Tab (Chrome DevTools)
1. Open Chrome DevTools (F12)
2. Ga naar Network tab
3. Filter op "WS" (WebSocket)
4. Monitor connection status en berichten

### Common Issues & Solutions

#### WebSocket Connection Failed
- **Probleem**: `WebSocket connection failed`
- **Oplossing**: Check internet verbinding, refresh page
- **Debug**: Console error: `WebSocket error: [error details]`

#### Messages Not Appearing
- **Probleem**: Berichten komen niet aan
- **Oplossing**: Verificeer User ID's, check contact status
- **Debug**: Check if accounts are properly connected as contacts

#### Contact Request Issues
- **Probleem**: Kan geen contact verzoek versturen
- **Oplossing**: Controleer of accounts bestaan, check notification settings
- **Debug**: Check backend API responses in Network tab

## 📊 Expected Results

### Succesvolle Test Indicatoren
✅ Berichten verschijnen real-time in beide chats  
✅ WebSocket connecties zijn stabiel  
✅ File uploads werken correct  
✅ Geautomatiseerde berichten worden verzonden  
✅ Zoekfunctie retourneert juiste resultaten  
✅ Character limits worden gerespecteerd  
✅ Notifications werken (toast messages)  

### Performance Metrics
- **Message Latency**: < 500ms
- **WebSocket Reconnect Time**: < 2s
- **File Upload Speed**: Afhankelijk van file size
- **Search Response Time**: < 200ms

## 🛠️ Troubleshooting

### Account Setup Issues

**Probleem**: Kan geen tweede account aanmaken  
**Oplossing**: Gebruik verschillende email adressen (gmail +trick)

**Probleem**: User ID niet gevonden  
**Oplossing**: Check profile settings, mogelijk onder "Account Information"

**Probleem**: Email confirmatie niet ontvangen  
**Oplossing**: Check spam folder, gebruik echte email adressen

### Messaging Issues

**Probleem**: Accounts niet zichtbaar in contact lijst  
**Oplossing**: Zorg dat contact verzoek is geaccepteerd door beide partijen

**Probleem**: WebSocket verbinding verbreekt  
**Oplossing**: Refresh browser, check internet verbinding

**Probleem**: Berichten duplicaten  
**Oplossing**: Clear browser cache, restart test

### Test Interface Issues

**Probleem**: Dual messaging test laadt niet  
**Oplossing**: Zorg dat je op `/demo/messaging` route bent

**Probleem**: User ID validatie faalt  
**Oplossing**: Controleer UUID format, geen extra spaces

## 📈 Advanced Testing

### Load Testing
1. Stuur 50+ berichten snel achter elkaar
2. Monitor memory usage in browser
3. Check WebSocket buffer management

### Cross-browser Testing
1. Test Chrome ↔ Firefox messaging
2. Test Safari ↔ Chrome messaging
3. Test mobile browsers indien mogelijk

### Network Conditions Testing
1. Simuleer slow 3G in Chrome DevTools
2. Test messaging onder slechte verbindingen
3. Controleer message queuing en retry logic

## 📚 API Endpoints (Voor Developers)

### Contact Management
```
POST https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts
POST https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest
PUT https://ofegu64x64.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Update-ContactRequests
```

### Messaging
```
WebSocket: wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/
POST: Message Creation endpoints
GET: Message History endpoints
```

### User Information
```
POST https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo
```

## 🎉 Completion Checklist

Voordat je de test als succesvol beschouwt, controleer:

- [ ] Beide accounts zijn aangemaakt en geverifieerd
- [ ] Contact verzoek is verstuurd en geaccepteerd
- [ ] Real-time messaging werkt bidirectioneel
- [ ] WebSocket verbindingen zijn stabiel
- [ ] File uploads functioneren correct
- [ ] Geautomatiseerde berichten werken
- [ ] Zoekfunctie retourneert juiste resultaten
- [ ] Error handling werkt bij connection issues
- [ ] Browser console toont geen kritieke errors
- [ ] Performance is acceptabel (< 500ms latency)

## 📞 Support

Bij problemen of vragen:

1. **Check eerst**: Browser console errors
2. **Documenteer**: Screenshots van errors
3. **Contact**: Development team met error details
4. **Include**: User IDs, browser versies, exact error messages

---

**Laatst bijgewerkt**: December 2024  
**Versie**: 1.0  
**Auteur**: Domits Development Team