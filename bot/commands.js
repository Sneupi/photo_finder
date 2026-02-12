require("dotenv").config();
const { REST, Routes, ApplicationCommandType } = require("discord.js");

const commands = [
  {
    name: "search",
    description: "Search images by natural language query",
    options: [
      {
        name: "query",
        description: "Thing to search",
        type: ApplicationCommandType.Message,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

// remove all commands (global)
rest
  .put(Routes.applicationCommands(process.env.BOT_ID), { body: [] })
  .then(() => console.log("Successfully deleted all application commands."))
  .catch(console.error);

// register command list (global)
(async () => {
  try {
    console.log("Registering bot commands...");
    await rest.put(Routes.applicationCommands(process.env.BOT_ID), {
      body: commands,
    });
    console.log("Bot commands registered!");
  } catch (err) {
    console.log(err);
  }
})();
