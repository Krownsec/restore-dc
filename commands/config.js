const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../database/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or change this server\'s restore bot settings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('view').setDescription('Show the current configuration')
    )
    .addSubcommand(sub =>
      sub.setName('log-channel')
        .setDescription('Set the channel where join/leave/restore logs are sent')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Log channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('embed-color')
        .setDescription('Set the hex color used for bot embeds')
        .addStringOption(opt =>
          opt.setName('hex').setDescription('Hex color, e.g. #8B0000').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logging')
        .setDescription('Enable or disable logging')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Turn logging on or off').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('restore-role')
        .setDescription('Set which role (besides Administrators) can use /restore')
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role allowed to restore members').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('restore-channel')
        .setDescription('Set the channel where auto-restore welcome-back messages are posted')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Restore announcement channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('auto-restore')
        .setDescription('Toggle instant automatic restoration when a member rejoins')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Turn auto-restore on or off').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('restore-message')
        .setDescription('Customize the title/description shown on auto-restore')
        .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(false))
        .addStringOption(opt => opt.setName('description').setDescription('Embed description').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('cooldown')
        .setDescription('Set the cooldown (in seconds) between /restore uses per staff member')
        .addIntegerOption(opt =>
          opt.setName('seconds').setDescription('Cooldown in seconds (1-300)').setMinValue(1).setMaxValue(300).setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'view') {
      const config = getGuildConfig(guildId);
      const embed = new EmbedBuilder()
        .setTitle('Current Configuration')
        .setColor(config.embed_color)
        .addFields(
          { name: 'Log Channel', value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'Not set' },
          { name: 'Logging Enabled', value: config.logging_enabled ? 'Yes' : 'No' },
          { name: 'Embed Color', value: config.embed_color },
          { name: 'Restore Role', value: config.restore_role_id ? `<@&${config.restore_role_id}>` : 'Admins only' },
          { name: 'Restore Channel', value: config.restore_channel_id ? `<#${config.restore_channel_id}>` : 'Not set' },
          { name: 'Auto-Restore', value: config.auto_restore_enabled ? 'Enabled' : 'Disabled' },
          { name: 'Restore Message Title', value: config.restore_embed_title || 'Welcome Back' },
          { name: 'Restore Cooldown', value: `${config.restore_cooldown_seconds || 5}s` },
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'log-channel') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, { log_channel_id: channel.id });
      return interaction.reply({ content: `Log channel set to ${channel}.`, ephemeral: true });
    }

    if (sub === 'embed-color') {
      const hex = interaction.options.getString('hex');
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        return interaction.reply({ content: 'Invalid hex color. Use a format like `#8B0000`.', ephemeral: true });
      }
      updateGuildConfig(guildId, { embed_color: hex });
      return interaction.reply({ content: `Embed color set to \`${hex}\`.`, ephemeral: true });
    }

    if (sub === 'logging') {
      const enabled = interaction.options.getBoolean('enabled');
      updateGuildConfig(guildId, { logging_enabled: enabled ? 1 : 0 });
      return interaction.reply({ content: `Logging ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }

    if (sub === 'restore-role') {
      const role = interaction.options.getRole('role');
      updateGuildConfig(guildId, { restore_role_id: role.id });
      return interaction.reply({ content: `${role} can now use /restore.`, ephemeral: true });
    }

    if (sub === 'restore-channel') {
      const channel = interaction.options.getChannel('channel');
      updateGuildConfig(guildId, { restore_channel_id: channel.id });
      return interaction.reply({ content: `Restore announcement channel set to ${channel}.`, ephemeral: true });
    }

    if (sub === 'auto-restore') {
      const enabled = interaction.options.getBoolean('enabled');
      updateGuildConfig(guildId, { auto_restore_enabled: enabled ? 1 : 0 });
      return interaction.reply({
        content: `Auto-restore ${enabled ? 'enabled' : 'disabled'}.${enabled ? ' Members with a stored snapshot will now be restored instantly when they rejoin.' : ''}`,
        ephemeral: true,
      });
    }

    if (sub === 'restore-message') {
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      if (!title && !description) {
        return interaction.reply({ content: 'Provide at least a title or a description to update.', ephemeral: true });
      }
      const fields = {};
      if (title) fields.restore_embed_title = title;
      if (description) fields.restore_embed_desc = description;
      updateGuildConfig(guildId, fields);
      return interaction.reply({ content: 'Auto-restore message updated.', ephemeral: true });
    }

    if (sub === 'cooldown') {
      const seconds = interaction.options.getInteger('seconds');
      updateGuildConfig(guildId, { restore_cooldown_seconds: seconds });
      return interaction.reply({ content: `Restore cooldown set to ${seconds}s.`, ephemeral: true });
    }
  },
};
