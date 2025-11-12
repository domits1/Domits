# 🧪 Gebruikerstest – Host Finance Dashboard (Charges & Payouts)

Dit document is afgestemd op de **HostFinanceTab** component (React) en de bijbehorende UI/flows:

- Drie-stappen banner (property → Stripe → live zetten)
- **Recent Charges** tabel met paginatie
- **Balance overview** (Incoming vs Available) duidelijk zichtbaar
- **Recent Payouts** tabel met paginatie
- **Payout Frequency** (daily/weekly/monthly + anchors) en duidelijke melding
- Loader en “processing” CTA’s (“Opening link…”, “Working on it…”)

Het doel van deze gebruikerstest is te beoordelen of de gebruiker zelfstandig deze stappen kan volgen.

---

## Testpersoon

**Naam:** Hotin Tang  
**Rol:** Cyber Security / Stagiair  
**Datum:** 12-11-2023

---

## Testscenario’s (functioneel + UI/UX)

### Navigatie

1. **Open Host Dashboard → Finance.**  
   _Verwachting:_ Finance-pagina opent; titel **“Finance”** zichtbaar.
2. **Lees de 3 stappen “Receive your payouts in 3 easy steps”.**  
   _Verwachting:_ Gebruiker begrijpt dat Stripe vereist is voor uitbetaling.

---

### Stripe koppelen (3 toestanden van Step 2)

- **3A. Geen accountId** → knop **“Create Stripe account”**  
  _Verwachting:_ Stripe onboarding opent. CTA toont tijdelijk **“Opening link…”** of **“Working on it…”**.
- **3B. Wel accountId, onboarding nog niet compleet** → **“Continue Stripe onboarding”**  
  _Verwachting:_ Na terugkeer is status bijgewerkt.
- **3C. Onboarding compleet** → tekst **“You’re connected to Stripe. Well done!”** + link **“Open Stripe Dashboard”**  
  _Verwachting:_ Stripe dashboard opent in nieuwe tab.

---

### Recent Charges

4. **Bekijk “Recent Charges”.**  
   _Verwachting:_ Kolommen **Payment date, Property (met thumbnail + booking id + payment id), Guest, Amount received, Status** zijn zichtbaar en duidelijk.
5. **Paginatie testen.**  
   Klik **Next / Previous** (TablePager).  
   _Verwachting:_ Pagina wisselt correct; knoppen worden correct gedisabled aan de randen.
6. **Lege en laadstatus.**  
   Simuleer geen data → tekst **“No charges found.”** verschijnt correct.

---

### Balance Overview

7. **Interpreteer balk (Incoming vs Available).**  
   _Verwachting:_ Gebruiker kan uitleggen wat “Incoming” en “Available” betekenen.

---

### Recent Payouts

8. **Bekijk “Recent Payouts”.**  
   _Verwachting:_ Kolommen **Payout date, Amount, Status, Payout ID** zichtbaar. Wanneer geen ID aanwezig is → “-”.
9. **Paginatie + laad/lege staat** werken zoals bij Charges.

---

### Payout Frequency

10. **Wijzig de payout frequentie.**

- Kies **Daily** → geen anchors.
- Kies **Weekly** → veld **Weekly anchor** verschijnt met weekdagen (geen zaterdag/zondag).
- Kies **Monthly** → veld **Monthly anchor (day)** verschijnt (1–31).  
  _Verwachting:_ Velden tonen en verdwijnen correct.

11. **Opslaan.** Klik **“Save payout schedule”**  
    _Verwachting:_ Duidelijke bevestiging of foutmelding verschijnt (toast).  
    Notitie onderaan is begrijpelijk.

---

## Observatieformulier

| Taak                                      | Gelukt? | Tijd        | Moeilijkheid (1–5) | Opmerkingen                                                                                                              |
| ----------------------------------------- | :-----: | ----------- | :----------------: | ------------------------------------------------------------------------------------------------------------------------ |
| Finance pagina vinden                     |   Ja    | 9.22 s      |         3          | Zou handig zijn als Finance in de navbar staat, zoals “Go to Host Dashboard”.                                            |
| Stripe koppelen (juiste toestand)         |   Ja    | 2 m 24.84 s |         1          | Gewoon een knop volgen; duidelijk stappenplan.                                                                           |
| **Charges** lezen & begrijpen             |   Ja    | 20.76 s     |         3          | Naam “Charges” is onduidelijk, kan beter benoemd worden.                                                                 |
| Paginatie **Charges**                     |   Ja    | 2.72 s      |         1          | UI was duidelijk en makkelijk te gebruiken.                                                                              |
| Balance (Incoming vs Available) begrijpen |   Ja    | 5.60 s      |         3          | Ik begrijp het, maar voor anderen kan “Available” verwarrend zijn. Misschien “Available Payouts” of “Beschikbaar saldo”. |
| **Payouts** lezen & begrijpen             |   Ja    | 51.01 s     |         1          | Duidelijk en overzichtelijk.                                                                                             |
| Paginatie **Payouts**                     |   Ja    | 0.50 s      |         1          | UI was duidelijk en makkelijk te vinden.                                                                                 |
| Payout Frequency wijzigen                 |   Ja    | 4.86 s      |         3          | Weekly is duidelijk; bij Monthly is het niet duidelijk welke dag bedoeld wordt, en niet elke maand heeft 31 dagen.       |

