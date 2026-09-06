# Plan: Auth sistem + Household (dogovoreno 10.07.2026)

## Odluke
- **Google login za sve** — svako sa Google nalogom može da se prijavi i dobija svoj (prazan) household.
- **Ulazak u tuđi household samo uz invite kod** — Dejan pravi kod, Svetla ga unosi pri prvom loginu.
- **Privatni troškovi** — trošak može biti označen kao privatan: ulazi u lični pregled vlasnika i u
  ukupan bilans householda, ali su detalji (prodavnica, opis) skriveni od ostalih članova.
- **Draft troškovi se rade POSLE auth-a** (odluka 10.07.): notifikacije → nevidljivi draft vezan za uid
  → vlasnik potvrđuje pojedinačno ili sve odjednom, ili odbacuje bez traga. Prototip je postojao i
  namerno je odbačen da bi se gradio direktno na uid umesto na imenima.

## Arhitektura
- **Firebase Authentication** (Google provider)
  - Frontend: login ekran (signInWithPopup/redirect), auth store, ID token u svakom API pozivu
    (axios interceptor), logout u sidebar-u.
  - Backend: Nest `AuthGuard` — firebase-admin `verifyIdToken`, `request.user = { uid, email, name }`.
    Webhook endpoint ostaje na svom tokenu (telefon ne zna za Google).
- **Kolekcije**
  - `users/{uid}`: displayName, email, photoURL, householdId, webhookToken (lični, za MacroDroid)
  - `households/{id}`: name, memberUids[], inviteCode (regeneriše se), createdAt
  - expenses/incomes/drafts/budgets/recurring: + `householdId`, + `createdByUid`,
    + `private: boolean` (samo expenses)
- **Webhook per-user**: `x-webhook-token` se traži u users kolekciji → createdBy/uid iz tokena.
  Svetla dobija svoj token i svoj MacroDroid makro.
- **Migracija postojećih podataka**: skripta — sve postojeće dokumente u Dejanov household;
  createdBy "Dejan"/"Svetla" → uid mapiranje kad se oba naloga prvi put uloguju.
- **UI**: UserSelectionDialog i user store se uklanjaju; person filteri ("Svi/Svetla/Dejan")
  čitaju članove householda; avatar u headeru = Google slika + meni (invite kod, logout).

## Faze implementacije
1. Firebase Auth frontend (login ekran, auth store, token interceptor) + backend guard na svim rutama
2. users/households bootstrap endpoint (`GET /me` → kreira user doc + household ako ne postoje)
3. Invite kod: prikaz u podešavanjima, `POST /households/join { code }`
4. householdId/createdByUid na svim kolekcijama + migracija postojećih podataka
5. Per-user webhook tokeni + MacroDroid uputstvo za Svetlu
6. Privatni troškovi (flag + maskiranje u API odgovorima za ne-vlasnike)
7. Draft troškovi: notifikacije → draft (kolekcija expenseDrafts, vezano za uid) → ekran
   "Na čekanju" (potvrdi/odbaci, potvrdi sve) + kartica na Početnoj za sopstvene draftove
8. Čišćenje: uklanjanje starog user store-a i dijaloga
