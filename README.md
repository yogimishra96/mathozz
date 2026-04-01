# Mathozz 🧮
**Think fast. Go further.**

A production-ready mental math PWA built with Angular 21, Firebase, and raw Web APIs. No UI libraries. No AngularFire. Pure signals.

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
│   │   ├── app.component.ts   ← ALL UI screens + styles
│   │   ├── app.service.ts     ← ALL business logic
│   │   └── app.config.ts      ← Firebase init + app config
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
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
# Install Angular CLI globally (if needed)
npm install -g @angular/cli

# Create the Angular project
ng new mathozz --standalone --style=scss --routing=false

# Copy all generated files into the project
# (replace src/app/* and root config files as shown)

# Install dependencies
npm install

# Start dev server
ng serve
# → http://localhost:4200
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
| `0–9` | Type answer digits |
| `Enter` | Submit answer |
| `Backspace` | Delete last digit |
| `Escape` | Return to home |

---

## 10. PWA

The app includes `@angular/pwa` for offline support. After deploying, users can install it from their browser as a standalone app. The service worker caches app shell assets automatically.

---

## License

MIT — build something great.
