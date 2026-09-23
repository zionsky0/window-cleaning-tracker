# 🧼 ClearView — Window Cleaning Customer Tracker

A clean, modern, mobile-first web app designed for window cleaners to manage customer rounds, see who is due next, send 1-tap "On My Way" texts, navigate via Google/Apple Maps, and track completed cleans.

**Every window cleaner just signs in with Google** — the app automatically creates a Google Sheet in their own Drive to store their rounds. Zero configuration.

---

## ✨ Key Features

- 📱 **Mobile-First & PWA Ready** — Big touch targets for outdoor van/truck use. Add to your phone's Home Screen for a native app feel.
- 💬 **1-Tap "On My Way"** — Opens SMS or WhatsApp with a prefilled ETA message (*"Hi Sarah, I'm on my way (about 10-15 mins)!"*).
- 📅 **Smart Queue** — Auto-sorts customers into Overdue, Due Today, This Week tabs.
- ✅ **1-Tap "Mark Done"** — Logs the clean, calculates earnings, schedules next due date.
- 🔐 **Google Sign-In** — Each cleaner signs in with their own Google account. Their data stays in their personal Google Drive.
- 📊 **Google Sheets as Database** — All data lives in a Sheet the app creates automatically in the user's Drive. They can view/edit it anytime.
- 🚀 **Demo Mode** — Try the app instantly without signing in.

---

## 🚀 Quick Start (Local Development)

```bash
npm install
cp .env.example .env.local
# Fill in the Google OAuth credentials (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Google OAuth Setup (One-Time, Free)

You need a Google Cloud OAuth Client ID so users can sign in. This is **free** and takes 2 minutes.

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g. `clearview-app`)

### 2. Enable APIs
1. Go to **APIs & Services > Library**
2. Enable **Google Sheets API**
3. Enable **Google Drive API**

### 3. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. Application type: **Web Application**
4. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for development)
   - `https://your-app.vercel.app` (for production)
5. Add **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-app.vercel.app/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret**

### 4. Set Environment Variables

In `.env.local` (local) or Vercel Project Settings (production):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
NEXTAUTH_SECRET=run-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

> 💡 Generate a secret with: `openssl rand -base64 32`

---

## ☁️ Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo
3. Add the 4 environment variables above (set `NEXTAUTH_URL` to your Vercel domain)
4. **Deploy!** Your app is live with SSL

---

## 📲 Install on Your Phone

### iPhone (Safari):
1. Open your Vercel URL in Safari
2. Tap **Share** → **Add to Home Screen** → **Add**

### Android (Chrome):
1. Open your Vercel URL in Chrome
2. Tap **⋮** → **Install App**

---

## 🛠️ Features

- **"On My Way" Button** — Uses `sms:` and `wa.me` links with URL-encoded messages. Choose ETA chips (5 mins, 10-15, 20-30, or "Just arrived").
- **1-Tap Navigation** — Map icon opens directions in Google/Apple Maps.
- **1-Tap Call** — Phone icon dials the customer.
- **Customer Notes** — Gate codes, dogs, conservatory glass, etc.
- **Pause Rounds** — Switch a customer to "Paused" without deleting them.
- **CSV Export/Import** — Back up and move your data.

---

## 🏗️ Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **NextAuth.js** (Google OAuth)
- **Google Sheets API & Drive API** (via user's own token)
- **Lucide React** (icons)
- **Canvas Confetti** 🎉
