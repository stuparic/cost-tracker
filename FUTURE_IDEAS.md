# Troškić - Budući Razvoj

Predložene ideje za unapređenje aplikacije Troškić za praćenje troškova domaćinstva.

---

## 📊 Analitika i Vizualizacija

### Grafikoni Troškova i Prihoda
**Prioritet:** Visok
**Opis:** Dodati interaktivne grafikone koji prikazuju trendove trošenja i prihoda.

**Funkcionalnosti:**
- Linijski grafikoni za prikaz trendova po mesecima
- Bar grafikoni za poređenje kategorija troškova
- Pie grafikoni za raspodelu po kategorijama
- Filteri po periodu (mesec, kvartal, godina)
- Poređenje sa prethodnim periodima
- Zoom i pan funkcionalnosti za detaljniju analizu

**Tehnologije:** Chart.js, D3.js, ili ApexCharts

---

### Balans Stranica
**Prioritet:** Visok
**Opis:** Centralna stranica koja prikazuje finansijsko stanje domaćinstva.

**Funkcionalnosti:**
- Pregled ukupnog stanja (prihodi - troškovi)
- Balans po valutama (EUR, RSD)
- Balans po osobama (Svetla, Dejan)
- Projekcija stanja za naredni mesec (na osnovu ponavljajućih stavki)
- Alarmi kada je stanje ispod određenog praga
- Mesečni, kvartalni i godišnji pregled
- Poređenje sa ciljevima štednje

**UI Elementi:**
- Veliki prikazni brojevi (KPI kartice)
- Mini grafikoni sa trendovima
- Vizuelni indikatori (zeleno/crveno za pozitivan/negativan trend)

---

## 🤖 AI i Pametne Funkcionalnosti

### AI Predlozi za Uštedu
**Prioritet:** Srednji
**Opis:** Iskoristi veštačku inteligenciju za analizu navika trošenja i davanje personalizovanih saveta.

**Funkcionalnosti:**
- Analiza obrazaca trošenja
- Identifikacija nepotrebnih troškova
- Predlozi kategorija gde se može uštedjeti
- Poređenje sa sličnim domaćinstvima (anonimno)
- Mesečni izveštaji sa AI analizom
- Predviđanje budućih troškova na osnovu istorije
- Detektovanje neobičnih troškova (anomaly detection)

**Primeri Predloga:**
- "Prošlog meseca ste potrošili 20% više na hranu nego obično"
- "Vaši troškovi za struju su 15% viši od proseka"
- "Mogli biste uštedjeti 5.000 RSD mesečno smanjenjem troškova za kafiće"

**Tehnologije:** OpenAI API, Claude API, ili vlastiti ML modeli

---

### Motivacione Poruke i Gamifikacija
**Prioritet:** Nizak
**Opis:** Uvesti elemente igre kako bi praćenje troškova bilo zabavnije i motivisućije.

**Gamifikacija Elementi:**
- **Achievementi/Nagrade:**
  - "Štediša" - Uštedili ste 10.000 RSD ovog meseca
  - "Marljivi knjižničar" - Dodali ste 100 troškova
  - "Budžetski majstor" - Niste prekoračili budžet 3 meseca zaredom
  - "Early Bird" - Dodali ste sve troškove u roku od 24h

- **Nivoi i Poeni:**
  - Poeni za dodavanje troškova na vreme
  - Poeni za postizanje ciljeva štednje
  - Napredovanje kroz nivoe (Početnik → Šteđa → Majstor Finansija)

- **Izazovi:**
  - "No Coffee Week" - Ne troši na kafu jednu nedelju
  - "Budget Challenge" - Uštedi 20% od prihoda ovaj mesec
  - "Zero Fast Food Month" - Mesec bez brze hrane

- **Leaderboard:**
  - Rangiranje članova domaćinstva (prijateljska konkurencija)
  - Weekly/monthly challenges

**Motivacione Poruke:**
- Dnevne motivacione poruke
- Pozitivni feedback pri postizanju ciljeva
- Fun činjenice o štednji
- Emojiši i animacije za postignuća

---

## 📱 Poboljšanje Unosa Podataka

### Skeniranje Računa (OCR)
**Prioritet:** Visok
**Opis:** Omogućiti korisnicima da fotografišu račune i automatski izvuku podatke.

