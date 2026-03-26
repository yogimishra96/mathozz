# 🟠 Mathoxx — Setup & Deployment Guide

## What's Included
```
mathoxx/
├── index.html        ← Full app (single file, all screens)
├── manifest.json     ← PWA manifest
├── sw.js             ← Service worker (offline support)
├── firestore.rules   ← Firestore security rules
└── README.md         ← This file
```

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
2. Click **</>** (Web) → Register app as `mathoxx-web`
3. Copy the `firebaseConfig` object

### 1.5 Paste Config into index.html
Find this section in `index.html` and replace:
```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",          // ← replace
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

### 1.6 Deploy Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

---

## 🚀 Step 2: Deploy (5 minutes)

### Option A — Firebase Hosting (Recommended, Free)
```bash
firebase init hosting
# Public directory: . (current folder)
# Single-page app: Yes
# Overwrite index.html: No
firebase deploy
```
→ Live at `https://YOUR_PROJECT.web.app`

### Option B — Netlify (Drag & Drop)
1. Go to **https://netlify.com**
2. Drag the `mathoxx/` folder onto the Netlify dashboard
3. Done! Custom domain available for free

### Option C — Vercel
```bash
npm i -g vercel
vercel --prod
```

---

## 📱 Step 3: Make it a PWA (Add to Home Screen)

Users can install Mathoxx as a native-feeling app:
- **iPhone**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu (⋮) → Add to Home Screen

To generate proper icons (192px & 512px), use:
- https://realfavicongenerator.net
- Or Figma/Canva with the Mathoxx logo

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

| Feature | Status |
|---|---|
| 4 math categories | ✅ |
| 3 difficulty levels (Easy/Medium/Hard) | ✅ |
| Auto-validate on keystroke | ✅ |
| Shake animation on wrong answer | ✅ |
| Streak tracking + fire effect | ✅ |
| XP + 8 Level system | ✅ |
| Daily goal (20 questions) | ✅ |
| Firebase Auth (Email + Guest) | ✅ |
| Firestore persistence | ✅ |
| Global Leaderboard | ✅ |
| Category breakdown stats | ✅ |
| 28-day activity heatmap | ✅ |
| Level-up modal + confetti | ✅ |
| Streak bonus XP | ✅ |
| Skip button | ✅ |
| PWA (installable) | ✅ |
| Offline support via SW | ✅ |
| Haptic feedback | ✅ |
| Share button | ✅ |

---

## 🛠️ Customisation

### Change brand name
Search & replace `Mathoxx` → your brand name in `index.html`

### Change daily goal
```js
const DAILY_GOAL = 20; // line ~205 in index.html
```

### Add new difficulty ranges
Edit the `genShopping()`, `genDiscount()` etc. functions in the JS section.

### Change colors
Edit CSS variables at top of `<style>` tag:
```css
--accent: #FF6B35;   /* main orange */
--green:  #4ADE80;   /* success */
--red:    #F87171;   /* error */
```

---

## 📞 Support
Built with ❤️ for the Indian competitive exam market.
