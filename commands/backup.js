const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const db = require('../database/db');
const { getGuildConfig, updateGuildConfig } = require('../database/config');
const { saveMemberSnapshot } = require('../database/members');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Export or import this server\'s restore data as a JSON file.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('export').setDescription('Export member snapshots + config as a downloadable JSON file')
    )
    .addSubcommand(sub =>
      sub.setName('import').setDescription('Import a previously exported JSON backup (merges into current data)')
        .addAttachmentOption(opt => opt.setName('file').setDescription('The .json backup file').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'export') {
      await interaction.deferReply({ ephemeral: true });

      const members = db.prepare(`SELECT * FROM members WHERE guild_id = ?`).all(guildId);
      const config = getGuildConfig(guildId);

      const payload = {
        exportedAt: new Date().toISOString(),
        guildId,
        config,
        members,
      };

      const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `restore-backup-${guildId}.json` });

      return interaction.editReply({ content: 'Backup exported.', files: [attachment] });
    }

    if (sub === 'import') {
      await interaction.deferReply({ ephemeral: true });

      const file = interaction.options.getAttachment('file');
      if (!file.name.endsWith('.json')) {
        return interaction.editReply('Please upload a `.json` backup file.');
      }

      let data;
      try {
        const res = await fetch(file.url);
        data = await res.json();
      } catch {
        return interaction.editReply('Could not read that file — make sure it\'s a valid JSON backup.');
      }

      if (!data.members || !Array.isArray(data.members)) {
        return interaction.editReply('That file doesn\'t look like a valid restore-bot backup.');
      }

      let imported = 0;
      for (const m of data.members) {
        saveMemberSnapshot({
          guildId, // always import into the CURRENT guild, never trust the file's guildId
          userId: m.user_id,
          username: m.username,
          nickname: m.nickname,
          roles: JSON.parse(m.roles || '[]'),
          joinedAt: m.joined_at,
          leftAt: m.left_at,
          avatarUrl: m.avatar_url,
          status: m.status,
        });
        imported++;
      }

      if (data.config) {
        const { restore_channel_id, log_channel_id, embed_color, logging_enabled, restore_role_id } = data.config;
        updateGuildConfig(guildId, { restore_channel_id, log_channel_id, embed_color, logging_enabled, restore_role_id });
      }

      return interaction.editReply(`Imported ${imported} member snapshot(s) into this server.`);
    }
  },
};
