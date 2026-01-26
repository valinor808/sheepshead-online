# Deploying Sheepshead Online to Railway

## Prerequisites
1. A GitHub account
2. A Railway account (sign up at https://railway.app - free tier available)

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `sheepshead-online`)

2. Initialize and push the code:
```bash
cd sheepshead-online
git init
git add .
git commit -m "Initial commit - Sheepshead online game"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sheepshead-online.git
git push -u origin main
```

## Step 2: Deploy to Railway

1. Go to https://railway.app and sign in with GitHub

2. Click "New Project"

3. Select "Deploy from GitHub repo"

4. Find and select your `sheepshead-online` repository

5. Railway will automatically detect it's a Node.js app and start deploying

## Step 3: Configure Environment Variables

In the Railway dashboard for your project:

1. Go to the "Variables" tab

2. Add the following variables:
   - `SESSION_SECRET` = (generate a random string, e.g., run `openssl rand -hex 32`)
   - `NODE_ENV` = `production`

3. Railway automatically provides the `PORT` variable

## Step 4: Add Persistent Storage (Important!)

Since SQLite stores data in files, you need persistent storage:

1. In Railway, click "New" → "Database" → "Add Volume"

2. Mount the volume at `/app/data`

3. Update the `DATABASE_PATH` environment variable:
   - `DATABASE_PATH` = `/app/data/sheepshead.db`

## Step 5: Get Your URL

1. Go to "Settings" → "Domains"

2. Click "Generate Domain" to get a free `.railway.app` subdomain

3. Or add your own custom domain

## Step 6: Play!

1. Share the URL with your friends

2. Everyone creates an account

3. One person creates a room with a code (e.g., "friday-night")

4. Others join using that room code

5. Once 5 players are in, click "Start Game"

---

## Local Development

To run locally:

```bash
npm install
npm run dev
```

Then open http://localhost:3000

---

## Game Rules Reference

### Call-an-Ace Partner
- Picker calls a fail ace (Hearts, Spades, or Clubs)
- The player holding that ace is the secret partner
- Partner is revealed when they play the called ace

### Under-Suit Call
- If you have an ace but want to call that suit, you can do an "under" call
- This is allowed because you're the only one who could have that ace

### Schwanzer (Leasters)
- If all 5 players pass, it's a Schwanzer
- Player with the FEWEST points wins (but must take at least one trick)
- Blind points go to whoever takes the last trick
- Winner gets +4, everyone else gets -1

### Scoring
- Normal hand: Picker ±2 (or ±4 if alone), Partner ±1, Defenders ±1
- Schneider (losers < 31 pts): Double the scores
- Schwarz (losers take no tricks): Triple the scores

---

## Troubleshooting

### "Not authenticated" error
- Make sure cookies are enabled
- Try logging out and back in

### Database errors on Railway
- Ensure you've added a volume and set `DATABASE_PATH`
- Check the deployment logs for specific errors

### WebSocket connection fails
- Railway supports WebSockets by default
- If using a proxy/CDN, ensure WebSocket support is enabled
