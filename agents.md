# Mathozz — Agent handbook

Use this file for **incremental changes**: stack, layout, conventions, and pitfalls. The app is a **mental math practice PWA** (production: **mathozz.com**), Firebase-backed, Angular standalone.

---

## Stack

| Area | Choice |
|------|--------|
| Framework | **Angular 21** (`@angular/core` ~21.2), **standalone** components only |
| Change detection | **Zoneless** (`provideZonelessChangeDetection()` in `app.config.ts`) |
| State | **Signals** (`signal`, `computed`) in `AppService` and components |
| Backend | **Firebase** — Auth (Google + email/password), **Firestore** |
| Hosting | **Firebase Hosting** — `public`: `dist/mathozz/browser` (`firebase.json`) |
| PWA | `@angular/service-worker` + `ngsw-config.json`; install UX via `PwaInstallService` |
| Styling | **SCSS** — global `src/styles.scss`, shell styles `src/app/app.scss` |
| Icons | **Font Awesome 6** via CDN import in `app.scss` (not npm) |
| Tests | `ng test` (Vitest-based builder per `package.json`) |

---

## Entry point and bootstrap

- **`src/main.ts`** bootstraps **`AppComponent`** with **`appConfig`** from `src/app/app.config.ts`.
- **`src/app/app.ts`** + **`src/app/app.html`**: legacy / unused default scaffold — **routing shell is `AppComponent`**, not `App`. Do not wire `app.ts` into `main.ts` unless intentionally replacing the shell.

---

## Project layout (important paths)

```
src/
  main.ts                 # Bootstrap
  index.html              # app-root, SEO meta, no inline app logic
  environments/
    environment.ts        # Dev: production=false, enableAnalytics=false
    environment.prod.ts   # Prod: production=true, enableAnalytics=true
  app/
    app.config.ts         # Router, Firebase init, service worker, exports firebaseApp/auth/db (+ getAnalytics)
    app.component.ts      # Root: <router-outlet />, auth navigation patches, injects PWA + GA
    app.scss              # Global shell + Font Awesome CDN import
    app.service.ts        # Large: auth, game, Firestore, leaderboard, guest, feedback, theme, geo
    google-analytics.service.ts  # GA4 via gtag (SPA page views, User-ID, Play virtual paths)
    pwa-install.service.ts       # beforeinstallprompt / install
    dashboard.component.ts
    play.component.ts
    profile.component.ts
    login.component.ts
    reports.component.ts  # Feedback / problem reports admin-style UI
public/                   # Static assets (copied to build)
firebase.json             # Hosting + Firestore config paths
firestore.rules           # Security rules
ngsw-config.json          # Service worker asset groups
angular.json              # Build: production uses fileReplacements for environments
```

---

## Routing (`app.config.ts`)

| Path | Component | Notes |
|------|-----------|--------|
| `''` | redirect → `dashboard` | |
| `dashboard` | `DashboardComponent` | Home / stats / start game |
| `play` | `PlayComponent` | Game UI; internal **screens** via `AppService.currentScreen` |
| `profile` | `ProfileComponent` | Signed-in profile |
| `login` | `LoginComponent` | Google + email auth |
| `feedback-report` | `ReportsComponent` | Problem reports list (admin-oriented) |
| `**` | redirect → `dashboard` | |

**URLs vs game “screens”:** Only **`/play`** is a route. Inside play, flow uses **`AppService.currentScreen`**: `'home' \| 'game' \| 'result' \| 'login' \| 'leaderboard' \| 'profile'` (see `Screen` type in `app.service.ts`). Analytics sends **virtual paths** like `/play/game` from `PlayComponent` + `GoogleAnalyticsService`.

---

## Core services

### `AppService` (`app.service.ts`)

Single large injectable — **prefer extending existing methods** over duplicating game/auth logic.

- **Auth:** `onAuthStateChanged` → loads/merges Firestore user doc; `loginWithGoogle`, `loginWithEmail`, `signupWithEmail`, `logout`. **AppComponent** wraps login methods to `navigate(['/dashboard'])` on success.
- **Guest mode:** localStorage guest stats; cap **50** free problems (`GUEST_LIMIT`), then gate → login.
- **Game:** `startGame`, `nextProblem`, timer, difficulty from streak, `submitAnswer`, pause/save, `submitFeedback`, etc.
- **Firestore:** `users/{uid}`, `leaderboard/{uid}`, `problem-reports` (feedback).
- **Leaderboard:** `fetchLeaderboard` with scope global / country / city; geo from `detectLocation()`.

