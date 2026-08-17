const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStats } = require('../database/stats');
const { getGuildConfig } = require('../database/config');
const db = require('../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show restoration statistics for this server'),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);
    const stats = getStats(interaction.guild.id);

    const memberCounts = db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'in_server' THEN 1 ELSE 0 END) as in_server,
        SUM(CASE WHEN status = 'left' THEN 1 ELSE 0 END) as left_count,
        COUNT(*) as total
      FROM members WHERE guild_id = ?
    `).get(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle('Restoration Statistics')
      .setColor(config.embed_color)
      .addFields(
        { name: 'Manual Restores', value: `${stats.total_restores || 0}`, inline: true },
        { name: 'Auto-Restores', value: `${stats.total_auto_restores || 0}`, inline: true },
        { name: 'Bulk Restore Runs', value: `${stats.total_bulk_restores || 0}`, inline: true },
        { name: 'Tracked Members', value: `${memberCounts.total || 0}`, inline: true },
        { name: 'Currently In Server', value: `${memberCounts.in_server || 0}`, inline: true },
        { name: 'Left (Restorable)', value: `${memberCounts.left_count || 0}`, inline: true },
        { name: 'Last Restore', value: stats.last_restore_at ? `<t:${Math.floor(new Date(stats.last_restore_at).getTime() / 1000)}:R>` : 'Never' },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
