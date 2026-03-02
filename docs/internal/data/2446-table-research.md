# #2446 – Database Table Research

## Cluster 1 – Amenities

### Huidige Tabellen

1. `amenities`
2. `amenity_categories`
3. `amenity_and_category`
4. `property_amenity`

---

## Analyse van huidige structuur

### `amenities`
- Bevat één kolom: `amenity` (primary key, varchar)
- Geen aparte ID (string is primary key)
- Functioneert als lijst van beschikbare amenities

### `amenity_categories`
- Bevat één kolom: `category` (primary key, varchar)
- Functioneert als lijst van categorieën

### `amenity_and_category`
Bevat:
- `id`
- `amenity`
- `category`
- `eco-score`

Functie:
- Koppelt amenity aan category
- Bevat extra metadata (`eco-score`)

Probleem:
- Slaat amenity en category opnieuw op als string
- Dit creëert risico op inconsistentie (bijv. typfouten)
- Kolomnaam `eco-score` bevat een streepje en is onpraktisch in SQL/ORM context

### `property_amenity`
Bevat:
- `id`
- `amenityid`
- `property_id`

Functie:
- Koppelt property aan amenity

Probleem:
- `amenityid` verwijst niet duidelijk naar een echte ID
- Geen expliciete referentie naar `amenities`
- Mogelijke inconsistentie als strings verschillen

---

## Geconstateerde Problemen

1. Duplicatie van data tussen `amenities` en `amenity_and_category`.
2. Duplicatie van category-data tussen `amenity_categories` en `amenity_and_category`.
3. Geen duidelijke ID-structuur (strings als primary keys).
4. Onlogische kolomnaam `eco-score` (met streepje).
5. Onduidelijke referentie in `property_amenity.amenityid`.

---

## Voorstel Target Structuur

Voorstel om de structuur te vereenvoudigen naar:

### `amenity_categories`
- `id`
- `name`

### `amenities`
- `id`
- `name`
- `category_id`
- `eco_score`

### `property_amenities`
- `property_id`
- `amenity_id`
- Composite unique constraint (`property_id`, `amenity_id`)

---

## Voordelen van deze Structuur

- Verwijdert duplicatie
- Verbetert data-consistentie
- Eenvoudigere queries
- Duidelijkere referenties
- Betere schaalbaarheid
- Voorbereid op canonical model in latere issues

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|--------|------------|--------|
| amenities | KEEP (refactor) | Basislijst nodig |
| amenity_categories | KEEP (refactor) | Nodig voor categorisatie |
| amenity_and_category | MERGE/DELETE | Duplicatie, kan in amenities |
| property_amenity | KEEP (refactor) | Nodig als junction table |

---

## Cluster 2 – Rules

### Huidige Tabellen

1. `rules`
2. `property_rule`

---

## Analyse van huidige structuur

### `rules`
- Bevat één kolom: `rule` (primary key, varchar)
- Functioneert als vaste lijst van beschikbare rules
- Geen aparte ID-structuur

### `property_rule`
Bevat:
- `property_id` (primary key)
- `rule` (primary key)
- `value` (boolean)

Functie:
- Koppelt property aan rule
- Geeft per property aan of een rule actief is (true/false)
- Composite primary key voorkomt duplicaten

---

## Observaties

1. De structuur is logisch opgezet.
2. Geen redundantie tussen tabellen.
3. Strings worden gebruikt als primary keys (minder ideaal).
4. Geen aparte rule ID of metadata (bijv. description).

---

## Voorstel Target Structuur

Optioneel refactor voorstel:

### `rules`
- `id`
- `name`
- `description` (optioneel)

### `property_rules`
- `property_id`
- `rule_id`
- `value`
- Composite unique constraint (`property_id`, `rule_id`)

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|--------|------------|--------|
| rules | KEEP (lichte refactor) | Structuur logisch, alleen ID verbetering |
| property_rule | KEEP | Correct junction model |

---

## Conclusie Cluster 2

Geen verwijdering nodig. Alleen structurele verbetering mogelijk.

---
---

## Cluster 3 – Property Types

### Huidige Tabellen

1. `property_types`
2. `property_type`

---

## Analyse van huidige structuur

### `property_types`
- Bevat één kolom: `type` (primary key, varchar)
- Lijst van beschikbare property types

