const db = require('./db');

const DEFAULTS = {
  restore_channel_id: null,
  log_channel_id: null,
  embed_color: '#8B0000',
  logging_enabled: 1,
  restore_role_id: null,
  auto_restore_enabled: 0,
  restore_embed_title: 'Welcome Back',
  restore_embed_desc: 'Your roles and nickname have been restored.',
  restore_cooldown_seconds: 5,
};

function getGuildConfig(guildId) {
  let row = db.prepare(`SELECT * FROM guild_config WHERE guild_id = ?`).get(guildId);
  if (!row) {
    db.prepare(`INSERT INTO guild_config (guild_id) VALUES (?)`).run(guildId);
    row = { guild_id: guildId, ...DEFAULTS };
  }
  return row;
}

function updateGuildConfig(guildId, fields) {
  getGuildConfig(guildId); // ensure row exists
  const allowed = [
    'restore_channel_id', 'log_channel_id', 'embed_color', 'logging_enabled', 'restore_role_id',
    'auto_restore_enabled', 'restore_embed_title', 'restore_embed_desc', 'restore_cooldown_seconds',
  ];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) return getGuildConfig(guildId);

  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE guild_config SET ${setClause} WHERE guild_id = @guildId`)
    .run({ guildId, ...fields });

  return getGuildConfig(guildId);
}

module.exports = { getGuildConfig, updateGuildConfig };
