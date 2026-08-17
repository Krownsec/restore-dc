const db = require('./db');

function addHistoryEntry({ guildId, userId, username, nickname, roles, avatarUrl, event }) {
  db.prepare(`
    INSERT INTO member_history (guild_id, user_id, username, nickname, roles, avatar_url, event, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, username || null, nickname || null, JSON.stringify(roles || []), avatarUrl || null, event, new Date().toISOString());
}

/**
 * Returns past snapshots for a user, most recent first. Optionally limited.
 */
function getHistory(guildId, userId, limit = 5) {
  const rows = db.prepare(`
    SELECT * FROM member_history
    WHERE guild_id = ? AND user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(guildId, userId, limit);

  return rows.map(r => ({ ...r, roles: JSON.parse(r.roles || '[]') }));
}

module.exports = { addHistoryEntry, getHistory };
