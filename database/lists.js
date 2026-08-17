const db = require('./db');

function addToWhitelist(guildId, userId) {
  db.prepare(`INSERT OR IGNORE INTO whitelist (guild_id, user_id) VALUES (?, ?)`).run(guildId, userId);
}
function removeFromWhitelist(guildId, userId) {
  db.prepare(`DELETE FROM whitelist WHERE guild_id = ? AND user_id = ?`).run(guildId, userId);
}
function isWhitelisted(guildId, userId) {
  return !!db.prepare(`SELECT 1 FROM whitelist WHERE guild_id = ? AND user_id = ?`).get(guildId, userId);
}
function listWhitelist(guildId) {
  return db.prepare(`SELECT user_id FROM whitelist WHERE guild_id = ?`).all(guildId).map(r => r.user_id);
}

function addToBlacklist(guildId, userId, reason) {
  db.prepare(`
    INSERT INTO blacklist (guild_id, user_id, reason) VALUES (?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET reason = excluded.reason
  `).run(guildId, userId, reason || null);
}
function removeFromBlacklist(guildId, userId) {
  db.prepare(`DELETE FROM blacklist WHERE guild_id = ? AND user_id = ?`).run(guildId, userId);
}
function isBlacklisted(guildId, userId) {
  return !!db.prepare(`SELECT 1 FROM blacklist WHERE guild_id = ? AND user_id = ?`).get(guildId, userId);
}
function listBlacklist(guildId) {
  return db.prepare(`SELECT user_id, reason FROM blacklist WHERE guild_id = ?`).all(guildId);
}

module.exports = {
  addToWhitelist, removeFromWhitelist, isWhitelisted, listWhitelist,
  addToBlacklist, removeFromBlacklist, isBlacklisted, listBlacklist,
};
