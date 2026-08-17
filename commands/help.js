const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle('Restore Bot — Commands')
      .setColor(config.embed_color)
      .addFields(
        { name: '/restore <user>', value: 'Restore a member\'s roles and nickname from their last snapshot.' },
        { name: '/restore-info <user>', value: 'View the stored snapshot data for a member.' },
        { name: '/bulk-restore', value: 'Restore every stored member currently back in the server (mass-raid recovery).' },
        { name: '/history <user>', value: 'View multiple past profile snapshots for a member, not just the latest.' },
        { name: '/lists whitelist-add/remove, blacklist-add/remove, view', value: 'Manage who is eligible/ineligible for restoration.' },
        { name: '/stats', value: 'View restoration statistics for this server.' },
        { name: '/backup export / import', value: 'Export or import server data as a JSON file.' },
        { name: '/config view', value: 'Show current server configuration.' },
        { name: '/config log-channel <channel>', value: 'Set the join/leave/restore log channel.' },
        { name: '/config restore-channel <channel>', value: 'Set where auto-restore welcome-back messages post.' },
        { name: '/config embed-color <hex>', value: 'Set the embed color used across the bot.' },
        { name: '/config logging <enabled>', value: 'Toggle logging on/off.' },
        { name: '/config restore-role <role>', value: 'Allow a role to use /restore (in addition to Admins).' },
        { name: '/config auto-restore <enabled>', value: 'Toggle instant restoration when a member rejoins.' },
        { name: '/config restore-message <title> <description>', value: 'Customize the auto-restore welcome-back embed.' },
        { name: '/config cooldown <seconds>', value: 'Set the per-staff-member cooldown on /restore.' },
        { name: '/help', value: 'Show this message.' },
      )
      .setFooter({ text: 'Members are tracked automatically on join/leave — no setup needed for the database itself.' });

    await interaction.reply({ embeds: [embed] });
  },
};
