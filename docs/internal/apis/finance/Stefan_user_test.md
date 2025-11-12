# Gebruikerstest – Host Finance Dashboard (Charges & Payouts)

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

**Naam:** Stefan Hopman  
**Rol:** Co-Founder (Domits)  
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

| Taak                                      | Gelukt? | Tijd        | Moeilijkheid (1–5) | Opmerkingen |
| ----------------------------------------- | :-----: | ----------- | :----------------: | ------------ |
| Finance pagina vinden                     | Ja | 7.74 s | 1 | Stefan wist al waar de Finance-pagina stond, dus het was eenvoudig te vinden. |
| Stripe koppelen (juiste toestand)         | Ja | 2 m 30.52 s | 1 | Stappen kunnen geminimaliseerd worden; velden zoals “branches” of “website” zouden optioneel mogen zijn. |
| **Charges** lezen & begrijpen             | Ja | 41.98 s | 1 | Naam “Charges” is onduidelijk; beter hernoemen naar “Guest Payments”. |
| Paginatie **Charges**                     | Ja | 0 s | 1 | UI was duidelijk en makkelijk te gebruiken. |
| Balance (Incoming vs Available) begrijpen | Ja | 33.57 s | 3 | Toon definities bij hoveren over de balk (“Wat betekent Incoming/Available?”). |
| **Payouts** lezen & begrijpen             | Ja | 7.51 s | 1 | Duidelijk en overzichtelijk. **Tip:** Zorg ervoor dat hosts bij “Payouts” facturen of uitbetalingsbewijzen kunnen downloaden voor hun administratie. |
| Paginatie **Payouts**                     | Ja | 0 s | 1 | UI was duidelijk en makkelijk te vinden. |
| Payout Frequency wijzigen                 | Ja | 49.29 s | 3 | Weekly is duidelijk; bij Monthly is het niet altijd duidelijk welke dag bedoeld wordt. Niet elke maand heeft 31 dagen. |

---

## Tevredenheidsvragen (1 = helemaal oneens, 5 = helemaal eens)

| Stelling | Score |
| --------- | :---: |
| Het was makkelijk om **Finance** te vinden | 1 |
| De uitleg over Stripe in **Step 2** was duidelijk | 1 |
| Ik begrijp wat **Charges** zijn en hoe ik de tabel lees | 2 |
| Ik begrijp wat **Payouts** zijn en wanneer ik uitbetaald word | 1 |
| Het verschil **Incoming vs Available** is duidelijk | 3 |
| Paginatie werkte zoals verwacht | 1 |
| De **Payout Frequency**-instellingen waren logisch | 2 |
| De interface voelt betrouwbaar en rustig | 1 |

---

## Interviewvragen

1. **Waar verwachtte je de Finance-pagina te vinden?**  
   “In het overzicht waar het nu staat.”  
2. **Wat betekent Charge en Payout voor jou?**  
   “Charge kan beter ‘Guest Payment’ heten; Payout betekent uitbetaling.”  
3. **Was duidelijk welke Charge bij welke boeking hoort?**  
   “Ja.”  
4. **Was duidelijk wanneer je uitbetaald wordt (Balance + Payouts)?**  
   “Ja.”  
5. **Hoe waren de CTA-teksten (“Create/Continue/Open Stripe”)?**  
   “Goed en duidelijk.”  
6. **Wat zou je aanpassen aan de paginatie?**  
   “Geen suggesties.”  
7. **Mis je informatie in Charges of Payouts?**  
   “Nee.”  
8. **Hoe duidelijk is Weekly/Monthly anchors?**  
   “Duidelijk.”  
9. **Hoe beoordeel je de statussen (kleur/label)?**  
   “Duidelijk.”  
10. **Vertrouw je deze pagina om inkomsten te beheren?**  
    “Ja, 100%.”

---

## Gebruikersobservatie (Stefan Hopman)

- Stefan vond de Finance-pagina snel, aangezien hij bekend is met het dashboard.  
- Tijdens **Stripe onboarding** gaf hij aan dat sommige velden verplicht zijn terwijl dat niet altijd nodig is.  
- De term **“Charges”** werd als technisch ervaren “Guest Payments” zou volgens hem begrijpelijker zijn.  
- Bij de **Balance overview** stelde hij voor een korte uitleg te tonen via hover of tooltip.  
- De **Payouts-sectie** werd als duidelijk ervaren, maar Stefan raadde aan om een **downloadoptie voor facturen of uitbetalingsbewijzen** toe te voegen.  
- De **Payout Frequency**-instelling werkte goed, maar hij wees erop dat niet elke maand 31 dagen heeft.

---

## Conclusie & Aanbevelingen

De test met Stefan toont aan dat de **functionaliteit stabiel en gebruiksvriendelijk** is, maar dat **terminologie en kleine UX-details** de duidelijkheid verder kunnen verbeteren.

### Sterke punten
- Interface is duidelijk en rustig  
- Stripe-stappen werken zoals bedoeld  
- Payouts en balans zijn overzichtelijk gepresenteerd  

### Verbeterpunten

| Onderdeel | Bevinding | Prioriteit | Aanbeveling |
| ---------- | ---------- | ---------- | ------------ |
| Terminologie | “Charges” is te technisch | Hoog | Gebruik “Guest Payments” of “Betalingen van gasten”. |
| Stripe Onboarding | Te veel verplichte velden | Middel | Maak optionele velden niet verplicht (zoals branches, website). |
| Balance Overview | Betekenis niet direct duidelijk | Middel | Tooltip met uitleg (“Incoming = nog te ontvangen; Available = beschikbaar saldo”). |
| Payouts-sectie | Mist optie om uitbetalingsbewijs te downloaden | Middel | Voeg downloadknop toe voor factuur/uitbetalingsbewijs. |
| Monthly anchors | Niet elke maand heeft 31 dagen | Laag | Voeg validatie of visuele toelichting toe. |

---

### Eindreflectie

> De gebruikerstest met **Stefan Hopman** bevestigt dat het **Host Finance Dashboard technisch goed functioneert**, maar dat gebruikersvriendelijkheid nog verder kan worden verfijnd.  
> Kleine verbeteringen in terminologie, veldlogica en documentatie (zoals downloadbare uitbetalingsbewijzen) kunnen zorgen voor een professionelere en toegankelijkere ervaring — vooral voor hosts die hun administratie zelf bijhouden.
