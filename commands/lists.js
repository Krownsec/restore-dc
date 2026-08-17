const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const {
  addToWhitelist, removeFromWhitelist, listWhitelist,
  addToBlacklist, removeFromBlacklist, listBlacklist,
} = require('../database/lists');
const { getGuildConfig } = require('../database/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lists')
    .setDescription('Manage the restore whitelist and blacklist for this server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('whitelist-add').setDescription('Add a user to the auto-restore whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to whitelist').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('whitelist-remove').setDescription('Remove a user from the whitelist')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('blacklist-add').setDescription('Blacklist a user from all restoration')
        .addUserOption(opt => opt.setName('user').setDescription('User to blacklist').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason (optional)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('blacklist-remove').setDescription('Remove a user from the blacklist')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view').setDescription('View the current whitelist and blacklist')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const config = getGuildConfig(guildId);

    if (sub === 'whitelist-add') {
      const user = interaction.options.getUser('user');
      addToWhitelist(guildId, user.id);
      return interaction.reply({ content: `${user.tag} added to the whitelist. Note: once a whitelist has any members, auto-restore only applies to whitelisted users.`, ephemeral: true });
    }

    if (sub === 'whitelist-remove') {
      const user = interaction.options.getUser('user');
      removeFromWhitelist(guildId, user.id);
      return interaction.reply({ content: `${user.tag} removed from the whitelist.`, ephemeral: true });
    }

    if (sub === 'blacklist-add') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      addToBlacklist(guildId, user.id, reason);
      return interaction.reply({ content: `${user.tag} blacklisted from restoration${reason ? ` (reason: ${reason})` : ''}.`, ephemeral: true });
    }

    if (sub === 'blacklist-remove') {
      const user = interaction.options.getUser('user');
      removeFromBlacklist(guildId, user.id);
      return interaction.reply({ content: `${user.tag} removed from the blacklist.`, ephemeral: true });
    }

    if (sub === 'view') {
      const whitelist = listWhitelist(guildId);
      const blacklist = listBlacklist(guildId);

      const embed = new EmbedBuilder()
        .setTitle('Restore Lists')
        .setColor(config.embed_color)
        .addFields(
          {
            name: `Whitelist (${whitelist.length})`,
            value: whitelist.length ? whitelist.map(id => `<@${id}>`).join(', ').slice(0, 1024) : 'Empty — auto-restore applies to everyone with a snapshot',
          },
          {
            name: `Blacklist (${blacklist.length})`,
            value: blacklist.length
              ? blacklist.map(b => `<@${b.user_id}>${b.reason ? ` — ${b.reason}` : ''}`).join('\n').slice(0, 1024)
              : 'Empty',
          },
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
