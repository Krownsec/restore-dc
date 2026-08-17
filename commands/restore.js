const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getMember, markInServer } = require('../database/members');
const { getGuildConfig } = require('../database/config');
const { addHistoryEntry } = require('../database/history');
const { isBlacklisted } = require('../database/lists');
const { bumpStat } = require('../database/stats');
const { checkAndSetCooldown } = require('../utils/rateLimit');
const { sendLog } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore a member\'s roles and nickname from their last known snapshot.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The member to restore').setRequired(true)
    ),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);

    // Permission check: admin, or holder of the configured restore role
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasRestoreRole = config.restore_role_id && interaction.member.roles.cache.has(config.restore_role_id);
    if (!isAdmin && !hasRestoreRole) {
      return interaction.reply({ content: 'You don\'t have permission to use this command.', ephemeral: true });
    }

    // Anti-abuse rate limit (per-guild configurable cooldown, premium feature — defaults to 5s)
    const cooldown = checkAndSetCooldown(interaction.guild.id, interaction.user.id, (config.restore_cooldown_seconds || 5) * 1000);
    if (!cooldown.allowed) {
      return interaction.reply({
        content: `Slow down — try again in ${Math.ceil(cooldown.remainingMs / 1000)}s.`,
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser('user');

    if (isBlacklisted(interaction.guild.id, targetUser.id)) {
      return interaction.reply({ content: `${targetUser.tag} is blacklisted from restoration.`, ephemeral: true });
    }

    const snapshot = getMember(interaction.guild.id, targetUser.id);

    if (!snapshot) {
      return interaction.reply({ content: `No stored data found for ${targetUser.tag}.`, ephemeral: true });
    }

    await interaction.deferReply();

    let member = interaction.guild.members.cache.get(targetUser.id);
    if (!member) {
      try {
        member = await interaction.guild.members.fetch(targetUser.id);
      } catch {
        return interaction.editReply(`${targetUser.tag} isn't currently in the server. They need to rejoin before roles can be restored.`);
      }
    }

    const results = { rolesRestored: 0, rolesFailed: 0, nicknameRestored: false };

    // Restore roles (skip roles the bot can't assign due to hierarchy, and @everyone)
    const botMember = interaction.guild.members.me;
    for (const roleId of snapshot.roles) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue; // role no longer exists
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

    // Restore nickname
    if (snapshot.nickname && botMember.roles.highest.position > member.roles.highest.position) {
      try {
        await member.setNickname(snapshot.nickname);
        results.nicknameRestored = true;
      } catch {
        // missing permission or hierarchy issue — silently skip, reflected in report below
      }
    }

    markInServer(interaction.guild.id, targetUser.id);
    bumpStat(interaction.guild.id, 'total_restores');
    addHistoryEntry({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      username: targetUser.username,
      nickname: snapshot.nickname,
      roles: snapshot.roles,
      avatarUrl: snapshot.avatar_url,
      event: 'restore',
    });

    const embed = new EmbedBuilder()
      .setTitle('Member Restored')
      .setColor(config.embed_color)
      .setDescription(`Restore complete for ${targetUser}.`)
      .addFields(
        { name: 'Roles Restored', value: `${results.rolesRestored}`, inline: true },
        { name: 'Roles Failed', value: `${results.rolesFailed}`, inline: true },
        { name: 'Nickname Restored', value: results.nicknameRestored ? 'Yes' : 'No', inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await sendLog(interaction.guild, config, {
      title: 'Restore Executed',
      description: `${interaction.user.tag} restored ${targetUser.tag}. Roles: ${results.rolesRestored} restored / ${results.rolesFailed} failed. Nickname: ${results.nicknameRestored ? 'restored' : 'skipped'}.`,
      color: config.embed_color,
    });
  },
};
