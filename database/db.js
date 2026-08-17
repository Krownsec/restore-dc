const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './database/restore.db';

// Make sure the directory for the DB file exists (important on first Render deploy)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    guild_id      TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    username      TEXT,
    nickname      TEXT,
    roles         TEXT,      -- JSON array of role IDs
    joined_at     TEXT,
    left_at       TEXT,
    avatar_url    TEXT,
    status        TEXT DEFAULT 'left', -- 'left' | 'in_server'
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id           TEXT PRIMARY KEY,
    restore_channel_id TEXT,
    log_channel_id     TEXT,
    embed_color        TEXT DEFAULT '#8B0000',
    logging_enabled    INTEGER DEFAULT 1,
    restore_role_id    TEXT   -- role required to use /restore, null = admin only
  );

  CREATE TABLE IF NOT EXISTS restore_cooldowns (
    guild_id     TEXT NOT NULL,
    user_id      TEXT NOT NULL, -- staff member who ran the command
    last_used_at INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );

  -- Every past snapshot for a user, so multiple "previous profiles" are kept, not just the latest.
  CREATE TABLE IF NOT EXISTS member_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    username    TEXT,
    nickname    TEXT,
    roles       TEXT,        -- JSON array of role IDs
    avatar_url  TEXT,
    event       TEXT NOT NULL, -- 'join' | 'leave' | 'restore'
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_history_guild_user ON member_history (guild_id, user_id);

  CREATE TABLE IF NOT EXISTS whitelist (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    reason   TEXT,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS restore_stats (
    guild_id          TEXT PRIMARY KEY,
    total_restores    INTEGER DEFAULT 0,
    total_auto_restores INTEGER DEFAULT 0,
    total_bulk_restores INTEGER DEFAULT 0,
    last_restore_at   TEXT
  );
`);

// --- Lightweight migration: add columns to guild_config for premium features if they don't already exist ---
const guildConfigColumns = db.prepare(`PRAGMA table_info(guild_config)`).all().map(c => c.name);
const migrations = [
  { name: 'auto_restore_enabled', def: `ALTER TABLE guild_config ADD COLUMN auto_restore_enabled INTEGER DEFAULT 0` },
  { name: 'restore_embed_title', def: `ALTER TABLE guild_config ADD COLUMN restore_embed_title TEXT DEFAULT 'Welcome Back'` },
  { name: 'restore_embed_desc', def: `ALTER TABLE guild_config ADD COLUMN restore_embed_desc TEXT DEFAULT 'Your roles and nickname have been restored.'` },
  { name: 'restore_cooldown_seconds', def: `ALTER TABLE guild_config ADD COLUMN restore_cooldown_seconds INTEGER DEFAULT 5` },
];
for (const m of migrations) {
  if (!guildConfigColumns.includes(m.name)) {
    db.exec(m.def);
  }
}

module.exports = db;