### `GoogleAnalyticsService`

- Loads **gtag** when `environment.enableAnalytics` and `firebase.measurementId` are set and **browser**.
- SPA **`gtag('config', measurementId, { page_path, page_location, page_title })`** on navigation + `afterNextRender` fallback (avoids missing first hit).
- Skips bare `/play` in router; **Play** emits `/play/<screen>` virtual paths.
- Sets GA **User-ID** to Firebase `uid` when logged in.
- **`firebaseAnalytics`** from `getAnalytics(firebaseApp)` in `app.config.ts` is **exported but unused** elsewhere; live measurement is **gtag** here. Avoid double-counting if you wire Firebase Analytics `logEvent` for the same events.

### `PwaInstallService`

Listens for `beforeinstallprompt`, exposes `canPrompt`, `promptInstall()`, `isStandalone()`. **Eager-injected** from `AppComponent` so the event is not missed if the user opens `/play` late.

---

## Environments — critical

- All code imports **`../environments/environment`** (path alias to the file named `environment.ts`).
- **`angular.json`** production config **`fileReplacements`** swaps:
  - `src/environments/environment.ts` → **`src/environments/environment.prod.ts`**
- Without this, production builds would keep **`enableAnalytics: false`** and dev flags. **Always verify `fileReplacements` after changing Angular build config.**

---

## Firebase

- **Init:** `initializeApp(environment.firebase)` in `app.config.ts`; `getAuth`, `getFirestore` (and `getAnalytics`) use the same `firebaseApp`.
- **Firestore collections (from rules + code):**
  - `users/{userId}` — owner-only read/write
  - `leaderboard/{userId}` — any authed read; owner write
  - `problem-reports/{reportId}` — open create; read/update currently permissive for admin testing (**tighten for production** if needed)

---

## Build and deploy

```bash
npm run start          # ng serve (development build target)
npm run build          # production (default) — same as build:prod
npm run build:prod     # explicit production + fileReplacements
npm run build:dev      # development config
firebase deploy        # hosting expects dist/mathozz/browser per firebase.json
```

- **Service worker** caches `index.html`, JS, CSS — after deploy, testers may need **hard refresh** or **unregister SW** to pick up new bundles.
- **Budget warning:** `app.scss` may exceed `anyComponentStyle` budget; builds still succeed with a warning until budgets are adjusted.

---

## UI conventions

- **Standalone** components: `imports: [...]` in `@Component`; templates often use **`@if` / `@for`** (control flow).
- **Theme:** `AppService.isDarkMode()`; `AppComponent` host class `theme-light` when light.
- **Shared chrome:** Dashboard / Profile duplicate sidebar + mobile bottom nav patterns — keep visual consistency when adding nav items.
- **Icons:** Font Awesome classes (`fa-solid`, etc.) — stylesheet from `app.scss`.

---

## Incremental change guidelines

1. **Touch minimal files** — match existing naming, signals, and `ChangeDetectionStrategy.OnPush`.
2. **Do not break zoneless** — avoid relying on Zone.js; use signals, `async`/`await`, or explicit updates.
3. **Auth + navigation** — if adding post-login behavior, remember **AppComponent** patches auth methods to navigate to `/dashboard`.
4. **New routes** — add to `provideRouter([...])` in `app.config.ts`; consider GA (`GoogleAnalyticsService`) for page paths.
5. **Firestore** — update **`firestore.rules`** and **`firestore.indexes.json`** when adding queries/collections.
6. **Secrets** — Firebase keys in environment files are **public** (normal for client SDK); protect data with **rules**, not hiding keys.
7. **Dead / legacy files** — `app.ts` / `app.html` are not the live shell; safe to remove only if you confirm no references.

---

## Optional manual checks

- **GA4 / Firebase Analytics:** Use **Realtime** after deploy; standard reports can lag.
- **E2E:** `problem-solve-test-e2e.js` at repo root (separate from `ng test`).

---

*Last aligned with repo layout and Angular 21 standalone patterns. Update this file when architecture or deploy paths change.*
