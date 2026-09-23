# 🧼 ClearView - Window Cleaning Customer Tracker & Route App

A clean, modern, mobile-first web app designed for window cleaners to manage customer rounds, see who is due next, send 1-tap "On My Way" texts, navigate directly via Google/Apple Maps, and track completed cleans.

- 📱 **Mobile-First & PWA Ready**: Big touch targets optimized for outdoor van/truck use. Add to your phone's Home Screen for a native app feel.
- 💬 **1-Tap "On My Way" Action**: Automatically opens native Messages (SMS) or WhatsApp with prefilled, personalized ETA messages (*"Hi Sarah, I'm on my way to your house now (about 10-15 mins)!"*).
- 📅 **Smart "Up Next" Queue**: Automatically organizes customers into Overdue, Due Today, This Week, and All Customers.
- ✅ **1-Tap "Mark Done"**: Logs today's clean, computes earnings, and automatically schedules the next due date based on the customer's cycle (e.g., 2, 4, 6, 8, or 12 weeks).
- 📊 **Google Sheets as Database**: All customer records, prices, notes, and clean history can sync directly with a Google Sheet.
- 🚀 **Demo Mode Out-of-the-Box**: Works immediately with realistic starter data even before connecting Google Sheets!

---

## 🚀 Quick Start (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the local server**:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) on your phone or browser.

---

## 📊 Google Sheets Setup (3 Simple Steps)

### Step 1: Create Your Google Sheet
1. Open Google Sheets and create a new spreadsheet named **Window Cleaning**.
2. Rename the first sheet/tab at the bottom to **`Customers`**.
3. In Row 1, add these exact column headers:
   | A | B | C | D | E | F | G | H | I | J | K |
   |---|---|---|---|---|---|---|---|---|---|---|
   | **ID** | **Name** | **Phone** | **Address** | **Price** | **FrequencyWeeks** | **LastCleanedDate** | **NextDueDate** | **Status** | **Notes** | **PreferredContact** |

### Step 2: Create a Google Cloud Service Account
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `window-cleaner-app`).
3. Enable the **Google Sheets API** (APIs & Services > Library > search "Google Sheets API" > Enable).
4. Go to **APIs & Services > Credentials** > **Create Credentials** > **Service Account**.
5. Once created, click on the service account > **Keys** tab > **Add Key** > **Create New Key (JSON)**. Download the JSON file.
6. Copy the service account email (looks like `xyz@project.iam.gserviceaccount.com`).
7. Open your Google Sheet from Step 1, click **Share**, paste the service account email, and set its permission to **Editor**.

### Step 3: Add Environment Variables
In your `.env.local` file (or in your Vercel Project Settings):
```env
GOOGLE_SHEET_ID="your_google_sheet_id_from_url"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
```

> 💡 **Where do I find `GOOGLE_SHEET_ID`?**
> In your Google Sheet URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRczPEf_gkQupR...`**`/edit`

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Under **Environment Variables**, add the 3 variables:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
5. Click **Deploy**! Your app is live with SSL.

---

## 📲 Installing on Your Phone ("Add to Home Screen")

### iPhone (iOS Safari):
1. Open your Vercel app URL in Safari.
2. Tap the **Share** button (box with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will now appear on your home screen with its custom icon and run full-screen without Safari browser bars!

### Android (Google Chrome):
1. Open your Vercel app URL in Chrome.
2. Tap the three dots **(⋮)** in the top right.
3. Tap **Install App** or **Add to Home screen**.

---

## 🛠️ Features Breakdown

- **"On My Way" Button**: Uses standard `sms:` and `wa.me` links with URL-encoded messages. You can choose arrival ETA chips (5 mins, 10-15 mins, 20-30 mins, or "Just arrived").
- **1-Tap Navigation**: Tapping the map icon or address opens directions in Google Maps or Apple Maps.
- **1-Tap Direct Call**: Tapping the phone icon dials the customer immediately.
- **Customer Notes**: Highlights important details like gate codes, aggressive dogs, or delicate conservatory glass.
- **Pause Rounds**: If a customer goes on vacation, switch their status to "Paused" without deleting them.
