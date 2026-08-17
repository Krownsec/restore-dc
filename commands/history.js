const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getHistory } = require('../database/history');
const { getGuildConfig } = require('../database/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View past profile snapshots for a member (multiple previous profiles, not just the latest).')
    .addUserOption(opt => opt.setName('user').setDescription('The member to look up').setRequired(true))
    .addIntegerOption(opt => opt.setName('limit').setDescription('How many entries to show (default 5, max 10)').setRequired(false)),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);
    const targetUser = interaction.options.getUser('user');
    const limit = Math.min(interaction.options.getInteger('limit') || 5, 10);

    const entries = getHistory(interaction.guild.id, targetUser.id, limit);

    if (entries.length === 0) {
      return interaction.reply({ content: `No history found for ${targetUser.tag}.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`History: ${targetUser.tag}`)
      .setColor(config.embed_color)
      .setThumbnail(entries[0].avatar_url || null)
      .setTimestamp();

    for (const entry of entries) {
      const ts = `<t:${Math.floor(new Date(entry.created_at).getTime() / 1000)}:f>`;
      const roleCount = entry.roles.length;
      embed.addFields({
        name: `${entry.event.toUpperCase()} — ${ts}`,
        value: `Nickname: ${entry.nickname || 'None'} • Roles stored: ${roleCount}`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
