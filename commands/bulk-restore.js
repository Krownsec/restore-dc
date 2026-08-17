const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getAllLeftMembers, markInServer } = require('../database/members');
const { getGuildConfig } = require('../database/config');
const { addHistoryEntry } = require('../database/history');
const { isBlacklisted } = require('../database/lists');
const { bumpStat } = require('../database/stats');
const { sendLog } = require('../utils/logger');

const MAX_BULK_TARGETS = 50; // hard cap so a runaway command can't hammer the API for thousands of members

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bulk-restore')
    .setDescription('Restore roles/nicknames for every stored member currently back in the server (mass-raid recovery).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);

    await interaction.deferReply();

    const stored = getAllLeftMembers(interaction.guild.id);
    if (stored.length === 0) {
      return interaction.editReply('No stored "left" members to restore.');
    }

    const botMember = interaction.guild.members.me;
    let restoredCount = 0;
    let skippedNotInServer = 0;
    let skippedBlacklisted = 0;
    let processed = 0;

    for (const snapshot of stored) {
      if (processed >= MAX_BULK_TARGETS) break;

      if (isBlacklisted(interaction.guild.id, snapshot.user_id)) {
        skippedBlacklisted++;
        continue;
      }

      let member;
      try {
        member = await interaction.guild.members.fetch(snapshot.user_id);
      } catch {
        skippedNotInServer++;
        continue;
      }

      processed++;

      for (const roleId of snapshot.roles) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role || role.position >= botMember.roles.highest.position) continue;
        await member.roles.add(role).catch(() => {});
      }

      if (snapshot.nickname && botMember.roles.highest.position > member.roles.highest.position) {
        await member.setNickname(snapshot.nickname).catch(() => {});
      }

      markInServer(interaction.guild.id, snapshot.user_id);
      addHistoryEntry({
        guildId: interaction.guild.id,
        userId: snapshot.user_id,
        username: snapshot.username,
        nickname: snapshot.nickname,
        roles: snapshot.roles,
        avatarUrl: snapshot.avatar_url,
        event: 'restore',
      });
      restoredCount++;
    }

    if (restoredCount > 0) bumpStat(interaction.guild.id, 'total_bulk_restores');

    const embed = new EmbedBuilder()
      .setTitle('Bulk Restore Complete')
      .setColor(config.embed_color)
      .addFields(
        { name: 'Restored', value: `${restoredCount}`, inline: true },
        { name: 'Not In Server', value: `${skippedNotInServer}`, inline: true },
        { name: 'Blacklisted (Skipped)', value: `${skippedBlacklisted}`, inline: true },
      )
      .setFooter({ text: `Processed up to ${MAX_BULK_TARGETS} members per run to stay within rate limits.` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    await sendLog(interaction.guild, config, {
      title: 'Bulk Restore Executed',
      description: `${interaction.user.tag} ran a bulk restore. Restored: ${restoredCount}, not in server: ${skippedNotInServer}, blacklisted: ${skippedBlacklisted}.`,
      color: config.embed_color,
    });
  },
};
