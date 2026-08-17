const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getMember } = require('../database/members');
const { getGuildConfig } = require('../database/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore-info')
    .setDescription('Show the stored snapshot data for a member.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The member to look up').setRequired(true)
    ),

  async execute(interaction) {
    const config = getGuildConfig(interaction.guild.id);
    const targetUser = interaction.options.getUser('user');
    const snapshot = getMember(interaction.guild.id, targetUser.id);

    if (!snapshot) {
      return interaction.reply({ content: `No stored data found for ${targetUser.tag}.`, ephemeral: true });
    }

    const roleMentions = snapshot.roles.length
      ? snapshot.roles.map(id => `<@&${id}>`).join(', ')
      : 'None stored';

    const embed = new EmbedBuilder()
      .setTitle(`Snapshot: ${targetUser.tag}`)
      .setColor(config.embed_color)
      .setThumbnail(snapshot.avatar_url || null)
      .addFields(
        { name: 'Status', value: snapshot.status === 'in_server' ? 'Currently in server' : 'Left server', inline: true },
        { name: 'Nickname', value: snapshot.nickname || 'None stored', inline: true },
        { name: 'Joined At', value: snapshot.joined_at ? `<t:${Math.floor(new Date(snapshot.joined_at).getTime() / 1000)}:f>` : 'Unknown', inline: true },
        { name: 'Left At', value: snapshot.left_at ? `<t:${Math.floor(new Date(snapshot.left_at).getTime() / 1000)}:f>` : 'N/A', inline: true },
        { name: `Roles (${snapshot.roles.length})`, value: roleMentions.slice(0, 1024) },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
