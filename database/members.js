const db = require('./db');

/**
 * Upsert a member snapshot. Called on join (status=in_server) and on leave (status=left).
 */
function saveMemberSnapshot({ guildId, userId, username, nickname, roles, joinedAt, leftAt, avatarUrl, status }) {
  const stmt = db.prepare(`
    INSERT INTO members (guild_id, user_id, username, nickname, roles, joined_at, left_at, avatar_url, status)
    VALUES (@guildId, @userId, @username, @nickname, @roles, @joinedAt, @leftAt, @avatarUrl, @status)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      username   = excluded.username,
      nickname   = COALESCE(excluded.nickname, members.nickname),
      roles      = excluded.roles,
      joined_at  = COALESCE(excluded.joined_at, members.joined_at),
      left_at    = excluded.left_at,
      avatar_url = excluded.avatar_url,
      status     = excluded.status
  `);

  stmt.run({
    guildId,
    userId,
    username: username || null,
    nickname: nickname || null,
    roles: JSON.stringify(roles || []),
    joinedAt: joinedAt || null,
    leftAt: leftAt || null,
    avatarUrl: avatarUrl || null,
    status: status || 'left',
  });
}

function getMember(guildId, userId) {
  const row = db.prepare(`SELECT * FROM members WHERE guild_id = ? AND user_id = ?`).get(guildId, userId);
  if (!row) return null;
  return { ...row, roles: JSON.parse(row.roles || '[]') };
}

function markInServer(guildId, userId) {
  db.prepare(`UPDATE members SET status = 'in_server', left_at = NULL WHERE guild_id = ? AND user_id = ?`)
    .run(guildId, userId);
}

function getAllLeftMembers(guildId) {
  const rows = db.prepare(`SELECT * FROM members WHERE guild_id = ? AND status = 'left'`).all(guildId);
  return rows.map(r => ({ ...r, roles: JSON.parse(r.roles || '[]') }));
}

module.exports = {
  saveMemberSnapshot,
  getMember,
  markInServer,
  getAllLeftMembers,
};