**Funkcionalnosti:**
- Fotografisanje računa mobilnim telefonom
- OCR za izvlačenje podataka (iznos, prodavnica, datum, proizvodi)
- Automatsko popunjavanje forme za trošak
- Pregled i korekcija pre čuvanja
- Čuvanje slike računa kao attachment
- Podrška za različite formate računa (srpski, EU)

**Tehnologije:**
- Tesseract.js (OCR u browseru)
- Google Cloud Vision API
- Azure Computer Vision
- AWS Textract

**Napredne Funkcionalnosti:**
- Automatska kategorizacija na osnovu prodavnice
- Bulk unos više računa odjednom
- Detekcija duplikata

---

### Glasovni Interfejs
**Prioritet:** Srednji
**Opis:** Dodati mogućnost glasovnog unosa troškova i prihoda.

**Funkcionalnosti:**
- "Hey Troškić, dodaj trošak 2000 dinara u Maxiju"
- "Dodaj prihod 50.000 dinara plata"
- "Koliko sam potrošio ovog meseca?"
- "Prikaži troškove za hranu"
- Podrška za srpski jezik
- Rad offline (Web Speech API)
- Potvrda pre čuvanja

**Tehnologije:**
- Web Speech API (native u browseru)
- Google Speech-to-Text API
- Whisper API (OpenAI)

**Komande:**
- Dodavanje: "Dodaj trošak/prihod [iznos] [valuta] [kategorija/izvor]"
- Pregled: "Koliko sam potrošio na [kategorija] ovog meseca?"
- Statistika: "Prikaži balans"

---

## 📲 Notifikacije i Podsećanja

### Push Notifikacije
**Prioritet:** Visok
**Opis:** Slanje notifikacija za različite događaje (već planirana u zasebnom planu).

**Tipovi Notifikacija:**
- ✅ Ponavljajući troškovi/prihodi kreirani automatski
- Budžet alarmi (približavanje ili prekoračenje limita)
- Dnevni podsjetnici za unos troškova
- Nedeljni izveštaji
- Važni događaji (npr. "Plata Dejana sutra")
- Neobični troškovi detektovani

---

### SMS/Email Izveštaji
**Prioritet:** Nizak
**Opis:** Slanje periodičnih izveštaja putem SMS-a ili email-a.

**Funkcionalnosti:**
- Nedeljni/mesečni email izveštaji
- SMS notifikacije za važne događaje
- PDF prilog sa detaljnim izveštajima
- Konfigurisanje frekvencije i sadržaja

---

## 🎯 Budžetiranje i Ciljevi

### Budžet po Kategorijama
**Prioritet:** Visok
**Opis:** Postavljanje mesečnih budžeta za svaku kategoriju troškova.

**Funkcionalnosti:**
- Postavljanje limita po kategorijama (hrana, transport, zabava, itd.)
- Vizuelni indikatori (progress bar) koliko je potrošeno
- Alarmi kada se približi ili pređe limit
- Automatski predlozi budžeta na osnovu istorije
- Fleksibilni budžet (prenos nepotrošenog u sledeći mesec)

---

### Ciljevi Štednje
**Prioritet:** Srednji
**Opis:** Postavljanje finansijskih ciljeva i praćenje napretka.

**Funkcionalnosti:**
- Kreiranje ciljeva (npr. "Letovanje - 200.000 RSD do jula")
- Vizualni prikaz napretka
- Automatsko izdvajanje sredstava
- Predlozi koliko mesečno treba uštediti
- Podciljevi (milestones)
- Celebrate animacije pri postizanju cilja

**Primeri Ciljeva:**
- Letovanje
- Kupovina automobila
- Štednja za nepredviđene troškove
- Kupovina stana

---

## 📤 Export i Deljenje

### Export Podataka
**Prioritet:** Srednji
**Status:** ✅ Delimično implementirano (CSV i JSON backup, iz Bilans stranice)

**Formati:**
- ✅ CSV (za Excel/Google Sheets) — dugmići "Troškovi CSV" / "Prihodi CSV" na Bilans stranici, poštuju izabrani mesec i osobu
- PDF izveštaji
- ✅ JSON (backup) — dugme "Pun backup (JSON)" na Bilans stranici, preko `GET /backup/json`
- Excel (.xlsx) sa formatiranjem

