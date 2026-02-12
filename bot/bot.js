const {
  Client,
  IntentsBitField,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
require("dotenv").config();

// Save vector embeddings & locations (msg link) of images in db.
// On search, for top K embeddings matching query, find image location.
// If still exists, get image and add to reply, else remove from db (deleted photo).
//
// msg url: https://discord.com/channels/${guild_id}/${channel_id}/${message_id}
// img url: https://cdn.discordapp.com/attachments/${channel_id}/${attachment_id}/${filename}?*

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

function search(query, guild_id) {
  let resultset = dummy_resultset; //FIXME make real ML search over db embeddings

  let links = [];
  for (let row of resultset) {
    console.log(JSON.stringify(client.channels)); //FIMXE this is brokey
    client.channels
      .fetch(row.channel_id)
      .then((channel) => {
        channel.messages
          .fetch(row.message_id)
          .then((message) => {
            const attachment = message.attachments.get(row.attachment_id);
            if (attachment) {
              links.push({
                message_url: message.url,
                attachment_url: attachment.url,
              });
            } else {
              console.error(
                `Failed to fetch attachment: ${JSON.stringify(row)}`,
              );
            }
          })
          .catch((err) =>
            console.error(`Failed to fetch message: ${JSON.stringify(row)}`),
          );
      })
      .catch((err) =>
        console.error(`Failed to fetch channel: ${JSON.stringify(row)}`),
      );
  }

  return links;
}

client.on("clientReady", (c) => {
  console.log(`${c.user.tag} is ready.`);
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "search") return; // Only handle "find"

  const query = interaction.options.get("query")?.value;
  const results = search(query, interaction.guildId);
  const files = [];
  let description = "\n";

  results.forEach((result, index) => {
    description += `[Image ${index + 1} Source](${result.message_url})\n`;
    files.push(new AttachmentBuilder(result.attachment_url));
  });

  const reply = {
    flags: "Ephemeral",
    embeds: [
      new EmbedBuilder()
        .setTitle(`Query: "${query}"`)
        .setDescription(description)
        .setColor(0x0099ff)
        .setTimestamp(),
    ],
    files: files,
  };

  interaction.reply(reply);
});

client.login(process.env.BOT_TOKEN);
