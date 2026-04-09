# Mathozz 🧮
**Think fast. Go further.**

A production-ready mental math PWA built with Angular 21, Firebase, and raw Web APIs. No UI libraries. No AngularFire. Pure signals.

---

## Guide for AI coding agents

Use this section to orient quickly before editing code. Prefer **small, focused changes**; match existing patterns (standalone components, signals, `AppService` as the single state hub).

### Architecture

| Piece | Role |
|--------|------|
| `AppComponent` | Root shell: theme host class, `<router-outlet />`, and **one-time patches** on `AppService.loginWithGoogle` / `loginWithEmail` / `signupWithEmail` to navigate to `/dashboard` after successful auth. |
| `AppService` | **All shared state** (signals): auth user, game session, guest progress, leaderboard fetch, theme, `currentScreen` for game/result/home overlays used by play logic, `userStatsReady` for dashboard stats hydration, etc. Firebase Auth + Firestore via modular SDK in `app.config.ts` exports. |
| Routed pages | `DashboardComponent`, `ProfileComponent`, `PlayComponent`, `LoginComponent`, `ReportsComponent` — each standalone, most logic delegated to `AppService`. |
| Styles | Global UI in `app.scss` (imported by `AppComponent`, `ViewEncapsulation.None`). |

### Routes (`app.config.ts`)

| Path | Component | Notes |
|------|------------|--------|
| `''` | → redirect `dashboard` | |
| `dashboard` | `DashboardComponent` | Signed-in stats; guest banner. |
| `profile` | `ProfileComponent` | |
| `play` | `PlayComponent` | Game UI; starts a game on init if `currentScreen` is not `game`. |
| `login` | `LoginComponent` | Full-screen auth; sets `currentScreen` to `'login'` on init. |
| `admin-reports-secret-2024` | `ReportsComponent` | Admin. |
| `**` | → `dashboard` | |

### Auth and data loading

- **Guest** is modeled as `AppService.user() === null` (`isGuest` computed).
- On Firebase login, `onUserLogin` merges Firestore user doc + local guest progress; **`userStatsReady`** gates dashboard stat numbers until the Firestore read completes (writes to Firestore must not block showing merged stats).
- **Guest limit (50 problems):** service navigates to `/login` via `Router` when the limit hits.

### Game / play behavior

- **`currentScreen`:** `'game'` while playing; `'result'` exists in the type and `AppService.endGame()` but **play UI no longer shows a result screen** — stopping the game clears saved state, sets screen to `'home'`, and **navigates to `/dashboard`**.
- Pause + “go home” saves in-progress state to `localStorage` for resume.

### Firebase

- Collections and fields: see **§ Firestore Collections Reference** below.
- Deploy: `firebase deploy` (hosting build output `dist/mathozz/browser` per `firebase.json`).

### Commands

```bash
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # production build
npm test           # unit tests (Vitest-powered where configured)
```

### Conventions to preserve

- **Standalone** components; **zoneless** change detection (`provideZonelessChangeDetection`).
- State in **`signal` / `computed`** on `AppService`, not scattered duplicated state.
- **No AngularFire** — use `firebase/auth` and `firebase/firestore` directly.
- Do not add heavy UI frameworks; keep SCSS + CSS variables consistent with `app.scss`.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Angular 21 (standalone, zoneless) |
| State | Angular Signals only |
| Auth + DB | Firebase Modular SDK v12+ (no compat, no AngularFire) |
| Styles | Inline SCSS + CSS variables |
| Audio | Web Audio API (no library) |
| Confetti | Canvas API (no library) |
| PWA | @angular/pwa |

---

## Project Structure

```
mathozz/
├── src/
│   ├── app/
│   │   ├── app.component.ts      ← Root shell, router-outlet, auth navigation patches
│   │   ├── app.service.ts        ← Signals, Firebase, game logic
│   │   ├── app.config.ts         ← Firebase init, `provideRouter`, SW
│   │   ├── app.scss              ← Global styles
│   │   ├── dashboard.component.ts
│   │   ├── profile.component.ts
│   │   ├── play.component.ts
│   │   ├── login.component.ts
│   │   ├── reports.component.ts
│   │   └── pwa-install.service.ts
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   └── main.ts
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
└── package.json
```

