const { EmbedBuilder } = require('discord.js');

/**
 * Sends a log embed to the guild's configured log channel, if logging is enabled and a channel is set.
 */
async function sendLog(guild, config, { title, description, color, fields }) {
  if (!config.logging_enabled) return;
  if (!config.log_channel_id) return;

  const channel = guild.channels.cache.get(config.log_channel_id);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color || '#8B0000')
    .setTimestamp();

  if (fields && fields.length) embed.addFields(fields);

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send log embed:', err.message);
  }
}

module.exports = { sendLog };
