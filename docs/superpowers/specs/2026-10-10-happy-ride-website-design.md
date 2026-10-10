# Happy Ride Car Rental — ontwerp website

Datum: 2026-10-10 · Status: goedgekeurd in brainstorm, ter review

Waarden tussen `[vierkante haken]` zijn bewuste placeholders van de klant en worden later ingevuld.

## 1. Doel

Website voor Happy Ride Car Rental, autoverhuur op Curaçao voor Europese toeristen. Domein: `happyride.cw`.

Een bezoeker ziet binnen vijf seconden welke auto's er zijn, wat ze kosten en of ze vrij zijn op de gekozen data. Daarna doet hij binnen één minuut een aanvraag. Er wordt niet online betaald: de site verwerkt **aanvragen**, geen boekingen.

## 2. Techniek

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS |
| Hosting | Netlify (eigen account), gekoppeld aan GitHub-repo `Mitchroelchatbot/Happy-Ride` |
| Database + login | Supabase, regio EU (Frankfurt) |
| Foto's | Supabase Storage, bucket `car-photos` (publiek lezen, alleen beheerders schrijven) |
| E-mail | Resend, verzonden vanaf het geverifieerde domein `happyride.cw` |
| Vertalingen | next-intl, teksten in `messages/{nl,en,es}.json` |
| Geplande taken | Netlify Scheduled Function, elk uur |
| Tests | Vitest, PGlite (Postgres in Node), Playwright |

