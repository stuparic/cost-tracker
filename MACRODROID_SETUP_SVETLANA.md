# MacroDroid podešavanje — Svetlana

Cilj: kad Svetlana nešto plati, notifikacija (Google Wallet / banka) se automatski
šalje u aplikaciju kao trošak „na čekanju", koji ona posle potvrdi.

---

## 1. Nalog i zajedničko domaćinstvo

1. Svetlana otvori aplikaciju i prijavi se **svojim Google nalogom**.
2. Da biste delili iste troškove, mora da bude u **istom domaćinstvu** kao Dejan:
   - Dejan: Podešavanja → **Kod za poziv** (npr. `ABC123`) — pošalji joj ga.
   - Svetlana: Podešavanja → polje **„Unesi kod za pridruživanje"** → ukuca kod → **Pridruži se**.

## 2. Njen webhook token

- U aplikaciji: Podešavanja → **„Token za notifikacije"** → tapni kopiraj.
  Izgleda ovako: `troskic-XXXXXXXXXX`.
- **Svaki član ima svoj token** — Svetlana NE koristi Dejanov. Njen draft ide na njen nalog.
- Ako se token ne vidi u aplikaciji (backend još nije ažuriran), uzmi ga iz Firestore
  konzole: kolekcija `users` → dokument sa njenim mejlom → polje `webhookToken`.

## 3. MacroDroid makro

**Okidač (Trigger):** Device Events → **Notification Received**
- Ograniči na aplikacije koje šalju obaveštenja o plaćanju (Google Wallet + njena banka),
  da ne okida na svaku notifikaciju.

**Akcija (Action):** **HTTP Request (POST)**
- **Method:** POST
- **URL:**
  `https://cost-tracker-utmayd66ga-ew.a.run.app/api/v1/webhook/payment-notification`
- **Content Type / Body type:** `application/json`  ← OBAVEZNO
- **Custom header:** ime `x-webhook-token`, vrednost **njen token** `troskic-XXXXXXXXXX`
- **Body (sadržaj):**

  ```json
  {"title":"[notification-title]","text":"[notification]","app":"[notification-app-package]"}
  ```

  `[notification-title]`, `[notification]`, `[notification-app-package]` su MacroDroid
  „magic text" promenljive — ubaci ih preko dugmeta za promenljive (ne kucaj ručno).

## 4. Test

Na računaru (zameni njen token):

```bash
curl -i -X POST 'https://cost-tracker-utmayd66ga-ew.a.run.app/api/v1/webhook/payment-notification' \
  -H 'x-webhook-token: troskic-XXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  --data '{"title":"Test","text":"Placeno 555,00 RSD MAXI","app":"com.test"}'
```

Očekivano: `200 {"status":"created", ...}`. Zatim: u aplikaciji na **njenom** nalogu,
ekran „Na čekanju" — draft treba da se pojavi.

Ili: neka napravi malu pravu kupovinu i proveri da makro okine i da se draft pojavi.

## Ako ne radi

| Odgovor / simptom | Uzrok | Rešenje |
|---|---|---|
| `401 Invalid webhook token` | pogrešan/zastareo token | uzmi aktuelni njen token iz Podešavanja |
| `400` (property should not exist / text must be string) | nema `Content-Type: application/json` | dodaj taj header / postavi body type na JSON |
| `422` (Could not extract an amount) | tekst notifikacije nema iznos + valutu | proveri koje obaveštenje šalje; treba npr. „555,00 RSD" |
| makro ne okida | dozvola za čitanje notifikacija / štednja baterije | dozvoli MacroDroid-u pristup notifikacijama, isključi optimizaciju baterije |
| draft se ne vidi | prijavljena na drugi nalog nego token, ili nije u istom domaćinstvu | token i login moraju biti isti nalog; proveri domaćinstvo |
