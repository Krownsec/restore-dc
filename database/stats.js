const db = require('./db');

function ensureRow(guildId) {
  db.prepare(`INSERT OR IGNORE INTO restore_stats (guild_id) VALUES (?)`).run(guildId);
}

/**
 * Increments a stats counter for a guild. field must be one of the known columns.
 */
function bumpStat(guildId, field) {
  const allowed = ['total_restores', 'total_auto_restores', 'total_bulk_restores'];
  if (!allowed.includes(field)) return;

  ensureRow(guildId);
  db.prepare(`
    UPDATE restore_stats
    SET ${field} = ${field} + 1, last_restore_at = ?
    WHERE guild_id = ?
  `).run(new Date().toISOString(), guildId);
}

function getStats(guildId) {
  ensureRow(guildId);
  return db.prepare(`SELECT * FROM restore_stats WHERE guild_id = ?`).get(guildId);
}

module.exports = { bumpStat, getStats };