### `property_type`
Bevat:
- `property_id` (primary key)
- `type` (varchar)
- `spacetype` (varchar)

Functie:
- Koppelt property aan een type en spacetype
- Door `property_id` als primary key kan een property slechts één type hebben

---

## Observaties

1. Er is geen many-to-many relatie nodig.
2. Geen extra metadata op de relatie.
3. `type` wordt als string opgeslagen → risico op inconsistentie.
4. Structuur is over-engineered voor één-op-één relatie.

---

## Voorstel Target Structuur

### Optie 1 

Verplaats `type` en `spacetype` direct naar de `property` tabel.

Behoud eventueel:

### `property_types`
- `id`
- `name`

Verwijder:
- `property_type`

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|--------|------------|--------|
| property_types | KEEP (refactor) | Referentielijst |
| property_type | MERGE/DELETE | Overbodige aparte tabel |

---

## Conclusie Cluster 3

Structuur kan worden vereenvoudigd door type direct in property op te nemen.

---

---

## Cluster 4 – Pricing & Availability

### Huidige Tabellen

1. `property_pricing`
2. `property_availability`
3. `availability_restrictions`
4. `property_availabilityrestriction`

---

## Analyse van huidige structuur

### `property_pricing`
Bevat:
- `property_id` (primary key)
- `cleaning` (int, nullable)
- `roomrate` (int, not null)

Functie:
- Baseline pricing per property (1 record per property)
- Geen datum-range pricing (calendar pricing niet zichtbaar in ORM models)

Observatie:
- Bedragen als `int` → moet worden vastgelegd of dit cents zijn (aanrader) of decimal.

---

### `property_availability`
Bevat:
- `property_id` (primary key)
- `availablestartdate` (primary key, bigint)
- `availableenddate` (bigint)

Functie:
- Availability per property opgeslagen als ranges (start/end)
- Meerdere ranges per property mogelijk (composite PK)

Observaties:
- Overlappende ranges worden niet voorkomen door DB-structuur.
- Bigint timestamps → moet worden vastgelegd: epoch seconds of ms + timezone policy (bijv. UTC).

---

### `availability_restrictions`
- Bevat één kolom: `restriction` (primary key, varchar)
- Referentielijst voor mogelijke availability restrictions

---

### `property_availabilityrestriction`
Bevat:
- `id` (primary key)
- `property_id` (varchar)
- `restriction` (varchar)
- `value` (int)

Functie:
- Per property een restriction + value opslaan (bijv. min nights, max nights)

Observaties:
- Geen composite unique constraint op (`property_id`, `restriction`) → duplicaten mogelijk.
- `restriction` als string → risico op inconsistentie.

---

## Voorstel Target Structuur

### Pricing
- `property_pricing` KEEP (lichte refactor/standaardisatie)
  - bedragen standaardiseren (bijv. cents)
  - (optioneel later) currency toevoegen

### Availability
- `property_availability` KEEP
  - policy nodig om overlapping ranges te voorkomen/normaliseren in service layer
  - timestamps standaardiseren (UTC + epoch format)

### Restrictions
- `availability_restrictions` KEEP (refactor naar `id`, `name`)
- `property_availabilityrestriction` KEEP (refactor)
  - (`property_id`, `restriction_id`) unique
  - liever `restriction_id` i.p.v. string

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|------|------------|------|
| property_pricing | KEEP (refactor) | Baseline pricing per property |
| property_availability | KEEP (refactor/policy) | Availability ranges nodig |
| availability_restrictions | KEEP (refactor) | Referentielijst |
| property_availabilityrestriction | KEEP (refactor) | Restriction values per property |

---

## Open Punt

- `property_calendar_price` tabel niet gevonden in huidige ORM models folder? → later verifiëren in DB of andere code-locatie.

---

## Cluster 5 – General Details

### Huidige Tabellen

1. `general_details`
2. `property_generaldetail`

---

## Analyse van huidige structuur

### `general_details`
- Bevat één kolom: `detail` (primary key, varchar)
- Functioneert als referentielijst van mogelijke property details

### `property_generaldetail`
Bevat:
- `id` (primary key)
- `property_id` (varchar)
- `detail` (varchar)
- `value` (int)

Functie:
- Koppelt property aan een “detail” met een numerieke waarde

