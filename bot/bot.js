const {
  Client,
  IntentsBitField,
  AttachmentBuilder,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
require("dotenv").config();

const dummy_resultset = [
  {
    guild_id: "1469062651094110446",
    channel_id: "1469062652033765429",
    message_id: "1471300552762724529",
    attachment_id: "1471300553769488497",
  },
  {
    guild_id: "1469062651094110446",
    channel_id: "1469062652033765429",
    message_id: "1471300552762724529",
    attachment_id: "1471300553123303506",
  },
  {
    guild_id: "1469062651094110446",
    channel_id: "1469062652033765429",
    message_id: "1471295872993067185",
    attachment_id: "1471295873907429376",
  },
  /*
  // Should fail
  {
    guild_id: "1111111111111111111",
    channel_id: "1111111111111111111",
    message_id: "1111111111111111111",
    attachment_id: "1111111111111111111",
  },
  {
    guild_id: "1469062651094110446",
    channel_id: "1111111111111111111",
    message_id: "1471295872993067185",
    attachment_id: "1471295873907429376",
  },
  {
    guild_id: "1469062651094110446",
    channel_id: "1469062652033765429",
    message_id: "1111111111111111111",
    attachment_id: "1471295873907429376",
  },
  {
    guild_id: "1469062651094110446",
    channel_id: "1469062652033765429",
    message_id: "1471295872993067185",
    attachment_id: "1111111111111111111",
  },*/
];
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

function get_text_channels(guild_id) {
  return client.channels.cache.filter(
    (chnl) => chnl.type === ChannelType.GuildText && chnl.guildId === guild_id,
  );
}

async function search(query, guild_id) {
  let resultset = dummy_resultset; //FIXME make real ML search over db embeddings

  const linkPromises = resultset.map(async (row) => {
    try {
      const channel = await client.channels.fetch(row.channel_id);
      const message = await channel.messages.fetch(row.message_id);
      const attachment = message.attachments.get(row.attachment_id);

      if (!attachment) {
        console.error(`Failed to fetch attachment: ${JSON.stringify(row)}`);
        return null;
      }
      return { message_url: message.url, attachment_url: attachment.url };
    } catch (err) {
      console.error(`Failed to fetch row: ${JSON.stringify(row)}`);
      return null;
    }
  });

  const links = (await Promise.all(linkPromises)).filter(Boolean);
  // console.log(JSON.stringify(links, null, 2));
  return links;
}

client.on("clientReady", (c) => {
  console.log(`${c.user.tag} is ready.`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "search") return; // Only handle "find"

  const query = interaction.options.get("query")?.value;
  await interaction.deferReply({ flags: "Ephemeral" });
  const results = await search(query, interaction.guildId);
  const files = [];
  let description = "";

  results.forEach((result, index) => {
    description += `[Image ${index + 1} Source](${result.message_url})\n`;
    files.push(new AttachmentBuilder(result.attachment_url));
  });

  if (!description.length) { description = "No matches found."}

  const reply = {
    embeds: [
      new EmbedBuilder()
        .setTitle(`Query: "${query}"`)
        .setDescription(description)
        .setColor(0x0099ff)
        .setTimestamp(),
    ],
    files: files,
  };

  await interaction.editReply(reply);
});

client.login(process.env.BOT_TOKEN);
