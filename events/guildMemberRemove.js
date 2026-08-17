const { saveMemberSnapshot } = require('../database/members');
const { getGuildConfig } = require('../database/config');
const { addHistoryEntry } = require('../database/history');
const { sendLog } = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.id);
    const avatarUrl = member.user.displayAvatarURL({ size: 256 });

    saveMemberSnapshot({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.username,
      nickname: member.nickname,
      roles,
      joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
      leftAt: new Date().toISOString(),
      avatarUrl,
      status: 'left',
    });

    // Premium: keep a full history entry too, so multiple past profiles are preserved
    // (saveMemberSnapshot only keeps the single latest state).
    addHistoryEntry({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.username,
      nickname: member.nickname,
      roles,
      avatarUrl,
      event: 'leave',
    });

    const config = getGuildConfig(member.guild.id);
    await sendLog(member.guild, config, {
      title: 'Member Left',
      description: `${member.user.tag} (\`${member.id}\`) left the server. Snapshot saved for restore.`,
      color: config.embed_color,
    });
  },
};