---

## Tevredenheidsvragen (1 = helemaal oneens, 5 = helemaal eens)

| Stelling                                                      | Score |
| ------------------------------------------------------------- | :---: |
| Het was makkelijk om **Finance** te vinden                    |   3   |
| De uitleg over Stripe in **Step 2** was duidelijk             |   1   |
| Ik begrijp wat **Charges** zijn en hoe ik de tabel lees       |   2   |
| Ik begrijp wat **Payouts** zijn en wanneer ik uitbetaald word |   1   |
| Het verschil **Incoming vs Available** is duidelijk           |   3   |
| Paginatie werkte zoals verwacht                               |   1   |
| De **Payout Frequency**-instellingen waren logisch            |   3   |
| De interface voelt betrouwbaar en rustig                      |   1   |

---

## Interviewvragen

1. **Waar verwachtte je de Finance-pagina te vinden?**  
   “Ergens als je op je profiel klikt, bijvoorbeeld in een dropdownmenu.”
2. **Wat betekent Charge en Payout voor jou?**  
   “Charge is wat de klant moet betalen; Payout is het geld dat binnenkomt als de klant heeft betaald.”
3. **Was duidelijk welke Charge bij welke boeking hoort?**  
   “Ja, de tabel is duidelijk.”
4. **Was duidelijk wanneer je uitbetaald wordt (Balance + Payouts)?**  
   “Ja, er staat duidelijk de payout date bij.”
5. **Hoe waren de CTA-teksten (“Create/Continue/Open Stripe”)?**  
   “Duidelijk — je krijgt een handleiding/stappenplan wat je moet invullen.”
6. **Wat zou je aanpassen aan de paginatie?**  
   “Niks, het bevat alle nodige informatie.”
7. **Mis je informatie in Charges of Payouts?**  
   “Nee, alles wat ik nodig heb staat er.”
8. **Hoe duidelijk is Weekly/Monthly anchors?**  
   “Weekly is duidelijk; Monthly heeft wat fixes nodig, niet elke maand heeft 31 dagen.”
9. **Hoe beoordeel je de statussen (kleur/label)?**  
   “Goed en duidelijk, ik begrijp aan de kleur wat er bedoeld wordt.”
10. **Vertrouw je deze pagina om inkomsten te beheren?**  
    “Ja, de informatie is duidelijk en overzichtelijk.”

---

## Gebruikersobservatie (Hotin Tang)

- Hotin probeerde de Finance-sectie via het profiel te vinden in plaats van via het Host Dashboard → de navigatie is nog niet intuïtief genoeg.
- Het aanmaken van een **Stripe-account** verliep vlot; de gebruiker volgde de instructies zonder moeite.
- **Charges**-tabel werd begrepen, maar de term “Charges” werd als verwarrend ervaren.
- **Balance overview** was grotendeels duidelijk, maar de term “Available” riep vragen op.
- **Payout Frequency** testen verliep soepel; opmerking dat Monthly niet altijd klopt met het aantal dagen per maand.

---

## Conclusie & Aanbevelingen

De test met Hotin toont aan dat de **technische werking** van het dashboard goed is, maar dat **taalgebruik en navigatie** verbeterd kunnen worden om de ervaring intuïtiever te maken.

### Sterke punten

- UI is overzichtelijk en rustig
- Stripe-stappen duidelijk te volgen
- Payout-overzicht logisch opgebouwd

### Verbeterpunten

| Onderdeel         | Bevinding                                    | Prioriteit | Aanbeveling                                             |
| ----------------- | -------------------------------------------- | ---------- | ------------------------------------------------------- |
| Navigatie         | Gebruiker verwachtte Finance in profielmenu  | Hoog       | Voeg Finance toe aan de hoofdnavigatie of dropdownmenu. |
| Terminologie      | “Charges” en “Available” zijn niet intuïtief | Middel     | Gebruik “Betalingen” en “Beschikbaar saldo”.            |
| CTA Stripe Step 2 | Niet opvallend genoeg                        | Middel     | Maak CTA’s visueel sterker (knoppen).                   |
| Monthly anchors   | Onduidelijk bij maanden <31 dagen            | Laag       | Voeg tooltip of validatie toe bij dagselectie.          |

---

### Eindreflectie

> De gebruikerstest met **Hotin Tang** bevestigt dat de **functionaliteit van Stripe, Charges en Payouts stabiel** is.  
> Gebruikers begrijpen de flow, maar terminologie en navigatie kunnen duidelijker worden gepresenteerd.  
> Door kleine aanpassingen in taalgebruik, CTA-styling en plaatsing van Finance in de navigatie wordt de gebruikerservaring intuïtiever en consistenter voor nieuwe hosts.