---

## Observaties

1. `detail` wordt als string opgeslagen → risico op inconsistentie/typfouten.
2. Door `id` als primary key is er geen bescherming tegen dubbele entries voor dezelfde (`property_id`, `detail`).
3. `value` is een `int`, dus dit model is geschikt voor numerieke details. (Nog verifiëren welke details gebruikt worden.)

---

## Voorstel Target Structuur

- `general_details` KEEP (refactor)
  - liever `id`, `name` (optioneel: `unit`, `value_type`)
- `property_general_details` KEEP (refactor)
  - (`property_id`, `detail_id`) unique
  - liever `detail_id` i.p.v. string

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|------|------------|------|
| general_details | KEEP (refactor) | Referentielijst |
| property_generaldetail | KEEP (refactor) | Detail values per property |

---

## Cluster 6 – Images

### Huidige Tabellen

1. `property_image` (legacy)
2. `property_image_v2` (v2)
3. `property_image_variant`

---

## Analyse van huidige structuur

### `property_image` (legacy)
Bevat:
- `key` (primary key, varchar)
- `property_id` (primary key, varchar)

Functie:
- Legacy opslag van image key per property
- Geen metadata zoals sort order, status, timestamps of variants

### `property_image_v2`
Bevat:
- `id` (primary key, varchar)
- `property_id` (varchar)
- `sort_order` (int)
- `status` (varchar)
- `created_at` (bigint)
- `updated_at` (bigint)

Functie:
- Nieuwe (betere) image structuur met ordering en lifecycle metadata

### `property_image_variant`
Bevat:
- `id` (primary key, varchar)
- `image_id` (varchar)
- `variant` (varchar)
- `s3_key` (varchar)
- `content_type` (varchar)
- `bytes`, `width`, `height` (nullable)

Functie:
- Per image meerdere variants opslaan (thumb/medium/large etc.)
- `image_id` verwijst logisch naar `property_image_v2.id` (zonder FK)

---

## Observaties

1. Er bestaan 2 “truth sources” voor images: legacy (`property_image`) en v2 (`property_image_v2`).
2. v2 + variants is een logisch en schaalbaar model.
3. Timestamps zijn bigint → moet worden vastgelegd: epoch format + UTC policy.
4. Deprecatie/migratie plan nodig om legacy table uit te faseren.

---

## Voorstel Target Structuur

- `property_image_v2` KEEP (canonical image table)
- `property_image_variant` KEEP (variants per image)
- `property_image` DEPRECATE → verwijderen nadat migratie afgerond is en legacy code niet meer gebruikt word_

---

## Cluster 7 – Unified Messaging

### Huidige Tabellen

1. `unified_thread`
2. `unified_message`

---

## Analyse van huidige structuur

### `unified_thread`
Bevat o.a.:
- `id` (primary key)
- `hostId`, `guestId`
- `propertyId` (nullable)
- `platform` (varchar)
- `externalThreadId` (nullable)
- `status` (default: OPEN)
- `createdAt`, `updatedAt`, `lastMessageAt` (bigint)

Functie:
- Canonical thread model voor messaging over platformen heen (Domits + extern)

---

### `unified_message`
Bevat o.a.:
- `id` (primary key)
- `threadId` (varchar)
- `senderId`, `recipientId`
- `content` (text)
- `platformMessageId` (nullable)
- `createdAt` (bigint)
- `isRead` (boolean)
- `metadata` (text)
- `attachments` (text JSON)
- `deliveryStatus` (pending/sent/delivered/failed)

Functie:
- Canonical message model gekoppeld aan threads
- Ondersteunt platform mapping (platformMessageId), attachments en delivery status

---

## Observaties

1. Dit is een duidelijke “unified” messaging basis.
2. `metadata` en `attachments` worden als JSON text opgeslagen → flexibel, maar beperkt querybaar.
3. Later indexes nodig op `threadId` en tijdvelden voor performance.
4. Door bestaan van unified modellen zijn oude chat-tabellen kandidaten voor deprecatie, mits usage-check bevestigt dat unified wordt gebruikt.

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|------|------------|------|
| unified_thread | KEEP | Canonical thread model |
| unified_message | KEEP | Canonical message model |

---

## Cluster 8 – property_test_status

### Huidige Tabellen

