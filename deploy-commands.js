require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s)...`);

    if (process.env.DEV_GUILD_ID) {
      // Instant registration, scoped to one guild — best for development
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
        { body: commands },
      );
      console.log(`Registered commands to guild ${process.env.DEV_GUILD_ID} (instant).`);
    } else {
      // Global registration — can take up to an hour to propagate
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('Registered global commands (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error(err);
  }
})();