**Opcije:**
- ✅ Export filtriranog skupa (mesec + osoba, preko `GET /expenses/export/csv` i `/incomes/export/csv`)
- ✅ Export svih podataka (bez filtera) na jedan klik — `GET /backup/json` vraća sve troškove, prihode i budžete odjednom
- Periodični automatski backup
- Export sa grafikonima i analizom

---

### Deljenje Izveštaja
**Prioritet:** Nizak
**Opis:** Generisanje i deljenje izveštaja sa drugim članovima.

**Funkcionalnosti:**
- Generisanje shareable link-a
- PDF izveštaji sa custom brendingom
- Slanje izveštaja emailom direktno iz aplikacije

---

## 🏷️ Tagovi i Napredna Kategorizacija

### Custom Tagovi
**Prioritet:** Srednji
**Opis:** Omogućiti fleksibilnije tagovanje troškova.

**Funkcionalnosti:**
- Višestruki tagovi po trošku (npr. #poklon #rođendan #mama)
- Kreiranje custom tag-ova
- Filtriranje po tagovima
- Tag cloud vizualizacija
- Auto-suggestion tag-ova

---

### Pametna Kategorizacija
**Prioritet:** Srednji
**Opis:** Automatsko prepoznavanje i kategorizacija na osnovu naziva prodavnice.

**Funkcionalnosti:**
- Mašinsko učenje za kategorizaciju
- User-definisana pravila
- Istorija odluka za poboljšanje preciznosti
- Bulk re-kategorizacija

---

## 💳 Bankovna Integracija

### Automatski Import Transakcija
**Prioritet:** Visok (Ali kompleksan)
**Opis:** Povezivanje sa bankovnim računom za automatski import transakcija.

**Funkcionalnosti:**
- Open Banking API integracija
- Automatsko povlačenje transakcija
- Smart matching sa postojećim troškovima
- Review queue za nove transakcije
- Detekcija duplikata

**Izazovi:**
- Sigurnost i privatnost
- Podrška za srpske banke
- PSD2 compliance

---

## 🔔 Podsećanja i Obaveštenja

### Custom Podsećanja
**Prioritet:** Srednji
**Opis:** Podešavanje custom podsećanja za različite stavke.

**Funkcionalnosti:**
- Podsećanje za plaćanje računa
- Podsećanje za unos troškova
- Podsećanje za reviziju budžeta
- Fleksibilno planiranje (dnevno, nedeljno, mesečno)

---

## 📊 Napredni Izveštaji

### Detaljni Finansijski Izveštaji
**Prioritet:** Srednji
**Opis:** Profesionalni izveštaji sa dubinskom analizom.

**Tipovi Izveštaja:**
- Cash flow analiza
- Income statement (prihodi i rashodi)
- Trend analiza
- Year-over-year poređenje
- Kategorizovani troškovi sa sub-kategorijama
- Custom periodi

---

## 🌙 Dark Mode i Accessibility

### Dodatni Vizuelni Modovi
**Prioritet:** Nizak
**Opis:** Više opcija za prikaz.

**Funkcionalnosti:**
- Pravi dark mode (trenutno ima samo teme boja)
- High contrast mode
- Accessibility features (screen reader support, keyboard navigation)
- Font size adjustment
- Color blind friendly themes

---

## 🔐 Sigurnost i Privatnost

### Dodatne Sigurnosne Funkcionalnosti
**Prioritet:** Srednji
**Opis:** Poboljšanje sigurnosti aplikacije.

**Funkcionalnosti:**
- Biometrijska autentifikacija (fingerprint, Face ID)
- Two-factor authentication (2FA)
- Enkripcija osjetljivih podataka
- Session management
- Activity log (ko je šta promenio)
- Privacy mode (skrivanje iznosa)

---

## 👥 Multi-User i Saradnja

### Poboljšanja za Više Korisnika
**Prioritet:** Srednji
**Opis:** Bolje funkcionalnosti za domaćinstva sa više članova.

**Funkcionalnosti:**
- User roles i permissions
- Podela troškova (split bills)
- Zajednički i lični budžeti
- Commenting na troškove
- Approval flow za velike troškove
- Notifications kad drugi član doda trošak

---

## 📱 Mobilna Aplikacija

### Native Mobile App
**Prioritet:** Visok (Ali kompleksan)
**Opis:** Kreiranje native mobilne aplikacije za iOS i Android.

**Funkcionalnosti:**
- Sve funkcionalnosti web verzije
- Offline mode
- Push notifications
- Widget za home screen
- Quick actions
- Biometrijska autentifikacija

**Tehnologije:**
- React Native
- Flutter
- Progressive Web App (PWA) kao alternativa

---

## 🔄 Automatizacija

### IFTTT / Zapier Integracija
**Prioritet:** Nizak
**Opis:** Integracija sa automation platformama.

**Use Cases:**
- Automatski dodaj trošak kada stigne SMS od banke
- Sinhronizuj sa Google Calendar
- Backup na Google Drive/Dropbox
- Slanje u Slack/Discord kanal

---

## 💡 Ostale Ideje

### Prilagođeni Valutni Kursevi
**Prioritet:** Srednji
**Opis:** Dozvoli korisnicima da podese vlastite kurseve ili koriste različite izvore.

**Funkcionalnosti:**
- Manual override exchange rate
- Multiple currency support (više od EUR/RSD)
- Historical exchange rates
- Crypto currency support

---

### Attachments i Dokumenti
**Prioritet:** Srednji
**Opis:** Prikačivanje dokumenata uz troškove/prihode.

**Funkcionalnosti:**
- Upload računa (PDF, slike)
- Multiple attachments po trošku
- Preview u aplikaciji
- Cloud storage (Firebase Storage)

---

### Predlošci (Templates)
**Prioritet:** Nizak
**Opis:** Brzi unos čestih troškova pomoću predložaka.

**Funkcionalnosti:**
- Kreiranje custom template-a
- Quick action buttons za česte troškove
- Predloženi template-i (gorivo, kafa, računi)

---

## 🚀 Implementacioni Prioriteti

### Faza 1 - Essential (Sledeća 3 meseca)
1. ✅ Ponavljajući troškovi i prihodi
2. Balans stranica
3. Osnovni grafikoni
4. Budžet po kategorijama

### Faza 2 - Enhanced Experience (3-6 meseci)
1. OCR skeniranje računa
2. AI predlozi za uštedu
3. Push notifikacije (kompletno)
4. Export podataka

### Faza 3 - Advanced Features (6-12 meseci)
1. Glasovni interfejs
2. Native mobile app
3. Bankovna integracija
4. Napredna gamifikacija

### Faza 4 - Premium Features (12+ meseci)
1. AI assistant
2. Multi-household support
3. Financial advisor integration
4. Crypto tracking

---

## 📝 Napomene

- Sve funkcionalnosti treba implementirati postepeno, sa testiranjem i user feedback-om
- Prioriteti mogu da se menjaju na osnovu user needs
- Fokus na UX i jednostavnost korišćenja
- Održavanje brzog i responzivnog interfejsa
- Sigurnost i privatnost podataka su ključni

---

**Poslednja izmena:** 2026-07-10
**Verzija:** 1.0

---

## 💡 Ideje — jul 2026 (sa Claude sesije)

Redosled po odnosu vrednost/trud:

### Brzi dobici
1. **Detektor pretplata** (Rocket Money stil) — automatski prepoznaje ponavljajuće naplate
   (Netflix, YouTube, Google *Travel Town mikrotransakcije...). Kartica "Pretplate: X RSD mesečno".
2. **Trend kroz mesece** — linijski grafikon trošak/prihod/neto po mesecima na Bilansu,
   poređenje sa 3-mesečnim prosekom.
3. **Insight kartice na Početnoj** — "Restorani 40% iznad proseka", projekcija potrošnje
   do kraja meseca po trenutnom tempu.

### Srednji zalogaji
4. **OCR računa** — slikaj račun, Gemini (već u stacku) izvuče iznos/prodavnicu/stavke.
   Rešava nevidljivo trošenje gotovine (100k+ RSD podignuto u junu).
5. **Praćenje keš novčanika** — ATM podizanja pune "novčanik", keš troškovi ga prazne.
6. **Budžet alarmi** — PWA push na 80% / 100% budžeta kategorije (budžeti već postoje).

### Krupnije
7. **Ciljevi štednje** — cilj sa progres barom ("Letovanje 2027: 40%").
8. **Godišnji izveštaj** — year-over-year, top prodavnice, najskuplji mesec.