1. `property_test_status`

---

## Analyse van huidige structuur

### `property_test_status`
Bevat:
- `property_id` (primary key, varchar)
- `istest` (boolean)

Functie:
- Per property vastleggen of het om een test property gaat

---

## Observaties

1. Dit is een 1-op-1 relatie met property.
2. Het bevat slechts één boolean flag.
3. Aparte tabel voor één boolean veld is waarschijnlijk over-engineered.

---

## Voorstel Target Structuur

- Verplaats `istest` naar `property` tabel als `is_test` boolean.
- Verwijder aparte `property_test_status` tabel na migratie.

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|------|------------|------|
| property_test_status | MERGE/DELETE later | 1-op-1 boolean hoort in property |

---

## Cluster 9 – User Table (Old → New DB)

### Huidige Tabellen

1. `user_table`

---

## Analyse van huidige structuur

### `user_table`
Bevat:
- `username` (primary key, varchar)
- `password` (varchar)

Context:
- Frontend gebruikt AWS Amplify Auth (Cognito) voor authenticatie.
- Mobile app leest user attributes via AuthContext.
- Repo search op `User_Table` en `user_table` toont geen usage buiten de model definitie.

---

## Observaties

1. `user_table` wordt niet actief gebruikt in de codebase.
2. Authenticatie lijkt volledig via Cognito te verlopen.
3. Opslaan van wachtwoorden in eigen DB is onwenselijk als Cognito primary auth-provider is.

---

## Voorstel Target Structuur

- Cognito blijft primary identity store.
- `user_table` markeren als DEPRECATE / DELETE candidate.
- Verwijderen na bevestiging dat tabel niet actief in productie wordt gebruikt.

---

## Voorlopige Beslissing

| Table | Beslissing | Reden |
|------|------------|------|
| user_table | DEPRECATE / DELETE candidate | Geen code usage + Cognito is primary auth |

---

## Extra Check – availability_restriction vs availability_restrictions

- `availability_restrictions` bestaat als referentielijst.
- `property_availabilityrestriction` bestaat als mapping tabel.
- `availability_restriction` (enkelvoud) niet aangetroffen in ORM models.

Conclusie:
- Enkelvoudige variant lijkt niet in gebruik.

---

## Extra Check – property_calendar_price

- `property_calendar_price` niet aangetroffen in ORM models.
- Alleen `property_pricing` en `property_availability` aanwezig.
- Mogelijk legacy of niet geïmplementeerd.
- DB verificatie aanbevolen.

---

# Eindconclusie – #2446 First Research

## 1. Samenvatting

Tijdens dit research-traject zijn alle relevante ORM models geanalyseerd.  
Per cluster is beoordeeld:

- Of tabellen redundant zijn  
- Of er duplicatie van data plaatsvindt  
- Of string primary keys inconsistentie-risico veroorzaken  
- Of er merge/delete kandidaten zijn  
- Of structuur schaalbaar en logisch is  

---

## 2. Cleanup Kandidaten (MERGE / DELETE)

| Table | Actie |
|--------|--------|
| amenity_and_category | MERGE / DELETE |
| property_type | MERGE in property |
| property_image (legacy) | DEPRECATE |
| property_test_status | MERGE in property |
| user_table | DEPRECATE / DELETE candidate |

---

## 3. Structurele Verbeteringen Nodig

- String primary keys vervangen door id-based structuur.
- Unique constraints toevoegen bij junction tables.
- Referential integrity afdwingen via applicatielaag (Aurora DSQL heeft geen foreign keys).
- Timestamp policy standaardiseren (UTC + epoch format).
- Indexing toevoegen op performance-kritische velden (messaging, availability).

---

## 4. Aurora DSQL Observatie

Aurora DSQL ondersteunt geen foreign keys.

Gevolgen:
- Integrity moet via applicatie worden gewaarborgd.
- Unique constraints moeten expliciet worden toegevoegd.
- Logical foreign keys moeten duidelijk gedocumenteerd worden.
- Inner joins zijn gevoelig voor inconsistentie bij string-based primary keys.

---

## 5. Status

- Alle genoemde tabellen onderzocht.
- Cleanup kandidaten geïdentificeerd.
- Refactor voorstellen opgesteld.
- Open punten gedocumenteerd.
- Research afgerond.



