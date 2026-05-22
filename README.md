# ⚽ Five A Side Socials — Player Manager

A web app for managing your weekly five-a-side. Players confirm themselves in with a 4-digit PIN. First 10 confirmed = playing, rest are standby. Dropouts go to the bottom of the priority list next week.

---

## Setup (15 minutes)

### Step 1: Supabase (database — free)

1. Go to [supabase.com](https://supabase.com) and sign up (use GitHub login)
2. Click **New Project** → name it `fives-manager` → set a database password → pick your region → **Create**
3. Wait ~2 mins for it to spin up
4. Go to **SQL Editor** (left sidebar) → **New Query**
5. Paste the entire contents of `supabase-setup.sql` → click **Run**
6. You should see "Success" — your tables and player data are ready
7. Go to **Settings** (gear icon) → **API** and copy:
   - `Project URL` (looks like `https://abc123.supabase.co`)
   - `service_role` key (under "Project API keys" — the **secret** one, not `anon`)

### Step 2: GitHub repo

1. Go to [github.com](https://github.com) → **New Repository** → name it `fives-manager` → **Create**
2. On your machine, in this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fives-manager.git
   git push -u origin main
   ```

### Step 3: Vercel (hosting — free)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project** → import your `fives-manager` repo
3. Under **Environment Variables**, add these three:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
   | `ADMIN_PIN` | A 4-digit PIN for admin access (e.g. `9876`) |

4. Click **Deploy**
5. In ~60 seconds you'll get a URL like `fives-manager.vercel.app` — that's your app!

### Step 4: Share with the group

Drop the URL in the WhatsApp group. Each player:
1. Taps the link
2. Selects their name
3. Sets a 4-digit PIN (one time only)
4. Taps **I'M IN** and enters their PIN each week

---

## Weekly Admin (Kyle)

Every Friday:
1. Open the app → scroll to **Admin**
2. Enter the admin PIN
3. Tap **Start New Week**

That's it. Players who confirmed keep their priority rank. Dropouts go to the bottom.

---

## Features

- **PIN-protected**: Each player sets a 4-digit PIN. No one can confirm as someone else.
- **Auto standby**: First 10 confirmed = playing. Everyone after = standby in rank order.
- **Priority system**: Show up = keep your rank. Drop out = go to the bottom.
- **Mobile-first**: Designed for phone screens (everyone opens it from WhatsApp).
- **Free hosting**: Vercel free tier + Supabase free tier. Zero cost.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Opens at `http://localhost:3000`

---

## Tech Stack

- **Next.js 14** — React framework
- **Supabase** — PostgreSQL database
- **Tailwind CSS** — Styling
- **Vercel** — Hosting