- Alle bedragen worden opgeslagen in **eurocenten** (integer).
- Tijdzone voor "vandaag" en verlooptijden: `America/Curacao` (UTC−4, geen zomertijd).
- Geheimen staan alleen in `.env.local` en in de Netlify-instellingen, nooit in de repo (de repo is openbaar). `.env.example` bevat de namen zonder waarden:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO_ADMIN`, `SITE_URL`, `TEST_DATABASE_URL`.

## 3. Bedrijfsregels

| Regel | Waarde |
|---|---|
| Minimale huurduur | [3] dagen |
| Optie vervalt na | [48] uur zonder bevestiging |
| Herinnering aan Happy Ride | [24] uur vóór het vervallen |
| Reactietermijn richting klant | [24] uur |
| Spamlimiet | max. 3 aanvragen per uur per IP-adres en per e-mailadres |
| Ophaal-/inlevertijden | per half uur, [07:00]–[21:00] |
| Beschikbaarheid vooruit zichtbaar | 12 maanden |

**Dagen tellen volgens het hotelmodel.** Een huur van 1 t/m 4 juni bezet 1, 2 en 3 juni en kost 3 dagen. Op 4 juni kan de volgende klant de auto ophalen. Tijden zijn informatie voor Happy Ride en tellen niet mee voor beschikbaarheid of prijs.

**Prijs** = dagen × dagprijs auto + (extra bestuurder ? dagen × prijs extra bestuurder : 0) + aantal kinderzitjes × dagen × prijs kinderzitje.

De regels uit deze tabel staan op twee plekken: in `src/config.ts` (voor de interface) en in de databasefunctie (voor de afdwinging). Een test controleert dat beide gelijk zijn.

## 4. Datamodel (Supabase / Postgres)

### `cars`
`id`, `name`, `transmission` (`manual` | `automatic`), `seats`, `luggage` (aantal koffers), `airco` (bool), `price_per_day_cents`, `photo_path` (nullable), `is_placeholder_photo` (bool, toont label "voorbeeld"), `visible` (bool), `sort_order`, `created_at`.

### `extras`
`id`, `key` (`extra_driver` | `child_seat`), `price_per_day_cents`, `active`. De namen staan in de vertaalbestanden.

### `requests`
`id`, `reference` (doorlopend nummer vanaf 1001, getoond als `HR-1001`), `car_id`, `pickup_date`, `return_date`, `pickup_time`, `return_time`, `pickup_location` (`airport` | `accommodation` | `office`), `accommodation_address` (verplicht bij `accommodation`), `flight_number` (optioneel), `name`, `email`, `phone`, `message`, `extra_driver` (bool), `child_seats` (0–3), `total_price_cents` (vastgelegd bij aanvragen), `locale` (`nl` | `en` | `es`), `status` (`new` | `confirmed` | `rejected` | `expired` | `cancelled`), `expires_at`, `reminder_sent_at`, `mail_failed` (bool), `ip_hash` (gehasht IP-adres, voor de spamlimiet), `created_at`, `decided_at`.

### `periods`
`id`, `car_id`, `period` (`daterange`, half-open `[ophaaldag, inleverdag)`), `kind` (`option` | `confirmed` | `blocked`), `request_id` (nullable, alleen bij option/confirmed), `note` (bij blocked), `created_at`.

**Exclusion constraint:**
`EXCLUDE USING gist (car_id WITH =, period WITH &&)` (extensie `btree_gist`).
Twee rijen van dezelfde auto kunnen elkaar nooit overlappen, ongeacht de soort en ook niet bij gelijktijdige transacties. Een handmatige blokkade van dag X t/m dag Y wordt opgeslagen als `[X, Y+1)`.

### Statusovergangen

| Actie | `requests.status` | `periods` |
|---|---|---|
| Klant vraagt aan | `new`, `expires_at` = nu + 48 u | nieuwe rij `option` |
| Beheerder bevestigt | `confirmed` | rij wordt `confirmed` |
| Beheerder wijst af | `rejected` | rij verwijderd |
| Optie verloopt | `expired` | rij verwijderd |
| Beheerder annuleert een bevestigde aanvraag (klant zegt af) | `cancelled` | rij verwijderd |

Een aanvraag wordt nooit verwijderd en blijft bewaard als geschiedenis (tot de bewaartermijn uit de privacyverklaring). Een aanvraag met status `expired` kan niet meer bevestigd worden. Bevestigen en afwijzen kan alleen vanuit `new`, annuleren alleen vanuit `confirmed`.

### Databasefuncties
- **`create_request(...)`** (security definer, alleen uitvoerbaar door de service role). In één transactie: verlopen opties vrijgeven → spamlimiet controleren → regels controleren (minstens 3 dagen, ophaaldag ≥ vandaag, auto zichtbaar, extra's geldig) → prijs berekenen → `requests` en `periods` invoegen. Bij een overlap geeft de functie een herkenbare fout (`period_unavailable`).
- **`expire_options()`**: zet verlopen `new`-aanvragen op `expired`, verwijdert hun periode en geeft de betreffende aanvragen terug (voor de mails).
- **`get_availability()`**: geeft per zichtbare auto alleen de bezette datumbereiken terug, van vandaag tot 12 maanden vooruit, zonder persoonsgegevens.
- **`confirm_request(id)`**, **`reject_request(id)`**, **`cancel_request(id)`**: alleen voor beheerders, voeren de statusovergangen atomair uit.

### Beveiliging (RLS)
- Bezoekers (anon): lezen `cars` waar `visible = true` en `extras` waar `active = true`, en mogen `get_availability()` aanroepen. Geen toegang tot `requests` of `periods`.
- Beheerders (authenticated): volledige toegang. Zelf registreren staat uit in Supabase Auth; beheerders worden toegevoegd via het Supabase-dashboard.
- De server (service role) roept `create_request` en `expire_options` aan.

## 5. Publieke site

URL's: `/nl` (standaard; `/` stuurt door naar `/nl`), `/en`, `/es`, plus `/{taal}/privacy`. Eén pagina, mobile-first.

1. **Header** (blijft bovenaan staan): het logo, de taalwisselaar NL · EN · ES (houdt de gekozen data vast), en een oranje WhatsApp-knop die `wa.me` opent met een voorgeschreven bericht in de taal van de bezoeker.
2. **Hero**: een grote foto, een korte kop, één zin uitleg en twee datumvelden (ophalen, inleveren). Eronder staat het aantal dagen. Bij minder dan [3] dagen verschijnt een vriendelijke melding. De data staan in de URL (`?van=JJJJ-MM-DD&tot=JJJJ-MM-DD`).
3. **Vloot**: kaarten (onder elkaar op mobiel, in een raster op grotere schermen). Per kaart:
   - de foto (met het label "voorbeeld" als `is_placeholder_photo`), de naam, en iconen voor schakel/automaat, zitplaatsen, airco en koffers;
   - de prijs per dag, en bij gekozen data de totaalprijs zonder extra's ("€ 245 totaal voor 7 dagen"); de extra's worden pas in het formulier opgeteld;
   - status: badge "Beschikbaar" met een oranje knop **Aanvragen**, of grijs met "Bezet op deze data". Bezette auto's sorteren onderaan. Zonder gekozen data staat er de knop "Kies je data", die naar de datumvelden scrolt;
   - een knop **Beschikbaarheid** die een maandkalender openklapt met vrije en bezette dagen; je kunt naar latere maanden bladeren.
4. **Voorwaarden** als een korte lijst met iconen, daarna de **veelgestelde vragen** als uitklapbare items (`<details>`).
5. **Footer**: adres, WhatsApp, e-mail en een link naar de privacyverklaring.

**Prestaties:** de pagina wordt statisch gegenereerd. De beschikbaarheid wordt na het laden vers opgehaald via `GET /api/availability` (niet gecachet, één verzoek voor alle auto's). Na een wijziging in de beheerpagina ververst `revalidatePath` de pagina. Foto's lopen via `next/image`. Het lettertype wordt mee-geladen via `next/font` vanaf de eigen site (niet van Google, in verband met de AVG).

**Vormgeving:** donkerblauw als basis, oranje voor knoppen, turquoise als accent en veel wit. Geen regenboogverlopen in de interface. Zonnig en vriendelijk, maar rustig en betrouwbaar: grote foto's, weinig tekst, grote knoppen.

**Bestanden van Drive** (alleen als bron): het logo uit `02 — Design & Branding`. Zolang de witte logoversie er niet is, toont de donkere footer de naam als tekst. De hero-foto is een placeholder totdat er een echte foto is aangeleverd.

**Contactgegevens:** WhatsApp, adres, e-mail en het adres van het kantoor staan in `src/config.ts` als placeholders.

**SEO per taal:** titel en beschrijving, `hreflang`-links tussen de talen, `sitemap.xml`, `robots.txt` en JSON-LD van het type `AutoRental`.

## 6. Aanvraagproces

1. De klant kiest data en klikt bij een beschikbare auto op **Aanvragen**.
2. Het formulier verschijnt over het hele scherm op mobiel en als venster op desktop. Bovenaan staan de auto en de data. Velden:
   - naam, e-mail, telefoon/WhatsApp (met landcode);
   - ophaal- en inleverdatum (al ingevuld, nog aan te passen; dan wordt de beschikbaarheid opnieuw gecontroleerd) met een tijd per half uur;
   - ophaallocatie luchthaven / accommodatie / kantoor. Bij luchthaven verschijnt het vluchtnummer (optioneel), bij accommodatie het adres (verplicht);
   - extra bestuurder (vinkje) en kinderzitjes (0–3);
   - een opmerking (optioneel), en akkoord met de voorwaarden (verplicht, met link);
   - een onzichtbaar lokveld (honeypot).
   Onderaan staat een totaalprijs die meeloopt met de keuzes.
3. Bij verzenden controleert een Server Action alles (zod) en roept `create_request` aan.
4. Daarna verschijnt een bevestigingsscherm met het referentienummer en de tekst: *dit is een aanvraag, nog geen bevestigde reservering; Happy Ride reageert binnen [24] uur met de betaalopties*. Daaronder staat een samenvatting.
5. Mails via Resend:
   - naar Happy Ride (`MAIL_TO_ADMIN`, in het Nederlands, met een directe link naar de aanvraag in `/beheer`);
   - een kopie naar de klant, in de taal van de klant.

**Foutafhandeling**
- `period_unavailable`: melding "Deze auto is net voor deze data aangevraagd". Het formulier blijft ingevuld en er is een knop naar de andere beschikbare auto's.
- Spamlimiet bereikt: melding dat de klant het later opnieuw kan proberen of via WhatsApp contact kan opnemen.
- Een mail mislukt: de aanvraag blijft staan, `mail_failed = true` en de beheerpagina toont "mail niet verstuurd".
- Validatiefouten verschijnen direct onder het veld, in de taal van de klant.

**Geplande functie (elk uur, Netlify)**
- Herinnering: aanvragen met `status = new`, `reminder_sent_at` leeg en `expires_at − nu ≤ 24 uur` → mail naar Happy Ride, daarna `reminder_sent_at` zetten.
- Verlopen: `expire_options()` → mail naar elke betrokken klant ("je optie is verlopen").
- Bij afwijzen door de beheerder krijgt de klant meteen een mail ("helaas niet beschikbaar"). Bij bevestigen gaat er geen automatische mail uit: Happy Ride stuurt zelf de betaalopties.

## 7. Beheerpagina

`/beheer`, alleen in het Nederlands en mobile-first, met onderin drie tabbladen: **Aanvragen · Kalender · Vloot**. Inloggen gaat met e-mail en wachtwoord via Supabase Auth, met de mogelijkheid het wachtwoord te herstellen.

**Aanvragen**
- Tabjes: Nieuw (met teller), Bevestigd, Afgewezen, Verlopen, Geannuleerd.
- Een kaart per aanvraag: referentie, auto, data, naam, totaal en "verloopt over X uur" (oranje bij minder dan 24 uur), plus "mail niet verstuurd" als dat van toepassing is.
- Detailscherm: alle gegevens, knoppen voor WhatsApp/mail/bellen, **Bevestigen** en **Afwijzen** (met bevestigingsvraag). Bij een bevestigde aanvraag staat er één knop **Annuleren** (met bevestigingsvraag, zonder automatische mail; Happy Ride regelt de afzegging zelf met de klant). Bij `rejected`, `expired` en `cancelled` zijn er geen actieknoppen.

**Kalender**
- Kies een auto en zie een maandoverzicht met optie (oranje), bevestigd (donkerblauw) en geblokkeerd (grijs). Tik op een periode voor de aanvraag of de notitie.
- **Periode blokkeren**: auto, dag van–tot (inclusief) en een notitie. Bij overlap toont de pagina met welke periode de blokkade botst. Een blokkade is ook weer te verwijderen.

**Vloot**
- Een lijst met volgorde, aan te passen met pijltjes.
- Toevoegen en bewerken: naam, schakel/automaat, zitplaatsen, koffers, airco, prijs per dag, foto en zichtbaar. Een foto wordt in de browser verkleind (max. 1600 px, WebP) voordat hij wordt geüpload.
- Verbergen: `visible = false`.
- Verwijderen kan alleen als de auto nooit is aangevraagd. Anders verwijst de pagina naar verbergen.
- Onderaan staan de prijzen van de extra's.

Elke wijziging die de publieke site raakt, roept `revalidatePath` aan.

**Handleiding:** `docs/handleiding-beheer.md`, in gewoon Nederlands, met stappen per taak.

## 8. Vertalingen

- Alle teksten (de site, de voorwaarden, de veelgestelde vragen, foutmeldingen en mails) staan in `messages/{nl,en,es}.json`. Autonamen worden niet vertaald.
- Vanaf stap 1 gaat elke tekst via `nl.json`. In stap 4 komen `en.json` en `es.json` erbij zonder dat er code verandert.
- De Engelse en Spaanse teksten schrijft Claude. Het advies is ze, vooral het Spaans, te laten nakijken door iemand die de taal goed spreekt.

## 9. Voorwaarden (placeholders, in de vertaalbestanden)

- Minimumleeftijd [23 jaar], rijbewijs minimaal [2 jaar] in bezit.
- Minimale huurduur [3 dagen].
- Borg [€ 400], terug bij inleveren zonder schade.
- Onbeperkt aantal kilometers.
- Basisverzekering inbegrepen, eigen risico [€ 500].
- Gratis ophalen en inleveren op de luchthaven.
- Tank vol ophalen, vol inleveren.
- Extra bestuurder [€ 5 per dag], kinderzitje [€ 5 per dag].
- Gratis annuleren tot [48 uur] voor ophalen.

## 10. Voorbeeldvloot (seed, met neutrale placeholderfoto's en het label "voorbeeld")

| Auto | Schakeling | Personen | Airco | Prijs per dag |
|---|---|---|---|---|
| Kia Picanto | automaat | 4 | ja | € 35 |
| Hyundai i20 | automaat | 5 | ja | € 42 |
| Suzuki Jimny | automaat | 4 | ja | € 60 |
| Kia Sportage | automaat | 5 | ja | € 70 |

## 11. Privacy (AVG)

- De privacyverklaring is een sjabloon met placeholders: welke gegevens worden verwerkt, met welk doel, de bewaartermijn [2 jaar] na de huurperiode, de verwerkers (Supabase in de EU; Netlify en Resend in de VS, met standaard EU-contractbepalingen) en de rechten van de betrokkene. Het is geen juridisch advies; laat hem controleren vóór livegang.
- Geen trackingcookies, dus geen cookiebanner. IP-adressen worden alleen gehasht opgeslagen, voor de spamlimiet.

## 12. Tests

- **Vitest**: dagen tellen, prijsberekening, datumvalidatie, en de gelijkheid van de regels in `src/config.ts` en de migratie.
- **PGlite** (de echte migraties):
  - aansluitende periodes (`[1,4)` en `[4,8)`) zijn toegestaan;
  - overlap wordt geweigerd, voor elke combinatie van optie, bevestigd en blokkade;
  - een verlopen optie komt vrij bij een nieuwe aanvraag;
  - `create_request` dwingt de minimale duur af, weigert data in het verleden en verborgen auto's, berekent de juiste prijs inclusief extra's en handhaaft de spamlimiet;
  - de statusovergangen van bevestigen, afwijzen, annuleren en verlopen werken, ongeldige overgangen worden geweigerd (een verlopen aanvraag kan bijvoorbeeld niet bevestigd worden), en na afwijzen of annuleren is de periode weer aan te vragen;
  - `get_availability()` geeft geen persoonsgegevens terug.
- **Gelijktijdigheid** (alleen als `TEST_DATABASE_URL` is ingesteld; een tweede Supabase-project als testdatabase): 20 gelijktijdige `create_request`-aanroepen voor dezelfde auto en dezelfde data → precies 1 slaagt, en 19 krijgen `period_unavailable`.
- **Playwright**: één happy-pathtest: data kiezen → Aanvragen → formulier invullen → bevestigingsscherm.

## 13. Bouwvolgorde

Elke stap krijgt een eigen implementatieplan, wordt gepusht naar GitHub en is te bekijken in een Netlify-preview.

1. **Basis en vloot met kalender**: het project opzetten, de migraties (schema, constraint, `get_availability`), de PGlite-tests voor de overlap, de seed-vloot, en de publieke pagina in het Nederlands (header, hero met datumkiezer, vlootkaarten met kalender, voorwaarden, veelgestelde vragen, footer).
2. **Aanvraagformulier**: `create_request`, het formulier, de Server Action, de mails, de spambeveiliging, de geplande functie, de gelijktijdigheidstest en de Playwright-test.
3. **Beheerpagina**: inloggen, aanvragen, kalender en blokkeren, de vloot en de extra's, de foto-upload en de handleiding.
4. **Vertalingen en afronding**: EN en ES, SEO, de privacyverklaring en een prestatiecontrole op mobiel.

**Wat de eigenaar regelt** (pas als het nodig is): een Supabase-account met een productie- en een testproject, een Resend-account met het domein `happyride.cw` geverifieerd (DNS-toegang nodig), en een Netlify-site gekoppeld aan de GitHub-repo.

## 14. Buiten scope

Online betalen, de chatbot (aparte map op Drive), het wijzigen van data in een bestaande aanvraag, meerdere beheerdersrollen, seizoensprijzen, statistieken/tracking, en een beheerpagina in andere talen.

## 15. Nog aan te leveren

Het WhatsApp-nummer, het adres (en het adres van het kantoor), het e-mailadres voor aanvragen, de echte vloot met foto's, het witte logo, een hero-foto, de definitieve waarden van de voorwaarden, de bewaartermijn en de openingstijden.
