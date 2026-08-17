require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
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

// ---- Auto-register slash commands on every boot ----
// This exists so free-tier deployments (no Shell access) don't need `npm run deploy-commands`
// run manually — it happens automatically each time the service starts.
async function registerCommandsOnBoot() {
  try {
    const commandData = [...client.commands.values()].map(c => c.data.toJSON());
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    if (process.env.DEV_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
        { body: commandData },
      );
      console.log(`Auto-registered ${commandData.length} command(s) to guild ${process.env.DEV_GUILD_ID}.`);
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandData },
      );
      console.log(`Auto-registered ${commandData.length} global command(s) (may take up to 1 hour to appear).`);
    }
  } catch (err) {
    console.error('Failed to auto-register slash commands on boot:', err.message);
  }
}

client.once('ready', () => {
  registerCommandsOnBoot();
});

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
