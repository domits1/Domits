# Gebruikerstest – Host Finance Dashboard (Charges & Payouts)

Dit document is afgestemd op de **HostFinanceTab** component (React) en de bijbehorende UI/flows:

- Drie-stappen banner (property → Stripe → live zetten)
- **Recent Charges** tabel met paginatie
- **Balance overview** (Incoming vs Available) duidelijk zichtbaar
- **Recent Payouts** tabel met paginatie
- **Payout Frequency** (daily/weekly/monthly + anchors) en duidelijke melding
- Loader en “processing” CTA’s (“Opening link…”, “Working on it…”)

Het doel van deze gebruikerstest is om te beoordelen of de gebruiker zelfstandig deze stappen kan volgen.

---

## Testpersoon

**Naam:** Hotin  
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

| Taak                                      | Gelukt? | Tijd        | Moeilijkheid (1–5) | Opmerkingen                                                                                                                                                                                                                      |
| ----------------------------------------- | :-----: | ----------- | :----------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Finance pagina vinden                     |   Ja    | 10.15 s     |         3          | ik zou willen dat de finance in de navbar zoals go to host dashboard                                                                                                                                                             |
| Stripe koppelen (juiste toestand)         |   Ja    | 4 m 16.23 s |         1          | Is gewoon een knop en dan de handleiding volgen en stappen                                                                                                                                                                       |
| **Charges** lezen & begrijpen             |   Ja    | 1 m 26.12 s |         3          | Pas naam aan charges is onduidelijk kan een beter naamgeving                                                                                                                                                                     |
| Paginatie **Charges**                     |   Ja    | 1 m 32.13 s |         1          | UI was duidelijk en makkelijk te gebruiken.                                                                                                                                                                                      |
| Balance (Incoming vs Available) begrijpen |   Ja    | 5.60 s      |         3          | opzich is duidelijk ik begrijp het is duidelijk alleen maar ik kan voor andere mensen begrijpen dat het niet duidelijk is, wat is avaiable? misschien avaiable payouts of avaiable with draw of funds maakt het iets duidelijker |
| **Payouts** lezen & begrijpen             |   Ja    | 11.22 s     |         1          | Het is gewon duidelijk                                                                                                                                                                                             |
| Paginatie **Payouts**                     |   Ja    | 11.60 s     |         1          | UI was duidelijk en makkelijk te vinden.                                                                                                                                                                                         |
| Payout Frequency wijzigen                 |   Ja    | 13.85 s     |         3          | Weekly is duidelijk; bij monthly is niet duidelijk welke dag van de week bedoeld wordt en de maand ook  niet echt duidelijk.                                                                                                                                          |

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
2. ergens als je op je profiel klikt en dan ergens in een dropdown menu ofzo.
3. **Wat betekent Charge en Payout voor jou?**  
4. charge wat betaald moet worden door de klant aan jou en payout het geld dat binnenkomt dan de klant heeft betaald
5. **Was duidelijk welke Charge bij welke boeking hoort?**  
6. ja de tabel is duidelijk
7. **Was duidelijk wanneer je uitbetaald wordt (Balance + Payouts)?**  
8. ja er staat duidelijk payout date
9. **Hoe waren de CTA-teksten (“Create/Continue/Open Stripe”)?**  
10. het is duidelijk want je krijgt eigenlijk een handleiding/stappenplan erbij van wat je moet invullen om door te gaan
11. **Wat zou je aanpassen aan de paginatie?**  
12. nu niks want het heeft duidelijke informatie die nodig is
13. **Mis je informatie in Charges of Payouts?**  
14. nee alle informatie die ik nodig heb staat er
15. **Hoe duidelijk is Weekly/Monthly anchors?** 
16. het is duidelijk welke dag je kiest voor uitbetalingen alleen de de monthly heeft wat fixes nodig doordat niet elke maand 31 dagen heeft
17. **Hoe beoordeel je de statussen (kleur/label)?*  
18. het is goed en duidelijk en ik begrijp aan de kleur wat er wordt bedoeld
19. **Vertrouw je deze pagina om inkomsten te beheren?**  
20. ja, doordat alle informatie duidelijk te zien is

---

## Gebruikersobservatie (Alessio Itofo)

- Alessio begon via de **homepage (property)** in plaats van het Host Dashboard → toont dat de navigatie niet intuïtief genoeg is.
- Tijdens **Stripe account aanmaken** probeerde hij een **business account** te maken en gebruikte testgegevens van mij.
- Voor **Charges** ging hij direct naar **Stripe Dashboard** i.p.v. binnen de website → laat zien dat gebruikers de site nog niet als primaire bron van financiële info zien.
- **Balance overview** was duidelijk; hij kon goed uitleggen wat “Incoming” en “Available” betekenen.
- **Payout Frequency** aanpassen verliep soepel en zonder fouten.

---

## Conclusie & Aanbevelingen

De test met Alessio laat zien dat de **functionaliteit werkt**, maar de **gebruikerservaring** nog verbeterd kan worden qua navigatie, taal en visuele duidelijkheid.

### Sterke punten

- UI is rustig en overzichtelijk
- Balans- en payoutdelen goed begrijpbaar
- Payout Frequency logische flow

### Verbeterpunten

| Onderdeel         | Bevinding                                   | Prioriteit | Aanbeveling                                                                |
| ----------------- | ------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Navigatie         | Host vond Finance niet meteen               | Hoog       | Voeg een zichtbare link “Finance” of “Earnings” toe aan het dashboardmenu. |
| CTA Stripe Step 2 | Teksten niet opvallend genoeg               | Middel     | Maak CTA’s knoppen in plaats van tekstlinks.                               |
| Charges overzicht | Gebruiker ging liever naar Stripe Dashboard | Middel     | Voeg filters of zoekoptie toe binnen eigen tabel.                          |
| Terminologie      | “Available” niet intuïtief                  | Laag       | Gebruik “Beschikbaar saldo” i.p.v. “Available”.                            |
| Paginatie         | Functioneert goed maar onlogische plaatsing | Laag       | Toon paginatie boven en onder de tabel.                                    |
| Monthly anchors   | Onduidelijk wat de dag betekent             | Laag       | Tooltip toevoegen (“Betaling start elke 25e van de maand”).                |

---

### Eindreflectie

> De gebruikerstest met Alessio bevestigt dat de **technische werking van Stripe, Charges en Payouts stabiel is**, maar dat nieuwe hosts nog moeite hebben met het vinden van de juiste sectie en het herkennen van visuele CTA’s.  
> Door verbeteringen aan te brengen in navigatie, labels en taalgebruik wordt de Finance-pagina intuïtiever en toegankelijker voor nieuwe gebruikers.
