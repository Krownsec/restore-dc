const { EmbedBuilder } = require('discord.js');
const { saveMemberSnapshot, getMember, markInServer } = require('../database/members');
const { getGuildConfig } = require('../database/config');
const { addHistoryEntry } = require('../database/history');
const { isBlacklisted, isWhitelisted } = require('../database/lists');
const { sendLog } = require('../utils/logger');
const { bumpStat } = require('../database/stats');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const config = getGuildConfig(member.guild.id);

    // Grab the prior snapshot BEFORE we overwrite it with the fresh join data below.
    const priorSnapshot = getMember(member.guild.id, member.id);

    saveMemberSnapshot({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.username,
      nickname: member.nickname,
      roles: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.id),
      joinedAt: member.joinedAt ? member.joinedAt.toISOString() : new Date().toISOString(),
      leftAt: null,
      avatarUrl: member.user.displayAvatarURL({ size: 256 }),
      status: 'in_server',
    });

    addHistoryEntry({
      guildId: member.guild.id,
      userId: member.id,
      username: member.user.username,
      nickname: member.nickname,
      roles: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.id),
      avatarUrl: member.user.displayAvatarURL({ size: 256 }),
      event: 'join',
    });

    await sendLog(member.guild, config, {
      title: 'Member Joined',
      description: `${member.user.tag} (\`${member.id}\`) joined the server.`,
      color: config.embed_color,
    });

    // --- Premium: instant automatic restoration on rejoin ---
    if (!config.auto_restore_enabled) return;
    if (!priorSnapshot || !priorSnapshot.roles || priorSnapshot.roles.length === 0) return;

    if (isBlacklisted(member.guild.id, member.id)) {
      await sendLog(member.guild, config, {
        title: 'Auto-Restore Skipped',
        description: `${member.user.tag} is blacklisted — auto-restore was not applied.`,
        color: config.embed_color,
      });
      return;
    }

    // If a whitelist exists and has entries, only whitelisted users get auto-restored.
    const { listWhitelist } = require('../database/lists');
    const whitelistEntries = listWhitelist(member.guild.id);
    if (whitelistEntries.length > 0 && !isWhitelisted(member.guild.id, member.id)) {
      return;
    }

    const botMember = member.guild.members.me;
    const results = { rolesRestored: 0, rolesFailed: 0, nicknameRestored: false };

    for (const roleId of priorSnapshot.roles) {
      const role = member.guild.roles.cache.get(roleId);
      if (!role) continue;
      if (role.position >= botMember.roles.highest.position) {
        results.rolesFailed++;
        continue;
      }
      try {
        await member.roles.add(role);
        results.rolesRestored++;
      } catch {
        results.rolesFailed++;
      }
    }

    if (priorSnapshot.nickname && botMember.roles.highest.position > member.roles.highest.position) {
      try {
        await member.setNickname(priorSnapshot.nickname);
        results.nicknameRestored = true;
      } catch {
        // hierarchy or permission issue — skip silently, reflected in the log below
      }
    }

    markInServer(member.guild.id, member.id);
    bumpStat(member.guild.id, 'total_auto_restores');

    const embed = new EmbedBuilder()
      .setTitle(config.restore_embed_title || 'Welcome Back')
      .setDescription(config.restore_embed_desc || 'Your roles and nickname have been restored.')
      .setColor(config.embed_color)
      .addFields(
        { name: 'Roles Restored', value: `${results.rolesRestored}`, inline: true },
        { name: 'Roles Failed', value: `${results.rolesFailed}`, inline: true },
      )
      .setTimestamp();

    if (config.restore_channel_id) {
      const channel = member.guild.channels.cache.get(config.restore_channel_id);
      if (channel) await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
    }

    await sendLog(member.guild, config, {
      title: 'Auto-Restore Applied',
      description: `${member.user.tag} was automatically restored on rejoin. Roles: ${results.rolesRestored} restored / ${results.rolesFailed} failed. Nickname: ${results.nicknameRestored ? 'restored' : 'skipped'}.`,
      color: config.embed_color,
    });
  },
};
