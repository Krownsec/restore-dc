require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { startBackupSchedule } = require('./utils/backup');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // required for join/leave tracking — must be enabled in the Dev Portal too
  ],
  partials: [Partials.GuildMember, Partials.User],
});

// ---- Load commands ----
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// ---- Load events ----
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(process.env.DISCORD_TOKEN);

// ---- Automatic backups ----
startBackupSchedule();

// ---- Keepalive web server (Render expects an open HTTP port) ----
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: client.user ? client.user.tag : 'starting...',
    guilds: client.guilds ? client.guilds.cache.size : 0,
  });
});

app.listen(PORT, () => console.log(`Keepalive server listening on port ${PORT}`));
