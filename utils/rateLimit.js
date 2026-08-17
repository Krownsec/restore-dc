const db = require('../database/db');

const DEFAULT_COOLDOWN_MS = 5000; // 5 seconds between restore commands per staff member, if no override is given

/**
 * Returns true if the user is allowed to run a restore command right now.
 * Also updates their last-used timestamp if allowed.
 * cooldownMs is configurable per-guild (premium feature); defaults to 5s.
 */
function checkAndSetCooldown(guildId, userId, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const row = db.prepare(`SELECT last_used_at FROM restore_cooldowns WHERE guild_id = ? AND user_id = ?`)
    .get(guildId, userId);

  const now = Date.now();

  if (row && now - row.last_used_at < cooldownMs) {
    const remainingMs = cooldownMs - (now - row.last_used_at);
    return { allowed: false, remainingMs };
  }

  db.prepare(`
    INSERT INTO restore_cooldowns (guild_id, user_id, last_used_at)
    VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET last_used_at = excluded.last_used_at
  `).run(guildId, userId, now);

  return { allowed: true };
}

module.exports = { checkAndSetCooldown };
