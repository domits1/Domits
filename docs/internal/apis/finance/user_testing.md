> # Gebruikerstest – Host Finance Dashboard (Charges & Payouts)
>
> Dit document is afgestemd op de **HostFinanceTab** component (React) en de bijbehorende UI/flows:
>
> - Drie-stappen banner (property → Stripe -> live zetten)
> - **Recent Charges** tabel met paginatie
> - **Balance overview** (Incoming vs Available) duidelijk zichtbaar
> - **Recent Payouts** tabel met paginatie
> - **Payout Frequency** (daily/weekly/monthly + anchors) en duidelijke melding
> - Loader en “processing” CTA’s (“Opening link…”, “Working on it…”)
>
> Het doel van deze gebruikerstest is om te beoordelen of de gebruiker zelfstandig deze stappen kan volgen.
>
> ## Testpersoon
>
> **Naam:** _VUL IN_  
> **Rol:** _VUL IN_  
> **Datum:** _VUL IN_
>
> ## Testscenario’s (functioneel + UI/UX)
>
> Voer de scenario’s in volgorde uit. Laat de gebruiker hardop denken.
>
> ### Navigatie
>
> 1. **Open Host Dashboard → Finance.**  
>    _Verwachting:_ Finance pagina opent; titel **“Finance”** zichtbaar.
> 2. **Lees de 3 stappen “Receive your payouts in 3 easy steps”.**  
>    _Verwachting:_ Gebruiker begrijpt dat Stripe vereist is voor uitbetaling.
>
> ### Stripe koppelen (3 toestanden van Step 2)
>
> - 3A. **Geen accountId** → knop **“Create Stripe account”**. Klik.  
>   _Verwachting:_ Stripe onboarding opent. CTA toont tijdens actie **“Opening link…”** of ** “Working on it…”**.
> - 3B. **Wel accountId, onboarding nog niet compleet** -> **“Continue Stripe onboarding”**. Klik en rond af.  
>   _Verwachting:_ Na terugkeer is status bijgewerkt.
> - 3C. **Onboarding compleet** -> tekst **“You’re connected to Stripe. Well done!”** + link ** “Open Stripe Dashboard”**. Klik.  
>   _Verwachting:_ Stripe dashboard opent.
>
> ### Recent Charges
>
> 4. **Bekijk “Recent Charges”.**  
>    _Verwachting:_ Kolommen **Payment date, Property (met thumbnail + booking id + payment id), Guest, Amount received, Status**.
> 5. **Paginatie testen.**
>    - Klik **Next/Previous** (TablePager).
>    - _Verwachting:_ Pagina wisselt correct; disabled knoppen aan randen.
> 6. **Lege en laadstatus.**
>    - Simuleer geen data → tekst **“No charges found.”**
>
> ### Balance Overview
>
> 7. **Interpreteer balk (Incoming vs Available).**  
>    _Verwachting:_ Gebruiker kan uitleggen wat “Incoming” en “Available” betekenen.
>
> ### Recent Payouts
>
> 8. **Bekijk “Recent Payouts”.** > _Verwachting:_ Kolommen **Payout date, Amount, Status, Payout ID**. Wanneer geen ID -> “-”.
> 9. **Paginatie + laad/lege staat** zoals bij Charges.
>
> ### Payout Frequency
>
> 10. **Wijzig de payout frequentie.**
>
> - Kies **Daily** -> geen anchors.
> - Kies **Weekly** -> veld **Weekly anchor** verschijnt met weekdagen (waarom geen zaterdag en zondag).
> - Kies **Monthly** -> veld **Monthly anchor (day)** verschijnt (1–31).  
>   _Verwachting:_ Velden tonen correct.
>
> 11. **Opslaan.** Klik **“Save payout schedule”**.  
>     _Verwachting:_ Succes/fout is correct vermeld en duidelijk te begrijpen.
>
> - Als anchor ontbreekt bij weekly/monthly: verwacht heldere foutmelding.
> - Notitie is duidelijk vermeld en te bergrijpen
>
> ## Observatieformulier
>
> | Taak                                      | Gelukt? | Tijd     | Moeilijkheid (1–5) | > Opmerkingen |
> | ----------------------------------------- | :-----: | -------- | :----------------: | ------------- |
> | Finance pagina vinden                     | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Stripe koppelen (juiste toestand)         | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | **Charges** lezen & begrijpen             | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Paginatie **Charges**                     | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Balance (Incoming vs Available) begrijpen | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | **Payouts** lezen & begrijpen             | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Paginatie **Payouts**                     | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Payout Frequency wijzigen                 | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
> | Verslag van toasts/feedback               | ja/nee  | \_\_\_ s |     1 2 3 4 5      |               |
>
> ## Tevredenheidsvragen (1 = helemaal oneens, 5 = helemaal eens)
>
> | Stelling                                                      |   Score   |
> | ------------------------------------------------------------- | :-------: |
> | Het was makkelijk om **Finance** te vinden                    | 1 2 3 4 5 |
> | De uitleg over Stripe in **Step 2** was duidelijk             | 1 2 3 4 5 |
> | Ik begrijp wat **Charges** zijn en hoe ik de tabel lees       | 1 2 3 4 5 |
> | Ik begrijp wat **Payouts** zijn en wanneer ik uitbetaald word | 1 2 3 4 5 |
> | Het verschil **Incoming vs Available** is duidelijk           | 1 2 3 4 5 |
> | Paginatie werkte zoals verwacht                               | 1 2 3 4 5 |
> | De **Payout Frequency**-instellingen waren logisch            | 1 2 3 4 5 |
> | De feedback bij opslaan waren voldoende                       | 1 2 3 4 5 |
> | De interface voelt betrouwbaar en rustig                      | 1 2 3 4 5 |
>
> ## Interviewvragen (kwalitatief – gericht op jouw UI)
>
> 1. Waar verwachtte je de **Finance**-pagina te vinden? Was dat raak?
> 2. Wat betekent **Charge** voor jou? En **Payout**? (Laat gebruiker dit in eigen woorden uitleggen.)
> 3. Kon je snel zien **welke Charge bij welke boeking** hoort (booking id/payment id + thumbnail)?
> 4. Is het meteen duidelijk **wanneer je uitbetaald wordt** (Balance-overview + Recent Payouts)?
> 5. Hoe ervaarde je de **CTA-teksten** (“Create/Continue/Open Stripe” en “Working on it…”)?  
>    Waren ze informatief genoeg tijdens verwerking?
> 6. Wat zou je aanpassen aan de **paginatie** (plaatsing, labeling “Page X of Y”, Previous Next)?
> 7. Mis je informatie in **Charges** of **Payouts** (bijv. betaalmethode en of gastcontact)?
> 8. Hoe duidelijk is het kiezen van **Weekly/Monthly anchors**? Wat zou het begrijpelijker maken of is het duidelijk genoeg?
> 9. Hoe beoordeel je de **statussen** (kleur/label leesbaarheid, succeeded/failed)?
> 10. Vertrouw je deze pagina om je inkomsten te beheren? Waarom (wel/niet)?
>
> ## Conclusie (na uitvoering invullen)
>
> Samenvatting resultaten per onderdeel, grootste knelpunten, prioriteit (hoog/midden/laag) en concrete verbeteracties voor de volgende sprint.
