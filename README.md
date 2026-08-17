# Restore Bot

A member-restoration Discord bot: tracks members on join/leave and can restore their roles and nickname if they're kicked, banned, or leave and rejoin. Built as a personal-use tool (Free-tier feature set only — no payments/premium gating).

## Features

### Free tier
- Automatic member database (join/leave tracked via events, no setup needed)
- `/restore <user>` — restores roles + nickname from the last snapshot
- `/restore-info <user>` — view stored snapshot data for a member
- `/config` — set log channel, embed color, logging toggle, restore-permission role
- `/help`
- Join/leave logging to a configurable channel
- Per-server settings (SQLite, one row per guild)
- Automatic local backups on a cron schedule (default every 6 hours, keeps last 10)
- Basic anti-abuse rate limiting on `/restore` (configurable cooldown per staff member)

### Premium tier (no payment gating — just extra features, on by default)
- **Automatic instant restoration on rejoin** — `/config auto-restore true` re-applies roles/nickname the moment someone rejoins, no command needed
- **Member history** — `/history <user>` shows multiple past profiles (join/leave/restore events), not just the latest snapshot
- **Bulk restore** — `/bulk-restore` restores every stored member currently back in the server in one go (capped at 50/run to respect Discord rate limits)
- **Whitelist/blacklist** — `/lists whitelist-add`, `/lists blacklist-add`, `/lists view` — blacklisted users are skipped by both manual and auto-restore; if a whitelist has any entries, auto-restore only applies to whitelisted users
- **Custom restore messages** — `/config restore-message` to customize the title/description shown when someone is auto-restored; `/config restore-channel` to control where it's posted
- **Configurable cooldown** — `/config cooldown <seconds>` instead of a fixed 5s
- **Restoration statistics** — `/stats` shows manual/auto/bulk restore counts and tracked member totals
- **Backup export/import** — `/backup export` downloads a JSON file of all member snapshots + config; `/backup import` restores from one (useful for migrating servers or manual disaster recovery)
- **Staff-only permissions** — role-gated `/restore` via `/config restore-role`, admin-only for `/bulk-restore`, `/lists`, `/backup`, `/config`

## Setup

### 1. Create the bot application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. Bot tab → Reset Token → copy it (this is `DISCORD_TOKEN`)
3. Under **Privileged Gateway Intents**, enable **Server Members Intent** (required for join/leave tracking)
4. Copy the **Application ID** from the General Information tab (this is `CLIENT_ID`)
5. OAuth2 → URL Generator → scopes: `bot`, `applications.commands`. Bot permissions needed: `Manage Roles`, `Manage Nicknames`, `View Channels`, `Send Messages`, `Embed Links`
6. Use the generated URL to invite the bot to your server

**Important:** the bot's own role must be positioned **above** any roles you want it to restore, or role restoration will silently fail for those roles (Discord's hierarchy rules — this isn't a bug).

### 2. Local setup
```bash
git clone <your-repo-url>
cd restore-bot
npm install
cp .env.example .env
# fill in DISCORD_TOKEN, CLIENT_ID, and DEV_GUILD_ID (your test server ID) in .env
npm run deploy-commands   # registers slash commands
npm start
```

### 3. Deploy to Render
1. Push this repo to GitHub
2. On Render: New → Blueprint → connect the repo (it will read `render.yaml` automatically)
3. Set the secret env vars in the Render dashboard: `DISCORD_TOKEN`, `CLIENT_ID`
4. Leave `DEV_GUILD_ID` blank for a production deploy (global command registration — takes up to ~1hr to propagate) or set it for instant registration to one server
5. Deploy. After the first deploy, run `npm run deploy-commands` once (Render Shell tab, or run it locally against the same bot token) to register the slash commands.

**Note on persistence:** Render's free web service disk is ephemeral on redeploys unless a persistent disk is attached — `render.yaml` above already attaches a 1GB disk mounted at the database directory so your member data and backups survive restarts/redeploys. If you're on Render's free plan and disks aren't available on your plan, back up periodically by downloading the `backups/` directory manually.

## How restoration works

When a member leaves (kicked, banned, or leaves voluntarily), the bot snapshots their roles, nickname, and avatar URL at that moment. If they later rejoin (or a staff member runs `/restore` on them while they're back in the server), the bot re-applies whatever roles/nickname it has on file — provided the bot's role is high enough in the hierarchy to assign them.

This does **not** use OAuth tokens to add users back into the server automatically (that's what RestoreCord-style "verification" links do, and it requires storing live user access tokens — a much bigger security surface). This version restores state for members who are already back in the server, either manually or after they rejoin themselves.

## Project structure
```
restore-bot/
├── commands/          # slash command definitions
│   ├── restore.js, restore-info.js, bulk-restore.js, history.js
│   ├── lists.js, stats.js, backup.js, config.js, help.js
├── events/            # discord.js event listeners (join/leave/interaction/ready)
├── database/          # SQLite schema + query helpers (members, history, config, lists, stats)
├── utils/             # logger, rate limiter, scheduled backup job
├── index.js           # entrypoint + keepalive web server
├── deploy-commands.js # registers slash commands with Discord
└── render.yaml         # Render deployment blueprint
```

## Re-registering commands after this update

Since new slash commands were added (`/bulk-restore`, `/history`, `/lists`, `/stats`, `/backup`) and existing ones gained subcommands (`/config`), you need to run the deploy script again after pulling these changes:

```bash
npm run deploy-commands
```

If `DEV_GUILD_ID` is set, this updates instantly. Otherwise global updates can take up to ~1 hour to show up in Discord.