---

## 1. Firebase Console Setup

### Create a Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `mathozz` → Continue
3. Disable or enable Google Analytics (your choice) → Create project

### Register a Web App
1. In the project overview, click the **</>** (Web) icon
2. Name it `mathozz-web` → Register app
3. Copy the `firebaseConfig` object — you'll need it below

### Enable Authentication
1. Go to **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Enable **Google** → set your support email → Save
4. Enable **Email/Password** → Save

### Enable Firestore
1. Go to **Build → Firestore Database → Create database**
2. Start in **production mode**
3. Choose a region close to your users (e.g. `us-central`, `europe-west`)
4. Click Done

### Deploy Firestore Rules & Indexes
After setting up Firebase CLI (see step 4), run:
```bash
firebase deploy --only firestore
```

---

## 2. Replace Environment Keys

Open `src/environments/environment.ts` and `environment.prod.ts`, replace every `REPLACE_ME` with your actual Firebase config values:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSy...',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123'
  }
};
```

**Never commit real keys to a public repo.** Use environment variables or Firebase App Check in production.

---

## 3. Local Development

```bash
npm install
npm start
# → http://localhost:4200  (same as `ng serve`)
```

---

## 4. Firebase CLI Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize Firebase in your project root
firebase init

# Select:
#   ◉ Firestore
#   ◉ Hosting
# Use existing project → select your mathozz project
# Hosting public dir: dist/mathozz/browser
# Single-page app: Yes
# Auto-deploy with GitHub: Optional
```

---

## 5. Deploy to Production

```bash
# Build
ng build --configuration production

# Deploy everything (hosting + firestore rules + indexes)
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only firestore
```

Your app will be live at `https://your-project-id.web.app`.

---

## 6. Firestore Collections Reference

### `users/{userId}`
```
displayName: string
email: string
photoURL: string
totalSolved: number
totalCorrect: number
accuracy: number          // 0–100
currentStreak: number
bestStreak: number
dailyStreak: number
lastPlayedDate: string    // ISO date "YYYY-MM-DD"
xp: number
level: number
averageResponseMs: number
country: string
city: string
isPremium: boolean        // always false for now
badges: string[]
createdAt: Timestamp
updatedAt: Timestamp
```

### `leaderboard/{userId}`
```
displayName: string
photoURL: string
xp: number
level: number
accuracy: number
bestStreak: number
averageResponseMs: number
country: string
city: string
updatedAt: Timestamp
```

---

## 7. Game Rules

| Difficulty | Streak Range | Number Range | XP/correct |
|---|---|---|---|
| Easy | 0–9 | 1–10 | +10 |
| Medium | 10–24 | 10–50 | +20 |
| Hard | 25+ | 50–200 | +35 |

- **Wrong answer**: streak resets to 0, no XP penalty
- **Time up (15s)**: treated as wrong answer
- **Guest mode**: 50 free problems, then soft login gate
- **Guest data** merges additively into Firestore on first login

---

## 8. Badges

| Badge ID | Emoji | Condition |
|---|---|---|
| `first_blood` | 🩸 | First correct answer ever |
| `streak_10` | 🔥 | Reach streak of 10 |
| `streak_25` | ⚡ | Reach streak of 25 |
| `speed_demon` | ⚡ | Answer in under 3 seconds |
| `century` | 💯 | 100 total problems solved |

---

## 9. Keyboard Shortcuts

| Key | Action |
|---|---|
| `0–9` | Type answer digits (play screen) |
| `Enter` | Submit answer |
| `Backspace` | Delete last digit |
| `Space` | Pause / resume (play screen) |
| `Escape` | On **play**: pause and go to dashboard (saved game). On **login**: go to dashboard. |

---

## 10. PWA

The app includes `@angular/pwa` for offline support. After deploying, users can install it from their browser as a standalone app. The service worker caches app shell assets automatically.

---

## License

MIT — build something great.
