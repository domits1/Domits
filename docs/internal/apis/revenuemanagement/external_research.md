# Onderzoek & Advies

### ntegraties met Externe Revenue Managers (RMS ↔ RMS)

### Context

Onze website beschikt over een **eigen Revenue Management System (RMS)**.  
Het doel is om dit RMS te koppelen aan **externe Revenue Managers** via een **Integratie Marketplace**.

Belangrijk uitgangspunt:
**Ons eigen RMS blijft de source of truth**  
Externe RMS’en leveren input (prijzen, signalen, aanbevelingen), maar beslissen niet autonoom.

## 1 Technisch Onderzoek per Integratie

### Integratie: PriceLabs

### Beschrijving

PriceLabs biedt een **Dynamic Pricing API** die expliciet is ontworpen voor externe integraties met PMS’en, channel managers en **custom RMS’en**.

### Wat is nodig

**Toegang & credentials**

- Integratie-aanvraag bij PriceLabs
- Ontvangst van:
  - Integration Name
  - Integration Token

**Technische vereisten**

- REST API
- Authenticatie via headers:
  - `X-INTEGRATION-NAME`
  - `X-INTEGRATION-TOKEN`
- HTTPS verplicht

**Functionele scope**

- Ophalen van dynamische prijsaanbevelingen
- Synchronisatie per accommodatie en datum
- Property ID mapping

**Integratiestappen**

1. Integratie aanvragen bij PriceLabs
2. API-credentials ontvangen
3. Pricing endpoints implementeren
4. Testen in sandbox / testomgeving
5. Goedkeuring PriceLabs
6. Livegang productie

**Aandachtspunten**

- Rate limiting
- Logging & foutafhandeling
- Certificatieproces mogelijk vereist

## 2. Integratie: RoomPriceGenie

### Beschrijving

RoomPriceGenie biedt een Open API, primair gericht op **hotels en PMS’en**.

### Wat is nodig

**Toegang**

- Aanmelding via Open API
- Credentials na goedkeuring

**Technische vereisten**

- REST API
- Real-time synchronisatie

**Data-uitwisseling**

- Beschikbaarheid
- Boekingen
- Kamerprijzen
- Restricties

**Aandachtspunten**

- Beperkte flexibiliteit
- Nauwelijks RMS ↔ RMS use cases
- PMS-georiënteerde architectuur

## 3. Integratie: Wheelhouse

### Beschrijving

Wheelhouse biedt API’s voor pricing recommendations, demand forecasting en portfolio management.

### Wat is nodig

**Toegang**

- Partner- of klantregistratie
- API-key

**Technische vereisten**

- REST API
- Bulk requests
- Webhooks (optioneel)

**Functionele scope**

- Dagelijkse prijsaanbevelingen
- Portfolio- en listingbeheer

**Aandachtspunten**

- Minder API-first
- Externe controle over pricing lastig
- Positioneert zich als primary RMS

## 4. Integratie: Beyond

### Beschrijving

Beyond biedt een Dynamic Integration API voor pricing-optimalisatie.

### Wat is nodig

**Toegang**

- Integratie-aanvraag
- API credentials

**Technische vereisten**

- REST API
- Vast datamodel richting Beyond

**Data-uitwisseling**

- Property data
- Kalenderbeschikbaarheid
- Prijzen en restricties

**Aandachtspunten**

- Beyond verwacht vaak leidende rol
- Minder geschikt voor co-existent RMS-model

## 2 — Strategisch Advies (belangrijkste deel)

### Beoordelingscriteria

Omdat wij **een eigen RMS hebben**, zijn deze criteria doorslaggevend:

1. Openheid van API
2. RMS ↔ RMS compatibiliteit
3. Controle over pricing-beslissingen
4. Marketplace-geschiktheid
5. Risico op vendor lock-in

## Aanbevolen Keuze

### Beste keuze: PriceLabs

**Waarom**

- Expliciet gebouwd voor externe integraties
- Geschikt voor custom RMS’en
- Laat pricing-beslissingen extern
- Grote marktacceptatie

**Strategisch voordeel**

- Hoge klantvraag
- Lage technische frictie
- Ideaal als eerste marketplace-integratie

**Conclusie**
Dit moet de eerste en belangrijkste integratie zijn.

### Tweede keuze: Beyond (selectief)

**Voordelen**

- Mature pricing-algoritmes
- Enterprise-waardig

**Risico’s**

- Beyond positioneert zich als primary RMS
- Conceptuele strijd over “wie bepaalt de prijs?”

**Wanneer doen**

- Alleen als klanten Beyond expliciet eisen
- Met duidelijke afspraken over pricing ownership

### Alleen op aanvraag: Wheelhouse

**Voordelen**

- Sterk in portfolio-level pricing
- Goede demand forecasting

**Nadelen**

- Minder geschikt voor marketplace-model
- Minder flexibel in RMS ↔ RMS samenwerking

**Advies**
Alleen bouwen als commerciële noodzaak dit rechtvaardigt.

### Vermijden: RoomPriceGenie

**Waarom niet**

- PMS-georiënteerd
- Nauwelijks RMS ↔ RMS use cases
- Beperkte API-flexibiliteit

**Conclusie**
Te veel onderhoud, te weinig strategische waarde.
