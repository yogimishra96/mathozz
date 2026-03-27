# 🟠 Mathoxx — Setup & Deployment Guide

## Repository layout

```
mathoxx/
├── src/                    Angular 21 app source
├── public/                 Static assets + PWA icons + manifest
├── firebase.json           Hosting + Firestore paths
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── angular.json
├── package.json
└── README.md               This file
```

The legacy single-file `index.html` / `sw.js` / root `manifest.json` stack was removed; the app is **Angular + `@angular/service-worker`** only.

---

## 🔥 Step 1: Firebase Setup (15 minutes)

### 1.1 Create Project
1. Go to **https://console.firebase.google.com**
2. Click **Add project** → Name it `mathoxx`
3. Disable Google Analytics (optional) → Create

### 1.2 Enable Authentication
1. Left sidebar → **Authentication** → Get Started
2. **Sign-in method** tab → Enable:
   - ✅ **Email/Password**
   - ✅ **Anonymous**

### 1.3 Enable Firestore
1. Left sidebar → **Firestore Database** → Create database
2. Choose **Start in test mode** → Select your region → Enable

### 1.4 Get Config
1. Project Settings (gear icon) → **General** → Your apps
2. Click **</>** (Web) → Register app (e.g. `mathoxx-web`)
3. Copy the `firebaseConfig` object

### 1.5 Paste config (Angular)
Edit **`src/environments/firebase-options.ts`** and replace the `firebaseOptions` fields with your project values.

### 1.6 Deploy Security Rules & Indexes
From the **repository root** (same folder as `firebase.json`):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 🚀 Step 2: Deploy (5 minutes)

### Option A — Firebase Hosting (recommended)
From the **repository root**:

```bash
npm run build
firebase deploy
```

Hosting serves **`dist/mathoxx/browser`** (see `firebase.json`).

→ Live at `https://YOUR_PROJECT.web.app`

### Option B — Netlify / static host
After `npm run build`, upload the contents of **`dist/mathoxx/browser`** (not the whole monorepo).

### Option C — Vercel
```bash
npm i -g vercel
vercel --prod
```
Point the build output to `dist/mathoxx/browser` per your Vercel project settings.

---

## 📱 Step 3: PWA (Add to Home Screen)

Icons and `manifest.webmanifest` live under **`public/`** (copied into the build). Users can install from the deployed URL:
- **iPhone**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu (⋮) → Add to Home Screen

---

## 💰 Monetization Options

### Option 1: Freemium (Easiest)
- Free: Easy mode, basic stats
- Pro (₹99/mo): Medium + Hard mode, leaderboard, detailed analytics
- Add **Razorpay** or **Stripe** checkout (2-3 hours work)

### Option 2: B2B Coaching Institutes
- White-label the app with institute branding
- Charge ₹5,000–₹15,000/month per institute
- Contact Allen, Resonance, local coaching centers

### Option 3: One-time purchase
- Sell on **Gumroad** for ₹199–₹499
- Target SSC, UPSC, CAT, Bank PO aspirants on Telegram groups

---

## 🗃️ Firestore Data Schema

### `users/{uid}`
```json
{
  "totalSolved": 142,
  "totalCorrect": 128,
  "totalWrong": 14,
  "bestStreak": 23,
  "xp": 1580,
  "catSolved": { "shopping": 40, "discount": 35, "split": 28, "change": 25 },
  "activeDays": ["2025-01-01", "2025-01-02"],
  "todaySolved": 12,
  "todayDate": "2025-01-15",
  "settings": { "sound": false, "haptic": true, "difficulty": "medium" }
}
```

### `leaderboard/{uid}`
```json
{
  "name": "Rahul S",
  "xp": 1580,
  "uid": "abc123",
  "updatedAt": "<timestamp>"
}
```

---

## 🎮 Feature List

---

## 🧩 Detailed Features & Recommendations

### Implemented Features

1. **Mental Math Practice**
  - Four categories: Shopping (Addition), Discounts (Percentage), Splitting (Division), Change (Subtraction)
  - Three difficulty levels: Easy, Medium, Hard
  - Auto-validate answers on keystroke
  - Shake animation for wrong answers
  - Skip button for questions

2. **Gamification & Progress Tracking**
  - Streak tracking with fire effect for hot streaks
  - XP system with 8 levels and level-up modal (confetti animation)
  - Streak bonus XP
  - Daily goal (default: 20 questions)
  - Progress bar for daily goal
  - Category breakdown stats
  - 28-day activity heatmap

3. **User Accounts & Persistence**
  - Firebase Authentication (Email/Password and Anonymous/Guest)
  - Firestore for user stats, leaderboard, and persistence
  - Global leaderboard (top 10 users by XP)
  - User profile with avatar, display name, and level

4. **PWA & Offline Support**
  - Installable as a Progressive Web App (PWA)
  - Service Worker for offline support (cache-first for assets, network-first for Firebase)
  - Add to Home Screen support (manifest.json with icons)

5. **UI/UX Enhancements**
  - Responsive, mobile-first design
  - Haptic feedback (vibration) for correct/wrong answers
  - Sound effects toggle
  - Share button (Web Share API)
  - Toast notifications and flash feedback

6. **Customization**
  - Change brand name, daily goal, and colors via code
  - Difficulty and sound/haptic settings per user

### Recommended Features & Enhancements

1. **Social & Community**
  - Friend system or direct challenges
  - Social sharing of scores or streaks
  - Weekly/monthly leaderboards

2. **Content Expansion**
  - More math categories (e.g., Multiplication, Fractions, Time/Speed/Distance)
  - Custom question sets or user-generated questions

3. **Personalization**
  - Adaptive difficulty based on user performance
  - Personalized practice recommendations

4. **Notifications**
  - Push notifications for daily reminders or streaks

5. **Accessibility**
  - High-contrast mode
  - Screen reader support

6. **Analytics**
  - Detailed performance analytics (charts, trends)
  - Export stats as CSV or image

7. **Monetization (if desired)**
  - Freemium model (locked features for Pro users)
  - In-app purchases or subscriptions
  - White-label for coaching institutes

8. **Security & Privacy**
  - Enhanced privacy controls for users
  - GDPR/CCPA compliance options

9. **Internationalization**
  - Multi-language support

10. **Other**
   - Dark/light mode toggle
   - In-app feedback or support chat

---

## 🛠️ Customisation (Angular)

### Change brand name
Search & replace in **`src/`** templates and **`src/index.html`** (`<title>`, visible strings).

### Change default daily goal
Edit **`src/app/domain/game-constants.ts`** (`DEFAULT_DAILY_GOAL`) and/or user settings defaults in **`src/app/domain/user-stats.factory.ts`**.

### Add or tune question generators
Edit **`src/app/domain/question-engine.ts`**.

### Change colors
Edit CSS variables in **`src/styles.scss`** (`:root` and `.theme-light`).

---

## 🧑‍💻 Local development

```bash
npm install
npm start
```

Open `http://localhost:4200/`.

```bash
npm test
```

---

## Empty `mathoxx-web` folder

If you still see an empty **`mathoxx-web/`** directory after pulling changes, it is safe to delete it (some tools lock the folder until closed).

---

## 📞 Support
Built with ❤️ for the Indian competitive exam market.
